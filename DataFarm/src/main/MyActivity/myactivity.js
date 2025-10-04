import { formatDate } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
// 👇 useEffect 훅을 import 합니다.
import { useEffect, useRef, useState } from "react";
import "./myactivity.css";

const MyActivity = () => {
    const calendarRef = useRef(null);
    const [currentEvents, setCurrentEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedCrop, setSelectedCrop] = useState("");
    const [quantity, setQuantity] = useState("");

    const cropOptions = ["사과", "배", "토마토", "감자", "상추", "딸기"];

    // 👇 --- 백엔드 API 연결 로직 ---
    
    // ❗️ 실제 애플리케이션에서는 로그인 후 사용자 정보를 가져와야 합니다.
    // 여기서는 테스트를 위해 사용자 ID를 1로 고정합니다.
    const MOCK_USER_ID = 1; 
    const API_BASE_URL = "http://localhost:1234"; // FastAPI 서버 주소

    // 1. 백엔드에서 데이터를 불러와 캘린더 형식에 맞게 변환하는 함수
    const fetchLogs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/produce-logs?user_id=${MOCK_USER_ID}`);
            const data = await response.json();
            
            // 백엔드 데이터(logs)를 FullCalendar가 이해하는 형식으로 변환
            const formattedEvents = data.logs.map(log => ({
                id: log.id, // DB의 ID를 이벤트 ID로 사용
                title: `${log.crop_name}: ${log.produce_quantity} kg`,
                start: log.prod_date,
                allDay: true
            }));
            
            setCurrentEvents(formattedEvents);
        } catch (error) {
            console.error("Error fetching produce logs:", error);
        }
    };

    // 2. 컴포넌트가 처음 마운트될 때 데이터를 한번 불러옵니다.
    useEffect(() => {
        fetchLogs();
    }, []); // 빈 배열은 최초 1회만 실행됨을 의미합니다.


    const handleDateClick = (selected) => {
        setSelectedDate(selected);
    };

    // 3. 기록 저장 함수를 비동기(async)로 변경하고, POST 요청을 보내도록 수정
    const handleSaveRecord = async () => {
        if (selectedDate && selectedCrop && quantity) {
            const newLog = {
                userId: MOCK_USER_ID,
                cropName: selectedCrop,
                quantity: parseFloat(quantity), // 문자열을 숫자로 변환
                productionDate: selectedDate.dateStr
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/produce-logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newLog)
                });

                if (response.ok) {
                    // 저장이 성공하면, DB에서 최신 데이터를 다시 불러와 캘린더를 새로고침합니다.
                    fetchLogs(); 
                    // 입력 필드 초기화
                    setSelectedCrop("");
                    setQuantity("");
                    setSelectedDate(null);
                } else {
                    alert("기록 저장에 실패했습니다.");
                }
            } catch (error) {
                console.error("Error saving record:", error);
                alert("서버 통신 중 오류가 발생했습니다.");
            }

        } else {
            alert("농작물, 생산량, 날짜를 모두 선택해주세요.");
        }
    };

    // 4. 이벤트 클릭(삭제) 함수를 비동기(async)로 변경하고, DELETE 요청을 보내도록 수정
    const handleEventClick = async (selected) => {
        if (window.confirm(`'${selected.event.title}' 기록을 삭제하시겠습니까?`)) {
            const logId = selected.event.id; // 이벤트 ID (DB의 ID)

            try {
                const response = await fetch(`${API_BASE_URL}/api/produce-logs/${logId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    // 삭제가 성공하면, DB에서 최신 데이터를 다시 불러와 캘린더를 새로고침합니다.
                    fetchLogs();
                } else {
                    alert("기록 삭제에 실패했습니다.");
                }
            } catch (error) {
                console.error("Error deleting record:", error);
                alert("서버 통신 중 오류가 발생했습니다.");
            }
        }
    };

    return (
        <Box className="my-activity-container">
            {/* ... 헤더 JSX ... */}
            <Box className="page-header">
                <Typography variant="h2" className="page-title">나의 생산량 기록</Typography>
                <Typography variant="h5" className="page-subtitle">달력에서 일일/월간 생산량을 기록하고 관리하세요.</Typography>
            </Box>
            
            <Box className="flex-container">
                {/* ... 사이드바 JSX (변경 없음) ... */}
                <Box className="sidebar">
                    <Typography variant="h5">생산량 입력</Typography>
                    <FormControl fullWidth className="form-control">
                        <InputLabel>농작물 선택</InputLabel>
                        <Select value={selectedCrop} label="농작물 선택" onChange={(e) => setSelectedCrop(e.target.value)}>
                            {cropOptions.map((crop) => (<MenuItem key={crop} value={crop}>{crop}</MenuItem>))}
                        </Select>
                    </FormControl>
                    <TextField fullWidth variant="filled" type="number" label="생산량 (kg)" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="text-field" />
                    <Typography variant="h6" className="selected-date-text">
                        선택된 날짜: {selectedDate ? selectedDate.dateStr : "달력에서 날짜를 선택하세요"}
                    </Typography>
                    <Button fullWidth variant="contained" className="save-button" onClick={handleSaveRecord}>기록 저장</Button>
                    <Typography variant="h5" className="event-list-title">기록된 이벤트</Typography>
                    <List>
                        {currentEvents.map((event) => (
                            <ListItem key={event.id} className="event-list-item">
                                <ListItemText primary={event.title} secondary={<Typography>{formatDate(event.start, {year: "numeric", month: "short", day: "numeric"})}</Typography>} />
                            </ListItem>
                        ))}
                    </List>
                </Box>

                {/* --- 캘린더 --- */}
                <Box className="calendar-container">
                    <FullCalendar
                        ref={calendarRef}
                        // 👇 `events` prop을 사용하여 백엔드에서 가져온 데이터로 캘린더를 그립니다.
                        events={currentEvents} 
                        height="75vh"
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                        headerToolbar={{left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth"}}
                        initialView="dayGridMonth"
                        editable={true}
                        selectable={true}
                        selectMirror={true}
                        dayMaxEvents={true}
                        select={handleDateClick}
                        eventClick={handleEventClick}
                        // 👇 이제 eventsSet은 필요 없습니다. 모든 데이터는 fetchLogs를 통해 관리됩니다.
                        // eventsSet={(events) => setCurrentEvents(events)} 
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default MyActivity;