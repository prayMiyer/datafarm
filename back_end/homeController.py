import uvicorn
from typing import Optional

from fastapi import FastAPI, Form, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from users.userDAO import UsersDAO
from cropRd.cropRd import get_recommendations
from produceLogDAO.produceLogDAO import ProduceLogDAO

# ===== JSON Body Models =====
class EmailIn(BaseModel):
    email: EmailStr

class OtpIn(BaseModel):
    email: EmailStr
    code: str  # "123456"

class LoginIn(BaseModel):
    email: EmailStr
    password: str
class ProduceLogIn(BaseModel):
    userId: int
    cropName: str
    quantity: float
    productionDate: str # "YYYY-MM-DD" 형식

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중엔 * 허용(운영은 도메인 제한 권장)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uDAO = UsersDAO()
pDAO = ProduceLogDAO()

# === OTP 전송(JSON) ===
@app.post("/users/auth-email")
def auth_email_route(body: EmailIn = Body(...)):
    return uDAO.send_otp(body.email)

# === OTP 검증(JSON) ===
@app.post("/users/verify-otp")
def verify_otp_route(body: OtpIn = Body(...)):
    return uDAO.verify_otp(body.email, body.code)

# === 회원가입(FormData + 파일) ===
@app.post("/users/sign-up")
async def signup_route(
    username: str = Form(...),
    email: EmailStr = Form(...),
    phone_number: str = Form(""),
    password: str = Form(...),
    psa: Optional[UploadFile] = File(None),   # Py3.8/3.9 호환
    si_do: str = Form(...),
    si_gun_gu: str = Form(...),
    dong: str = Form(...),
    detail_address:str =Form(...),
):
    return await uDAO.signUp(
        username=username,
        email=email,
        phone_number=phone_number,
        password=password,
        psa=psa,
        si_do=si_do, si_gun_gu=si_gun_gu, dong=dong, detail_address=detail_address,
    )

# 로그인 엔드포인트
@app.post("/users/login")
def login_route(body: LoginIn = Body(...)):
    return uDAO.login(body.email, body.password)

# === 농작물 추천 엔드포인트 ===
@app.get("/api/recommend-crop")
def recommend_crop_route(location: str):
    return get_recommendations(location)

#  produceLogDAO 기능
@app.get("/api/produce-logs", summary="특정 사용자의 모든 생산량 기록 조회")
def get_produce_logs(user_id: int):
    return pDAO.get_logs(user_id)

@app.post("/api/produce-logs", summary="새 생산량 기록 추가")
def add_produce_log(body: ProduceLogIn = Body(...)):
    return pDAO.add_log(
        user_id=body.userId,
        crop_name=body.cropName,
        quantity=body.quantity,
        production_date=body.productionDate
    )

@app.delete("/api/produce-logs/{log_id}", summary="생산량 기록 삭제")
def delete_produce_log(log_id: int):
    return pDAO.delete_log(log_id)


if __name__ == "__main__":
    uvicorn.run("homeController:app", host="0.0.0.0", port=1234, reload=True)

