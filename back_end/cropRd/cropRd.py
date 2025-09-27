import requests
import os

# 날씨 API 키를 환경 변수에서 가져옵니다.
WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY")

# ✅ 주요 도시의 위도/경도 데이터
locations = {
    '서울': {'lat': 37.5665, 'lon': 126.9780},
    '부산': {'lat': 35.1796, 'lon': 129.0756},
    '대전': {'lat': 36.3504, 'lon': 127.3845},
    '제주': {'lat': 33.4996, 'lon': 126.5312},
}

# ✅ 농작물 데이터 (생육 최적 조건)
crop_data = {
    '서울': {
        '쌀': {'optimal_temp': [15, 25], 'optimal_rain': [50, 100]},
        '고구마': {'optimal_temp': [20, 30], 'optimal_rain': [30, 60]}
    },
    '부산': {
        '딸기': {'optimal_temp': [10, 20], 'optimal_rain': [40, 80]},
        '사과': {'optimal_temp': [18, 28], 'optimal_rain': [60, 120]}
    },
    '대전': {
        '쌀': {'optimal_temp': [15, 25], 'optimal_rain': [50, 100]},
        '사과': {'optimal_temp': [18, 28], 'optimal_rain': [60, 120]}
    },
    '제주': {
        '딸기': {'optimal_temp': [10, 20], 'optimal_rain': [40, 80]},
        '고구마': {'optimal_temp': [20, 30], 'optimal_rain': [30, 60]}
    },
}

# ✅ OpenWeatherMap API에서 실시간 날씨 데이터 가져오기
def get_weather_data(lat: float, lon: float):
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
        response = requests.get(url)
        response.raise_for_status() # HTTP 오류가 발생하면 예외 발생
        data = response.json()
        
        temp = data['main']['temp']
        rain = data.get('rain', {}).get('1h', 0) or data.get('rain', {}).get('3h', 0) or 0
        
        return {'temp': temp, 'rain': rain}
    except requests.exceptions.RequestException as e:
        print(f"날씨 API 호출 실패: {e}")
        return None

# ✅ 농작물 추천 함수
def get_recommendations(location: str):
    location_coords = locations.get(location)
    if not location_coords:
        return {'recommendations': ['유효하지 않은 지역입니다.']}
        
    weather_data = get_weather_data(location_coords['lat'], location_coords['lon'])
    if not weather_data:
        return {'recommendations': ['날씨 데이터를 가져오는 데 실패했습니다.']}
        
    recommendations = []
    location_data = crop_data.get(location, {})
    
    for crop, conditions in location_data.items():
        if (weather_data['temp'] >= conditions['optimal_temp'][0] and
            weather_data['temp'] <= conditions['optimal_temp'][1] and
            weather_data['rain'] >= conditions['optimal_rain'][0] and
            weather_data['rain'] <= conditions['optimal_rain'][1]):
            recommendations.append(crop)

    if not recommendations:
        return {'recommendations': ['해당 지역에 추천할 농작물이 없습니다.']}

    return {'recommendations': recommendations}