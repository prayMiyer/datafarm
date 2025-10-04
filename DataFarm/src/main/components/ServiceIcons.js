import { useNavigate } from 'react-router-dom';
import './ServiceIcons.css'; // CSS 파일을 불러옵니다.

const icons = [
  { name: '거래', icon: '📝' },
  { name: '내 정보', icon: '📍' },
  { name: '내 활동', icon: '👤' , path: '/myactivity'},
  { name: '농작물 추천', icon: '🔍', path: '/croprecommendation' }, 
];

const ServiceIcons = () => {
  const navigate = useNavigate();

  const handleIconClick = (path) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="service-icons-grid">
      {icons.map((item, index) => (
        <div 
          key={index} 
          className="icon-item"
          onClick={() => handleIconClick(item.path)}
        >
          <div className="icon-emoji">{item.icon}</div>
          <p className="icon-text">{item.name}</p>
        </div>
      ))}
    </div>
  );
};

export default ServiceIcons;