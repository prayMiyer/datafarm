import { useEffect, useRef, useState } from "react";
import ProductList from "./components/ProductList";
import ServiceIcons from "./components/ServiceIcons";

// 카카오 지도 키 (.env)
const KAKAO_KEY = process.env.REACT_APP_KAKAO_MAP_API_KEY;
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;

// 기상청 초단기실황 API (.env)
const WEATHER_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const WEATHER_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";

/** ───────────────────────────────────────────────────────────
 *  위/경도 → 기상청 격자(nx, ny) 변환 (LCC: 기상청 공개 공식)
 *  ref: RE=6371.00877, GRID=5.0, SLAT1=30.0, SLAT2=60.0, OLON=126.0, OLAT=38.0, XO=43, YO=136
 *  ─────────────────────────────────────────────────────────── */
const toGrid = (v1, v2) => {
  const DEGRAD = Math.PI / 180.0;
  const RADDEG = 180.0 / Math.PI;

  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 표준위도1
  const SLAT2 = 60.0; // 표준위도2
  const OLON = 126.0; // 기준점 경도
  const OLAT = 38.0; // 기준점 위도
  const XO = 43; // 기준점 X좌표
  const YO = 136; // 기준점 Y좌표

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const ra = Math.tan(Math.PI * 0.25 + (v1) * DEGRAD * 0.5);
  const r = (re * sf) / Math.pow(ra, sn);
  let theta = v2 * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(r * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - r * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
};

const Main = () => {
  const [sdkStatus, setSdkStatus] = useState("init");
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!KAKAO_KEY) {
      console.error("[MAP] Missing Kakao JS key (.env not injected)");
      setSdkStatus("failed");
      return;
    }

    document
      .querySelectorAll('script[src^="https://dapi.kakao.com/v2/maps/sdk.js"]')
      .forEach((s) => s.remove());

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;

    const onLoad = () => {
      setSdkStatus("loaded");
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;

        const center = new window.kakao.maps.LatLng(36.5, 127.8); // 한반도 중앙쯤
        const map = new window.kakao.maps.Map(mapRef.current, {
          center,
          level: 12,
        });
        mapInstance.current = map;

        displayMultipleWeather();
      });
    };

    const onError = (e) => {
      console.error("[MAP] kakao script load FAILED", e);
      setSdkStatus("failed");
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      document.head.removeChild(script);
    };
  }, []);

  // 사진에 보이는 주요 지역(광역시/도 대표 도시 + 섬)
  const REGIONS = [
    // 수도권/강원
    { name: "서울",     lat: 37.5665, lon: 126.9780 },
    { name: "인천",     lat: 37.4563, lon: 126.7052 },
    { name: "수원(경기)", lat: 37.2636, lon: 127.0286 },
    { name: "춘천(강원)", lat: 37.8813, lon: 127.7298 },
    { name: "강릉",     lat: 37.7519, lon: 128.8761 },

    // 충청권
    { name: "청주(충북)", lat: 36.6424, lon: 127.4890 },
    { name: "대전",     lat: 36.3504, lon: 127.3845 },
    { name: "홍성(충남)", lat: 36.6010, lon: 126.6608 }, // 충남청 본부 근방

    // 전라권
    { name: "전주(전북)", lat: 35.8242, lon: 127.1480 },
    { name: "광주",     lat: 35.1595, lon: 126.8526 },
    { name: "목포",     lat: 34.8118, lon: 126.3922 },
    { name: "여수",     lat: 34.7604, lon: 127.6622 },

    // 경상권
    { name: "대구",     lat: 35.8714, lon: 128.6014 },
    { name: "포항",     lat: 36.0190, lon: 129.3435 },
    { name: "울산",     lat: 35.5384, lon: 129.3114 },
    { name: "부산",     lat: 35.1796, lon: 129.0756 },
    { name: "창원(경남)", lat: 35.2283, lon: 128.6813 },
    { name: "안동(경북)", lat: 36.5683, lon: 128.7294 },

    // 섬
    { name: "제주",     lat: 33.4996, lon: 126.5312 },
    { name: "서귀포",   lat: 33.2530, lon: 126.5587 },
    { name: "울릉도",   lat: 37.4844, lon: 130.9050 },
    { name: "독도",     lat: 37.2410, lon: 131.8643 },
  ];

  // 지도 오버레이만 표시 (작은 말풍선)
  const displayMultipleWeather = async () => {
    if (!mapInstance.current) return;

    const fetchNowcast = async (lat, lon) => {
      const now = new Date();
      // 발표시간 보정(최근 발표 반영)
      const baseRef = new Date(now.getTime() - 40 * 60 * 1000);
      const yyyy = baseRef.getFullYear();
      const mm = String(baseRef.getMonth() + 1).padStart(2, "0");
      const dd = String(baseRef.getDate()).padStart(2, "0");
      const hh = String(baseRef.getHours()).padStart(2, "0");

      const { nx, ny } = toGrid(lat, lon);
      const base_date = `${yyyy}${mm}${dd}`;
      const base_time = `${hh}00`;

      const encodedKey = /%[0-9A-F]{2}/i.test(WEATHER_KEY)
        ? WEATHER_KEY
        : encodeURIComponent(WEATHER_KEY);

      const params = new URLSearchParams({
        serviceKey: encodedKey,
        pageNo: "1",
        numOfRows: "200",
        dataType: "JSON",
        base_date,
        base_time,
        nx: String(nx),
        ny: String(ny),
      });

      try {
        const res = await fetch(`${WEATHER_URL}?${params.toString()}`);
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
        if (text.trim().startsWith("<")) throw new Error("XML Error Response");

        const json = JSON.parse(text);
        const items = json?.response?.body?.items?.item || [];
        const get = (c) => items.find((i) => i.category === c)?.obsrValue;

        const t1h = get("T1H") ?? "N/A";
        const reh = get("REH") ?? "N/A";

        // 심플 아이콘(이모지) — 원하면 Weather Icons로 교체 가능
        let icon = "☀️";
        const temp = Number(t1h);
        if (!isNaN(temp)) {
          if (temp <= 0) icon = "❄️";
          else if (temp < 10) icon = "🌥️";
          else if (temp < 20) icon = "⛅";
          else if (temp < 30) icon = "☀️";
          else icon = "🔥";
        }

        return { t1h, reh, icon };
      } catch (e) {
        console.error("날씨 데이터 불러오기 실패:", e);
        return { t1h: "Error", reh: "Error", icon: "❓" };
      }
    };

    await Promise.all(
      REGIONS.map(async (r) => {
        const wx = await fetchNowcast(r.lat, r.lon);
        const pos = new window.kakao.maps.LatLng(r.lat, r.lon);

        const content = `
          <div style="
            background:#fff;
            border:1px solid #d1d5db;
            border-radius:6px;
            padding:4px 6px;
            text-align:center;
            font-size:11px;
            line-height:1.2;
            box-shadow:0 2px 6px rgba(0,0,0,0.15);
            transform: translateY(-4px);
            max-width:110px;
          ">
            <div style="font-size:16px; line-height:1; margin-bottom:2px;">${wx.icon}</div>
            <div style="font-weight:600; margin-bottom:1px;">${r.name}</div>
            <div>${wx.t1h}°C / ${wx.reh}%</div>
          </div>
        `;

        const overlay = new window.kakao.maps.CustomOverlay({
          position: pos,
          content,
          yAnchor: 1.1,
        });
        overlay.setMap(mapInstance.current);
      })
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4">
        <ServiceIcons />
        <h2 className="text-xl font-bold mt-8 mb-4">대한민국 실시간 날씨</h2>

        {(sdkStatus === "failed" || sdkStatus === "timeout") && (
          <div className="mb-3 rounded-md bg-red-100 p-3 text-sm text-red-700">
            카카오 지도 SDK를 불러오지 못했습니다. (상태: {sdkStatus}) <br />
            - .env에 <b>REACT_APP_KAKAO_MAP_API_KEY</b> 확인<br />
            - Kakao Developers &gt; 플랫폼(Web) 도메인 등록<br />
            - dapi.kakao.com 차단 해제
          </div>
        )}

        <div
          id="map"
          ref={mapRef}
          style={{ width: "100%", height: "460px", borderRadius: "10px" }}
        />

        <h2 className="text-xl font-bold mt-8 mb-4">방금 등록된 상품</h2>
        <ProductList />
      </div>
    </div>
  );
};

export default Main;