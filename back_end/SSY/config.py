import os
from dotenv import load_dotenv

from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# (1) 현재 작업 폴더 기준 탐색 + (2) 파일 경로 직접 지정, 둘 다 시도
dotenv_path = find_dotenv(usecwd=True)
if not dotenv_path:
    # main.py와 같은 폴더의 .env를 시도
    dotenv_path = str((Path(__file__).resolve().parent / ".env"))

load_dotenv(dotenv_path, override=True)
# .env 파일에서 환경 변수를 로드합니다.
# 이 코드가 os.getenv()를 호출하기 전에 실행되어야 합니다.
# 현재 스크립트가 실행되는 폴더의 절대 경로를 가져옵니다.
# 이것이 os.path.dirname(__file__)보다 더 안정적일 수 있습니다.
current_dir = os.getcwd() 

# 프로젝트의 최상위 폴더(back_end 폴더의 부모 폴더) 경로를 만듭니다.
# 경로가 꼬이지 않도록 주의합니다.
project_root = os.path.dirname(current_dir)

# 최상위 폴더에 있는 .env 파일을 명시적으로 로드합니다.
load_dotenv(os.path.join(project_root, '.env'))

# 이 코드를 추가하여 값이 제대로 로드되었는지 확인합니다.
print("CWD:", os.getcwd())
print("DOTENV used:", dotenv_path)
print(f"DEBUG: ORACLE_USER = '{os.getenv('ORACLE_USER')}'")
print(f"DEBUG: ORACLE_PASSWORD = '{os.getenv('ORACLE_PASSWORD')}'")
print(f"DEBUG: ORACLE_DSN = '{os.getenv('ORACLE_DSN')}'")
# Oracle DB 접속 정보
# --- Oracle DB 접속 정보 ---
# URL 전체가 아닌, 사용자명/비밀번호/DSN을 분리하여 정의합니다.
ORACLE_USER = os.getenv("ORACLE_USER")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD")
ORACLE_DSN = os.getenv("ORACLE_DSN") # 호스트:포트/서비스명

# --- NAVER SMTP ---
NAVER_SMTP_HOST = "smtp.naver.com"
NAVER_SMTP_PORT = 587
NAVER_SMTP_USER = os.getenv("NAVER_SMTP_USER")
NAVER_SMTP_PASS = os.getenv("NAVER_SMTP_PASS")
SMTP_FROM = NAVER_SMTP_USER

# --- 구글 SMTP ---
GOOGLE_SMTP_HOST = "smtp.gmail.com"
GOOGLE_SMTP_PORT = 587
GOOGLE_SMTP_USER = os.getenv("GOOGLE_SMTP_USER")
GOOGLE_SMTP_PASS = os.getenv("GOOGLE_SMTP_PASS")