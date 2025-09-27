import os
import secrets
import bcrypt
from datetime import datetime, timedelta

from fastapi import UploadFile
from fastapi.responses import JSONResponse

from SSY.ssyDBManager import SsyDBManager
from SSY.ssyFileNameGenerator import SsyFileNameGenerator
from SSY import config
from SSY.emailer import send_mail, verification_html, otp_html


class UsersDAO:
    def __init__(self):
        self.psaFolder = "./psa"
        os.makedirs(self.psaFolder, exist_ok=True)
        self.jwtKey = "dkanrjsk"
        self.jwtAlgorithm = "HS256"
        self.db = SsyDBManager()
        self.TOKEN_EXPIRE_HOURS = 24

        # 스키마/테이블 캐시
        self._schema = None
        self._users_pk_cache = None
        self.T_USERS = "USERS"
        self.T_EMAIL_TOKENS = "EMAIL_TOKENS"
        self.T_LOCATIONS = "LOCATIONS"

    # === 커넥션 공통 ===
    def _makeConCur(self):
        return SsyDBManager.makeConCur()

    def _closeConCur(self, con, cur):
        SsyDBManager.closeConCur(con, cur)

    # === 스키마/테이블 완전수식 준비 ===
    def _ensure_schema_and_tables(self, cur):
        if self._schema is None:
            # 1) config에 DB_SCHEMA 있으면 사용, 없으면 현재 세션 스키마
            cfg_schema = getattr(config, "DB_SCHEMA", None)
            if cfg_schema:
                self._schema = cfg_schema.upper()
            else:
                cur.execute("SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM dual")
                self._schema = (cur.fetchone()[0] or "").upper()

            # 모든 테이블을 소유자 접두사로 완전수식
            if self._schema:
                self.T_USERS = f"{self._schema}.USERS"
                self.T_EMAIL_TOKENS = f"{self._schema}.EMAIL_TOKENS"
                self.T_LOCATIONS = f"{self._schema}.LOCATIONS"

    # === USERS PK 컬럼 자동탐지 (ALL_* 뷰, OWNER 필터) ===
    def _users_pk_col(self, cur) -> str:
        if self._users_pk_cache:
            return self._users_pk_cache

        self._ensure_schema_and_tables(cur)
        owner = self._schema

        # PK 제약에서 탐지
        cur.execute(
            """
            SELECT cols.column_name
              FROM all_constraints cons
              JOIN all_cons_columns cols
                ON cons.owner = cols.owner
               AND cons.constraint_name = cols.constraint_name
               AND cons.table_name = cols.table_name
             WHERE cons.constraint_type = 'P'
               AND cons.table_name = 'USERS'
               AND cons.owner = :P_OWNER
            """,
            {"P_OWNER": owner},
        )
        r = cur.fetchone()
        if r and r[0]:
            self._users_pk_cache = r[0]
            return self._users_pk_cache

        # 폴백: 흔한 PK 이름
        cur.execute(
            """
            SELECT column_name
              FROM all_tab_columns
             WHERE owner = :P_OWNER
               AND table_name = 'USERS'
               AND column_name IN ('ID','USER_ID','USERS_ID')
            """,
            {"P_OWNER": owner},
        )
        r = cur.fetchone()
        self._users_pk_cache = r[0] if r else "ID"
        return self._users_pk_cache

    # === OTP 유틸 ===
    def _gen_otp(self) -> str:
        return str(secrets.randbelow(1_000_000)).zfill(6)

    def _issue_otp(self, cur, user_id: int, minutes: int = 3) -> str:
        code = self._gen_otp()

        # 이전 미사용 OTP 무효화
        cur.execute(
            f"""
            UPDATE {self.T_EMAIL_TOKENS}
               SET USED_AT = SYSDATE
             WHERE USER_ID = :P_USER_ID
               AND PURPOSE = 'OTP'
               AND USED_AT IS NULL
            """,
            {"P_USER_ID": user_id},
        )

        expires_at = datetime.now() + timedelta(minutes=minutes)

        # 새 OTP 발급
        cur.execute(
            f"""
            INSERT INTO {self.T_EMAIL_TOKENS} (USER_ID, TOKEN, PURPOSE, EXPIRES_AT)
            VALUES (:P_USER_ID, :P_TOKEN, 'OTP', :P_EXPIRES_AT)
            """,
            {"P_USER_ID": user_id, "P_TOKEN": code, "P_EXPIRES_AT": expires_at},
        )
        return code

    # === OTP: 전송 ===
    def send_otp(self, email: str) -> JSONResponse:
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = self._makeConCur()
            self._ensure_schema_and_tables(cur)
            pk = self._users_pk_col(cur)

            # 이메일 존재/상태
            cur.execute(
                f"""
                SELECT {pk}, IS_VERIFIED
                  FROM {self.T_USERS}
                 WHERE LOWER(EMAIL) = LOWER(:P_EMAIL)
                """,
                {"P_EMAIL": email},
            )
            row = cur.fetchone()

            if row:
                uid, isv = int(row[0]), int(row[1] or 0)
                if isv == 1:
                    return JSONResponse({"result": "이미 인증된 계정입니다."}, headers=h)
            else:
                # 임시 사용자 생성 (RETURNING으로 PK 획득)
                id_out = cur.var(int)
                cur.execute(
                    f"""
                    INSERT INTO {self.T_USERS} (EMAIL, IS_VERIFIED)
                    VALUES (:P_EMAIL, 0)
                    RETURNING {pk} INTO :P_ID_OUT
                    """,
                    {"P_EMAIL": email, "P_ID_OUT": id_out},
                )
                uid = int(id_out.getvalue()[0])

            code = self._issue_otp(cur, uid, minutes=3)
            con.commit()

            send_mail(email, "[TRADESITE] 회원가입 인증번호", otp_html(code))
            return JSONResponse({"result": "인증번호를 전송했습니다."}, headers=h)

        except Exception as e:
            if con:
                con.rollback()
            print("send_otp error:", e)
            return JSONResponse({"result": "전송 실패"}, status_code=500, headers=h)
        finally:
            self._closeConCur(con, cur)

    # === OTP: 검증 ===
    def verify_otp(self, email: str, code: str) -> JSONResponse:
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = self._makeConCur()
            self._ensure_schema_and_tables(cur)
            pk = self._users_pk_col(cur)

            cur.execute(
                f"""
                SELECT {pk}, IS_VERIFIED
                  FROM {self.T_USERS}
                 WHERE LOWER(EMAIL) = LOWER(:P_EMAIL)
                """,
                {"P_EMAIL": email},
            )
            u = cur.fetchone()
            if not u:
                return JSONResponse({"result": "존재하지 않는 이메일"}, status_code=400, headers=h)

            uid, isv = int(u[0]), int(u[1] or 0)
            if isv == 1:
                return JSONResponse({"result": "이미 인증된 계정"}, headers=h)

            cur.execute(
                f"""
                SELECT 1
                  FROM {self.T_EMAIL_TOKENS}
                 WHERE USER_ID = :P_USER_ID
                   AND PURPOSE = 'OTP'
                   AND USED_AT IS NULL
                   AND EXPIRES_AT > SYSDATE
                   AND TOKEN = :P_TOKEN
                """,
                {"P_USER_ID": uid, "P_TOKEN": code},
            )
            ok = cur.fetchone() is not None
            if not ok:
                return JSONResponse({"result": "코드가 유효하지 않거나 만료됨"}, status_code=400, headers=h)

            # 사용 처리 + 유저 인증
            cur.execute(
                f"""
                UPDATE {self.T_EMAIL_TOKENS}
                   SET USED_AT = SYSDATE
                 WHERE USER_ID = :P_USER_ID
                   AND PURPOSE = 'OTP'
                   AND TOKEN = :P_TOKEN
                """,
                {"P_USER_ID": uid, "P_TOKEN": code},
            )
            cur.execute(
                f"""
                UPDATE {self.T_USERS}
                   SET IS_VERIFIED = 1,
                       EMAIL_VERIFIED_AT = SYSDATE
                 WHERE {pk} = :P_USER_ID
                """,
                {"P_USER_ID": uid},
            )

            con.commit()
            return JSONResponse({"result": "이메일 인증 완료"}, headers=h)

        except Exception as e:
            if con:
                con.rollback()
            print("verify_otp error:", e)
            return JSONResponse({"result": "인증 실패"}, status_code=500, headers=h)
        finally:
            self._closeConCur(con, cur)

    # === (참고) 링크 방식 메서드들 — 현재 OTP 플로우 미사용 ===
    def _issue_email_token(self, cur, user_id: int, hours: int = 24) -> str:
        token = secrets.token_urlsafe(32)
        self._ensure_schema_and_tables(cur)
        cur.execute(
            f"""
            UPDATE {self.T_EMAIL_TOKENS}
               SET USED_AT = SYSDATE
             WHERE USER_ID = :P_USER_ID
               AND PURPOSE = 'VERIFY'
               AND USED_AT IS NULL
            """,
            {"P_USER_ID": user_id},
        )
        expires_at = datetime.now() + timedelta(hours=hours)
        cur.execute(
            f"""
            INSERT INTO {self.T_EMAIL_TOKENS} (USER_ID, TOKEN, PURPOSE, EXPIRES_AT)
            VALUES (:P_USER_ID, :P_TOKEN, 'VERIFY', :P_EXPIRES_AT)
            """,
            {"P_USER_ID": user_id, "P_TOKEN": token, "P_EXPIRES_AT": expires_at},
        )
        return token

    # === 회원가입 (OTP 인증 선행) ===
    async def signUp(
        self,
        username: str,
        email: str,
        phone_number: str,
        password: str,
        psa: UploadFile,
        si_do: str,
        si_gun_gu: str,
        dong: str,
        detail_address:str, 
    ):
        """
        - 존재 X : 404 (먼저 /users/auth-email로 OTP 받기)
        - 미인증 : 403 (먼저 /users/verify-otp로 인증)
        - 인증됨 + 정보빈 : UPDATE하고 완료
        - 인증됨 + 정보있음 : 409 (이미 가입)
        """
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        file_name = None

        try:
            if psa:
                content = await psa.read()
                file_name = SsyFileNameGenerator.generate(psa.filename, "date")
                with open(os.path.join(self.psaFolder, file_name), "wb") as f:
                    f.write(content)

            con, cur = self._makeConCur()
            self._ensure_schema_and_tables(cur)
            pk = self._users_pk_col(cur)

            cur.execute(
                f"""
                SELECT {pk}, IS_VERIFIED, USERNAME, PASSWORD
                  FROM {self.T_USERS}
                 WHERE LOWER(EMAIL) = LOWER(:P_EMAIL)
                """,
                {"P_EMAIL": email},
            )
            row = cur.fetchone()
            if not row:
                if file_name and os.path.exists(os.path.join(self.psaFolder, file_name)):
                    os.remove(os.path.join(self.psaFolder, file_name))
                return JSONResponse({"result": "먼저 이메일로 인증번호를 받아 인증을 완료해 주세요."},
                                    status_code=404, headers=h)

            user_id, is_verified, exist_username, exist_pw = int(row[0]), int(row[1] or 0), row[2], row[3]

            # LOCATION 저장 (항상 신규)
            loc_out = cur.var(int)
            cur.execute(
                f"""
                INSERT INTO {self.T_LOCATIONS} (si_do, si_gun_gu, dong,detail_address)
                VALUES (:P_SIDO, :P_SIGUNGU, :P_DONG, :P_detail_address)
                RETURNING location_id INTO :P_LOC_OUT
                """,
                {"P_SIDO": si_do, "P_SIGUNGU": si_gun_gu, "P_DONG": dong, "P_LOC_OUT": loc_out,"P_DETAIL_ADDRESS": detail_address,},
            )
            location_id = loc_out.getvalue()[0]

            if is_verified != 1:
                if file_name and os.path.exists(os.path.join(self.psaFolder, file_name)):
                    os.remove(os.path.join(self.psaFolder, file_name))
                return JSONResponse({"result": "이메일 인증(OTP)을 먼저 완료해 주세요."},
                                    status_code=403, headers=h)

            hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

            if (exist_username is None) or (exist_pw is None):
                cur.execute(
                    f"""
                    UPDATE {self.T_USERS}
                       SET USERNAME = :P_USERNAME,
                           PHONE_NUMBER = :P_PHONE,
                           PASSWORD = :P_PASSWORD,
                           PROFILE_IMAGE_URL = :P_IMG,
                           LOCATION_ID = :P_LOC_ID
                     WHERE {pk} = :P_USER_ID
                    """,
                    {
                        "P_USERNAME": username,
                        "P_PHONE": phone_number,
                        "P_PASSWORD": hashed_password,
                        "P_IMG": file_name,
                        "P_LOC_ID": location_id,
                        "P_USER_ID": user_id,
                    },
                )
                con.commit()
                return JSONResponse({"result": "가입이 완료되었습니다!"}, headers=h)

            if file_name and os.path.exists(os.path.join(self.psaFolder, file_name)):
                os.remove(os.path.join(self.psaFolder, file_name))
            return JSONResponse({"result": "이미 가입된 이메일입니다."}, status_code=409, headers=h)

        except Exception as e:
            if con:
                con.rollback()
            if file_name and os.path.exists(os.path.join(self.psaFolder, file_name)):
                os.remove(os.path.join(self.psaFolder, file_name))
            print("회원가입 실패:", e)
            return JSONResponse({"result": "회원가입 실패"}, status_code=500, headers=h)
        finally:
            self._closeConCur(con, cur)


######################################################################
# 로그인 함수
    def login(self, email: str, password: str) -> JSONResponse:
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = self._makeConCur()
            self._ensure_schema_and_tables(cur)
            pk = self._users_pk_col(cur)

            # 1. 이메일로 사용자 정보 조회
            cur.execute(
                f"""
                SELECT {pk}, EMAIL, PASSWORD
                FROM {self.T_USERS}
                WHERE LOWER(EMAIL) = LOWER(:P_EMAIL)
                """,
                {"P_EMAIL": email},
            )
            row = cur.fetchone()

            if not row:
                return JSONResponse({"result": "이메일 또는 비밀번호가 올바르지 않습니다."}, status_code=401, headers=h)

            user_id, user_email, hashed_pw = int(row[0]), row[1], row[2]

            # 2. 비밀번호 일치 여부 확인 (bcrypt)
            if not hashed_pw or not bcrypt.checkpw(password.encode("utf-8"), hashed_pw.encode("utf-8")):
                return JSONResponse({"result": "이메일 또는 비밀번호가 올바르지 않습니다."}, status_code=401, headers=h)

            # 3. 로그인 성공 응답
            # 실제 앱에서는 JWT 토큰 등을 생성하여 반환합니다.
            return JSONResponse({"result": "로그인 성공", "user_id": user_id, "email": user_email}, headers=h)

        except Exception as e:
            if con:
                con.rollback()
            print("login error:", e)
            return JSONResponse({"result": "로그인 실패"}, status_code=500, headers=h)
        finally:
            self._closeConCur(con, cur)