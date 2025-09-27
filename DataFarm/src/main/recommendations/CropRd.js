import { useState } from 'react';
import './CropRd.css'; // CSS 파일을 불러옵니다.

// ───────────────────────────────────────────────────
// 실제 프로젝트에서는 이 데이터가 백엔드 서버에 저장됩니다.
// 가상의 날씨 데이터 (현재 기온과 강수량)
const FAKE_WEATHER_DATA = {
  '서울': { temp: 24, rain: 60 },
  '부산': { temp: 26, rain: 45 },
  '대전': { temp: 22, rain: 80 },
  '제주': { temp: 25, rain: 110 },
  '그 외': { temp: 20, rain: 50 }, // 입력된 지역이 없을 경우 기본값
};

// 가상의 농작물 데이터베이스 (상관관계 분석 데이터와 이미지 URL 추가)
const FAKE_CROP_DB = {
  '쌀': { 
    optimalTemp: [15, 25], 
    optimalRain: [50, 100], 
    image: 'https://cdn.pixabay.com/photo/2016/06/18/16/09/rice-1465228_1280.jpg',
    analysis: '쌀은 온난 습윤한 환경에서 잘 자라며, 연평균 강수량 1300mm 이상에서 안정적으로 생산됩니다.'
  },
  '고구마': { 
    optimalTemp: [20, 30], 
    optimalRain: [30, 60], 
    image: 'https://cdn.pixabay.com/photo/2016/03/17/17/57/sweet-potatoes-1264023_1280.jpg',
    analysis: '고구마는 비교적 건조한 환경에서 잘 자라며, 물 빠짐이 좋은 토양에서 높은 생산성을 보입니다.'
  },
  '딸기': { 
    optimalTemp: [10, 20], 
    optimalRain: [40, 80], 
    image: 'https://cdn.pixabay.com/photo/2016/06/07/21/20/strawberries-1442115_1280.jpg',
    analysis: '딸기는 서늘한 기온을 좋아하며, 적절한 강수량과 낮은 일교차 환경에서 품질이 향상됩니다.'
  },
  '사과': { 
    optimalTemp: [18, 28], 
    optimalRain: [60, 120], 
    image: 'https://cdn.pixabay.com/photo/2016/10/27/17/28/apples-1776510_1280.jpg',
    analysis: '사과는 시원한 기후를 선호하며, 개화기에는 적당한 일조량이, 수확기에는 큰 일교차가 생산량을 높입니다.'
  },
};

// ───────────────────────────────────────────────────

const CropRd = () => {
  const [location, setLocation] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  //실제 API 호출을 시뮬레이션하는 함수
  const simulateApiCall = async (loc) => {
    return new Promise(resolve => {
      // 2초의 지연 시간을 주어 실제 API 호출처럼 보이게 합니다.
      setTimeout(() => {
        const weather = FAKE_WEATHER_DATA[loc] || FAKE_WEATHER_DATA['그 외'];
        const results = [];

        // 데이터 상관관계 분석 로직 (가상)
        for (const crop in FAKE_CROP_DB) {
          const { optimalTemp, optimalRain, image, analysis } = FAKE_CROP_DB[crop];
          
          if (weather.temp >= optimalTemp[0] && weather.temp <= optimalTemp[1] &&
              weather.rain >= optimalRain[0] && weather.rain <= optimalRain[1]) {
            // 추천 객체에 이미지와 분석 내용 추가
            results.push({ name: crop, image, analysis });
          }
        }
        
        // 추천 결과가 없을 경우 메시지 추가
        if (results.length === 0) {
            results.push({ name: '적절한 농작물을 찾을 수 없습니다.', image: '', analysis: '현재 입력된 지역의 날씨에 맞는 농작물 데이터가 없습니다. 다른 지역을 입력해 보세요.' });
        }

        resolve({ recommendations: results });
      }, 2000); // 2초 뒤에 결과 반환
    });
  };

  const handleRecommend = async () => {
    if (!location) {
      alert('지역을 입력해주세요!');
      return;
    }

    setLoading(true);
    setRecommendations([]);

    try {
      const response = await simulateApiCall(location);
      setRecommendations(response.recommendations);
    } catch (error) {
      console.error('Error:', error);
      alert('추천에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crop-recommendation-container">
      <h2>농작물 추천</h2>
      <p>날씨와 생산량 데이터에 따라 농작물을 추천해 드립니다.</p>
      
      <div className="input-group">
        <input
          type="text"
          placeholder="지역을 입력하세요 (예: 서울, 부산, 대전, 제주)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button onClick={handleRecommend} disabled={loading}>
          {loading ? '분석 중...' : '추천받기'}
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="recommendations-list">
          <h3>"{location}"에 추천하는 농작물</h3>
          <ul>
            {recommendations.map((crop, index) => (
              <li key={index} className="recommended-crop-item">
                <div className="crop-info">
                  {crop.image && <img src={crop.image} alt={crop.name} className="crop-image" />}
                  <div>
                    <h4 className="crop-name">{crop.name}</h4>
                    <p className="crop-analysis">{crop.analysis}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CropRd;