import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; //
import "./signUP.css";

// CRA 환경변수
const API = process.env.REACT_APP_API_URL || "http://localhost:1234";

/**
 * Daum(카카오) 우편번호 스크립트를 동적으로 로드하는 훅
 * 로드가 끝나면 ready=true 반환
 */
const useDaumPostcode = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 이미 로드되어 있으면 바로 준비 완료
    if (window.daum && window.daum.Postcode) {
      setReady(true);
      return;
    }

    const scriptId = "daum-postcode-script";
    if (document.getElementById(scriptId)) {
      // 다른 곳에서 로드 중이라면 onload를 기다릴 수 없으니,
      // 약간의 지연 후 존재 확인 (간단 처리)
      const t = setInterval(() => {
        if (window.daum && window.daum.Postcode) {
          setReady(true);
          clearInterval(t);
        }
      }, 200);
      return () => clearInterval(t);
    }

    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);

  return ready;
};

export default function SignUP() {

  const navigate = useNavigate(); 
  // Step 1: 이메일 + OTP
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [secLeft, setSecLeft] = useState(0); // 3분 타이머(초)
  const timerRef = useRef(null);

  // Step 2: 기본 정보
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // 위치 + 파일
  const [siDo, setSiDo] = useState("");
  const [siGunGu, setSiGunGu] = useState("");
  const [dong, setDong] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [psa, setPsa] = useState(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // 다음 주소 검색 준비 여부
  const readyPostcode = useDaumPostcode();

  const canRequestCode = useMemo(() => {
    if (!email) return false;
    return /.+@.+\..+/.test(email);
  }, [email]);

  useEffect(() => {
    if (secLeft <= 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [secLeft]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = (seconds = 180) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecLeft(seconds);
    timerRef.current = setInterval(() => setSecLeft((s) => s - 1), 1000);
  };

  const sendOtp = async () => {
    if (!canRequestCode) return;
    setErr(""); setMsg(""); setLoading(true);
    try {
      const r = await fetch(`${API}/users/auth-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || data.result || "전송 실패");
      setMsg(data.result || "인증번호를 전송했어요. 메일함을 확인하세요.");
      setCodeSent(true);
      startTimer(180);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!email || code.length !== 6) {
      setErr("이메일과 6자리 코드를 확인해 주세요.");
      return;
    }
    setErr(""); setMsg(""); setLoading(true);
    try {
      const r = await fetch(`${API}/users/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || data.result || "인증 실패");
      setCodeVerified(true);
      setMsg(data.result || "이메일 인증 완료! 계속 진행해 주세요.");
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openPostcode = () => {
    if (!(window.daum && window.daum.Postcode)) {
      setErr("주소 검색 스크립트가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setErr(""); setMsg("");

    new window.daum.Postcode({
      oncomplete: function (data) {
        const sido = data.sido || "";
        const sigungu = data.sigungu || "";
        const dongName = data.bname || "";

        let finalDong = dongName;
        if (!finalDong) {
          const base = data.roadAddress || data.jibunAddress || "";
          const m = base.match(/([^\s]+(동|로|가|리))\s?/);
          if (m && m[1]) finalDong = m[1];
        }

        setSiDo(sido);
        setSiGunGu(sigungu);
        setDong(finalDong || "");
        setDetailAddress("");
      }
    }).open();
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let result = '';
    if (value.length < 4) {
      result = value;
    } else if (value.length < 8) {
      result = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else {
      result = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    setPhone(result);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!codeVerified) return setErr("이메일 인증(코드 확인)을 먼저 완료해 주세요.");
    if (pw.length < 8) return setErr("비밀번호는 8자 이상이어야 합니다.");
    if (pw !== pw2) return setErr("비밀번호가 일치하지 않습니다.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("username", username);
      fd.append("email", email);
      fd.append("phone_number", phone);
      fd.append("password", pw);
      if (psa) fd.append("psa", psa);
      fd.append("si_do", siDo);
      fd.append("si_gun_gu", siGunGu);
      fd.append("dong", dong);
      fd.append("detail_address", detailAddress);

      const r = await fetch(`${API}/users/sign-up`, { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || data.result || "회원가입 실패");
      setMsg(data.result || "회원가입 완료!");

      setTimeout(()=>{
        navigate("/login");
      },2000) // 2초후 로그인 페이지 이동(사용자가 성공 메세지를 볼수 있도록)
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const secMM = String(Math.max(0, Math.floor(secLeft / 60)));
  const secSS = String(Math.max(0, secLeft % 60)).padStart(2, "0");

  return (
    <div className="signup">
      <header className="signup-header">
        <div className="container header-bar">
          <a href="/" className="link" style={{ fontWeight: 700 }}>TRADESITE</a>
          <a href="/login" className="link">로그인</a>
        </div>
      </header>

      <main className="container">
        <h1 className="title">회원가입</h1>
        <p className="subtle">이메일 인증(6자리 코드) 후 정보를 입력해 가입을 완료하세요.</p>

        {/* Step 1: 이메일 & OTP */}
        <section className="card">
          <h2 className="section-title">1) 이메일 인증</h2>

          <div className="row row-2">
            <div>
              <label>이메일</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={codeVerified}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={sendOtp}
              disabled={!canRequestCode || loading || codeVerified || secLeft > 0}
              title={secLeft > 0 ? "잠시 후 재전송 가능" : "인증번호 전송"}
            >
              {secLeft > 0 ? `재전송 ${secMM}:${secSS}` : (codeSent ? "재전송" : "인증번호 받기")}
            </button>
          </div>

          <div className="row row-2">
            <div>
              <label>인증번호 (6자리)</label>
              <input
                className="input center"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={codeVerified}
                placeholder="••••••"
              />
            </div>
            <button
              type="button"
              className="btn"
              onClick={verifyOtp}
              disabled={codeVerified || code.length !== 6 || loading}
            >
              {codeVerified ? "인증완료" : "코드 확인"}
            </button>
          </div>
        </section>

        {/* Step 2: 정보 입력 */}
        <form className="card" onSubmit={onSubmit}>
          <h2 className="section-title">2) 기본 정보</h2>

          <div className="row row-2col">
            <div>
              <label>이름/닉네임</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label>휴대폰 번호</label>
              <input
                className="input"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="010-1234-5678"
                maxLength={13}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="row row-2col">
            <div>
              <label>비밀번호 (8자 이상)</label>
              <input
                className="input"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
            </div>
            <div>
              <label>비밀번호 확인</label>
              <input
                className="input"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
              />
            </div>
          </div>

          <h3 className="section-title" style={{ marginTop: 16 }}>주소 정보</h3>

          <div className="row" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={openPostcode}
              disabled={!readyPostcode || loading}
              title={readyPostcode ? "다음 주소 검색" : "스크립트 로딩 중"}
            >
              {readyPostcode ? "주소 찾기 (다음 검색)" : "주소 로딩 중..."}
            </button>
            <span className="helper" style={{ marginLeft: 8 }}>
              버튼을 눌러 주소를 검색하면 시/도·시/군/구·동이 자동 입력돼요.
            </span>
          </div>

          <div className="row row-3">
            <div>
              <label>시/도</label>
              <input
                className="input"
                value={siDo}
                onChange={(e) => setSiDo(e.target.value)}
                required
              />
            </div>
            <div>
              <label>시/군/구</label>
              <input
                className="input"
                value={siGunGu}
                onChange={(e) => setSiGunGu(e.target.value)}
                required
              />
            </div>
            <div>
              <label>동</label>
              <input
                className="input"
                value={dong}
                onChange={(e) => setDong(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 상세 주소 필드 추가 */}
          <div className="row">
            <div>
              <label>상세 주소 (선택)</label>
              <input
                className="input"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="row">
            <div>
              <label>프로필 이미지 (선택)</label>
              <input
                className="file"
                type="file"
                accept="image/*"
                onChange={(e) => setPsa(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              />
            </div>
          </div>

          {err && <p className="error">{err}</p>}
          {msg && <p className="success">{msg}</p>}

          <div className="row" style={{ alignItems: "center" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!codeVerified || loading}
            >
              {loading ? "처리중..." : "가입하기"}
            </button>
            <span className="helper">가입 전 반드시 이메일 인증을 완료하세요.</span>
          </div>
        </form>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p>© {new Date().getFullYear()} TRADESITE</p>
          <div>
            <button type="button" className="link">Privacy</button> · <button type="button" className="link">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}