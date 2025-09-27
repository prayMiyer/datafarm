import './ServiceIcons.css'; // CSS 파일을 불러옵니다.

const icons = [
  { name: '판매하기', icon: '📝' },
  { name: '내 근처', icon: '📍' },
  { name: '내 활동', icon: '👤' },
  { name: '검색', icon: '🔍' },
];

const ServiceIcons = () => {
  return (
    <div className="service-icons-grid">
      {icons.map((item, index) => (
        <div key={index} className="icon-item">
          <div className="icon-emoji">{item.icon}</div>
          <p className="icon-text">{item.name}</p>
        </div>
      ))}
    </div>
  );
};

export default ServiceIcons;