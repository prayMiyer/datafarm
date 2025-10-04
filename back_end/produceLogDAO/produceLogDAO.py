from fastapi.responses import JSONResponse
from SSY.ssyDBManager import SsyDBManager
from SSY import config

class ProduceLogDAO:
    def __init__(self):
        self.db = SsyDBManager()
        self._schema = None
        self.T_PRODUCE_LOGS = "PRODUCE_LOGS"

    def _makeConCur(self):
        return SsyDBManager.makeConCur()

    def _closeConCur(self, con, cur):
        SsyDBManager.closeConCur(con, cur)
    
    def _ensure_schema_and_tables(self, cur):
        if self._schema is None:
            cfg_schema = getattr(config, "DB_SCHEMA", None)
            if cfg_schema:
                self._schema = cfg_schema.upper()
            else:
                cur.execute("SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM dual")
                self._schema = (cur.fetchone()[0] or "").upper()

            if self._schema:
                self.T_PRODUCE_LOGS = f"{self._schema}.PRODUCE_LOGS"

    # === 모든 기록 조회 ===
    def get_logs(self, user_id: int):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = self._makeConCur()
            self._ensure_schema_and_tables(cur)

            sql = f"""
                SELECT ID, CROP_NAME, PRODUCE_QUANTITY, TO_CHAR(PRODUCTION_DATE, 'YYYY-MM-DD') AS PROD_DATE
                FROM {self.T_PRODUCE_LOGS}
                WHERE USER_ID = :P_USER_ID
                ORDER BY PRODUCTION_DATE DESC
            """
            cur.execute(sql, {"P_USER_ID": user_id})
            
            # 컬럼 이름을 키로 하는 딕셔너리 리스트로 변환
            columns = [desc[0].lower() for desc in cur.description]
            logs = [dict(zip(columns, row)) for row in cur.fetchall()]
            
            return JSONResponse({"logs": logs}, headers=h)

        except Exception as e:
            print("get_logs error:", e)
            return JSONResponse({"result": "기록 조회 실패"}, status_code=500, headers=h)
        finally:
            self._closeConCur(con, cur)

    # === 새 기록 추가 ===
    def add_log(self, user_id: int, crop_name: str, quantity: float, production_date: str):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = self._makeConCur()
            self._ensure_schema_and_tables(cur)

            sql = f"""
                INSERT INTO {self.T_PRODUCE_LOGS} (USER_ID, CROP_NAME, PRODUCE_QUANTITY, PRODUCTION_DATE)
                VALUES (:P_USER_ID, :P_CROP_NAME, :P_QUANTITY, TO_DATE(:P_PROD_DATE, 'YYYY-MM-DD'))
            """
            cur.execute(sql, {
                "P_USER_ID": user_id,
                "P_CROP_NAME": crop_name,
                "P_QUANTITY": quantity,
                "P_PROD_DATE": production_date
            })
            con.commit()
            return JSONResponse({"result": "기록이 성공적으로 추가되었습니다."}, status_code=201, headers=h)

        except Exception as e:
            if con: con.rollback()
            print("add_log error:", e)
            return JSONResponse({"result": "기록 추가 실패"}, status_code=500, headers=h)
        finally:
            self._closeConCur(con, cur)

    # === 기록 삭제 ===
    def delete_log(self, log_id: int):
        h = {"Access-Control-Allow-Origin": "*"}
        con, cur = None, None
        try:
            con, cur = self._makeConCur()
            self._ensure_schema_and_tables(cur)

            sql = f"DELETE FROM {self.T_PRODUCE_LOGS} WHERE ID = :P_LOG_ID"
            cur.execute(sql, {"P_LOG_ID": log_id})

            if cur.rowcount == 0:
                return JSONResponse({"result": "삭제할 기록을 찾을 수 없습니다."}, status_code=404, headers=h)
            
            con.commit()
            return JSONResponse({"result": "기록이 삭제되었습니다."}, headers=h)

        except Exception as e:
            if con: con.rollback()
            print("delete_log error:", e)
            return JSONResponse({"result": "기록 삭제 실패"}, status_code=500, headers=h)
        finally:
            self._closeConCur(con, cur)