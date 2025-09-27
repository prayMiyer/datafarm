import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom'; // BrowserRouter를 import
import "./App.css";
import LoginPage from './main/account/loginPage';
import SignUP from './main/account/signUP';
import Navbar from './main/components/Navbar';
import Main from './main/main';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('userToken', token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    setIsLoggedIn(false);
  };

   return (
    <> {/* BrowserRouter를 제거합니다. */}
      <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/signUP" element={<SignUP />} />
      </Routes>
    </>
  );
};
export default App;