import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ isLoggedIn, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="logo-link">
          DataFarm
        </Link>
      </div>
      <div className="search-container">
        <input
          type="text"
          placeholder="농수산물, 품종, 지역을 검색해보세요!"
          className="search-input"
        />
      </div>

      <div className="nav-links">
        {isLoggedIn ? (
          <>
            <Link to="/sell" className="nav-link">판매하기</Link>
            <button onClick={onLogout} className="login-button">로그아웃</button>
          </>
        ) : (
          <Link to="/login" className="login-button">로그인</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;