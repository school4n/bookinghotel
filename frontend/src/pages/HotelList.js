import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/config"; 
import HotelFilter from "./HotelFilter";

const DARK_BG = "#0f172a";
const LIGHT_BG = "#f9f9ff";
const BUTTON_COLOR_GREEN = "#27ae60";

function HotelList() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // 1. Thêm State để theo dõi kích thước màn hình
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [rooms, setRooms] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isBooking, setIsBooking] = useState(false);

    const hasSearchParams = location.search.includes("checkIn=") && location.search.includes("checkOut=");

    // 2. Lắng nghe thay đổi kích thước màn hình
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleBookNow = async (roomId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Vui lòng đăng nhập để đặt phòng.");
            navigate('/login');
            return;
        }
        if (isBooking) return;
        setIsBooking(true);
        try {
            const response = await axiosClient.post('/cart', { room_id: roomId, quantity: 1 });
            alert(response.data.message || "Phòng đã được thêm vào đơn đặt.");
            navigate('/cart'); 
        } catch (error) {
            alert(error.response?.data?.message || "Đặt phòng thất bại.");
        } finally {
            setIsBooking(false);
        }
    };

    useEffect(() => {
        const fetchRooms = async () => {
            setLoading(true);
            try {
                let res;
                if (hasSearchParams) {
                    const searchParams = new URLSearchParams(location.search);
                    res = await axiosClient.get('/rooms/search/advanced', { params: searchParams });
                } else {
                    res = await axiosClient.get('/rooms');
                }
                const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
                const mappedRooms = data.map((item) => ({
                    id: item.id,
                    name: item.name || `Phòng số ${item.id}`,
                    priceFormatted: (parseFloat(item.price_per_night) || 0).toLocaleString("vi-VN") + " VNĐ",
                    image: item.main_image_url ? `/images/${item.main_image_url}` : `https://via.placeholder.com/250`,
                    max_guests: item.max_guests || 1,
                }));
                setRooms(mappedRooms);
            } catch (err) {
                setError("Có lỗi xảy ra khi tải danh sách phòng.");
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, [location.search, hasSearchParams]);

    // --- CẤU HÌNH STYLE ĐỘNG ---
    const dynamicCardStyle = {
        ...cardStyle,
        flexDirection: isMobile ? "column" : "row", // Điện thoại thì xếp dọc
    };

    const dynamicImgStyle = {
        ...imgStyle,
        width: isMobile ? "100%" : "200px", // Điện thoại ảnh rộng 100%
        height: isMobile ? "200px" : "200px",
        borderRadius: isMobile ? "12px 12px 0 0" : "12px 0 0 12px"
    };

    const dynamicInfoStyle = {
        ...infoContainerStyle,
        flexDirection: isMobile ? "column" : "row", // Nội dung điện thoại xếp dọc
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? "15px" : "0"
    };

    return (
        <div style={{ padding: isMobile ? "10px" : "30px 20px", backgroundColor: LIGHT_BG, minHeight: '100vh' }}>
            <div style={{ display: "flex", maxWidth: "1200px", margin: "0 auto", gap: "30px", flexDirection: isMobile ? "column" : "row" }}>
                
                <div style={{ flex: isMobile ? "1" : "0 0 300px" }}>
                    <HotelFilter />
                </div>

                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', color: DARK_BG, marginBottom: '20px' }}>
                        {hasSearchParams ? `Kết quả (${rooms.length})` : `Tất cả phòng (${rooms.length})`}
                    </h1>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {rooms.map((room) => (
                            <div key={room.id} style={dynamicCardStyle}>
                                <img src={room.image} alt={room.name} style={dynamicImgStyle} />
                                
                                <div style={dynamicInfoStyle}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{room.name}</h3>
                                        <p style={{ color: '#666', fontSize: '0.85rem' }}>👥 Tối đa: {room.max_guests} khách</p>
                                        <p style={priceStyle}>{room.priceFormatted}</p>
                                    </div>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: isMobile ? 'row' : 'column', 
                                        gap: '10px',
                                        width: isMobile ? "100%" : "auto" 
                                    }}>
                                        <button 
                                            onClick={() => handleBookNow(room.id)}
                                            style={{ ...bookBtnStyle, flex: isMobile ? 1 : "none" }}
                                            disabled={isBooking}
                                        >
                                            {isBooking ? "..." : "ĐẶT PHÒNG"}
                                        </button>
                                        <Link 
                                            to={`/rooms/${room.id}`} 
                                            style={{ ...detailBtnStyle, flex: isMobile ? 1 : "none" }}
                                        >
                                            CHI TIẾT
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- CSS STATIC ---
const cardStyle = { display: "flex", backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", border: "1px solid #eee" };
const imgStyle = { objectFit: "cover", flexShrink: 0 };
const infoContainerStyle = { padding: '15px', flex: 1, display: 'flex', justifyContent: 'space-between' };
const priceStyle = { color: '#e8491d', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '5px' };
const bookBtnStyle = { backgroundColor: BUTTON_COLOR_GREEN, color: "#fff", padding: "10px 15px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" };
const detailBtnStyle = { backgroundColor: '#fff', color: DARK_BG, padding: "10px 15px", border: "1px solid #ddd", borderRadius: "6px", fontWeight: "bold", textDecoration: "none", textAlign: "center", fontSize: "0.85rem" };

export default HotelList;
