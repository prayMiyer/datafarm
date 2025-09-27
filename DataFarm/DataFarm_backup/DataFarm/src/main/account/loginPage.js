import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "./loginPage.css";

// API 엔드포인트
const API = process.env.REACT_APP_API_URL || "http://localhost:1234";

// onLogin prop을 추가
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 서버 응답에 토큰이 있다고 가정하고 localStorage에 저장
        // 실제 API 응답 구조에 맞게 수정해야 합니다. (예: data.token)
        const token = data.result.token; 
        
        // 부모 컴포넌트에 로그인 상태 전달 (token 전달)
        onLogin(token); 

        console.log('로그인 성공:', data.result);
        navigate('/');
      } else {
        console.error('로그인 실패:', data.result);
        setError(data.result || '로그인 실패: 서버 오류');
      }
    } catch (err) {
      console.error('네트워크 오류:', err);
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">로그인</h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-button">
            로그인
          </button>
        </form>
        <p className="signup-link">
          계정이 없으신가요? <Link to="/signUP">회원가입</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;