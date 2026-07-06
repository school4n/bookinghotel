import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


const TRIP_BLUE = "#2b56cc"; 
const TEXT_DARK = "#333";
const TEXT_GREY = "#666";

const SearchWidget = ({ isMobile }) => {
    const navigate = useNavigate();
    const location = useLocation();


    const getToday = () => new Date().toISOString().split('T')[0];
    const getTomorrow = (fromDateStr) => {
        const d = fromDateStr ? new Date(fromDateStr) : new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    const [filters, setFilters] = useState({
        checkIn: getToday(),
        checkOut: getTomorrow(),
        adults: 1,
        children: 0,
        maxPrice: "", 
    });


    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.has("checkIn")) {
            const checkIn = params.get("checkIn");
            setFilters(prev => ({
                ...prev,
                checkIn: checkIn || getToday(),
                checkOut: params.get("checkOut") || getTomorrow(checkIn),
                maxPrice: params.get("maxPrice") || "",
                adults: parseInt(params.get("adults")) || 1,
                children: parseInt(params.get("children")) || 0
            }));
        }
    }, [location.search]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            

            if (name === "checkIn") {
                const checkInDate = new Date(value);
                const checkOutDate = new Date(newFilters.checkOut);
                if (checkInDate >= checkOutDate) {
                    newFilters.checkOut = getTomorrow(value);
                }
            }
            return newFilters;
        });
    };


    const handleSearch = () => {

        if (new Date(filters.checkIn) >= new Date(filters.checkOut)) {
            alert("Lỗi: Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày!");
            return;
        }

        const params = new URLSearchParams();
        

        params.set("checkIn", filters.checkIn);
        params.set("checkOut", filters.checkOut);
        
   
        if (filters.maxPrice) {
            params.set("maxPrice", filters.maxPrice);
        }


        const totalGuests = parseInt(filters.adults) + parseInt(filters.children);
        params.set("guests", totalGuests);
        
        // Giữ lại các param lẻ để trang /rooms có thể hiển thị lại đúng số lượng trên UI
        params.set("adults", filters.adults);
        params.set("children", filters.children);

        // Chuyển hướng sang trang danh sách kèm bộ tham số chuẩn
        navigate(`/rooms?${params.toString()}`);
    };

    const s = {
        wrapper: {
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            padding: isMobile ? "20px" : "10px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "stretch",
            gap: isMobile ? "15px" : "0",
            maxWidth: "1150px",
            margin: "0 auto",
            boxSizing: "border-box",
        },
        group: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: isMobile ? "0" : "0 20px",
            borderRight: isMobile ? "none" : "1px solid #eee",
            borderBottom: isMobile ? "1px solid #f5f5f5" : "none",
            paddingBottom: isMobile ? "12px" : "0",
            boxSizing: "border-box",
        },
        label: {
            fontSize: "0.75rem",
            fontWeight: "bold",
            color: TEXT_GREY,
            marginBottom: "6px",
            textTransform: "uppercase",
            display: "block"
        },
        button: {
            backgroundColor: TRIP_BLUE,
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: isMobile ? "16px" : "0 45px",
            height: isMobile ? "auto" : "65px",
            fontWeight: "bold",
            fontSize: "1.1rem",
            cursor: "pointer",
            marginLeft: isMobile ? "0" : "10px",
            transition: "all 0.3s ease",
            boxShadow: isMobile ? "0 4px 12px rgba(43, 86, 204, 0.2)" : "none"
        }
    };

    return (
        <div style={s.wrapper}>
            <div style={s.group}>
                <label style={s.label}>📅 1. Nhận phòng</label>
                <input 
                    type="date" name="checkIn" min={getToday()} 
                    value={filters.checkIn} onChange={handleChange} 
                    style={styles.inputCustom} 
                />
            </div>
            
            <div style={s.group}>
                <label style={s.label}>📅 1. Trả phòng</label>
                <input 
                    type="date" name="checkOut" min={getTomorrow(filters.checkIn)} 
                    value={filters.checkOut} onChange={handleChange} 
                    style={styles.inputCustom} 
                />
            </div>

            <div style={s.group}>
                <label style={s.label}>💰 2. Ngân sách tối đa</label>
                <select name="maxPrice" value={filters.maxPrice} onChange={handleChange} style={styles.selectInput}>
                    <option value="">Tất cả mức giá</option>
                    <option value="500000">Dưới 500.000đ</option>
                    <option value="1000000">Dưới 1.000.000đ</option>
                    <option value="2000000">Dưới 2.000.000đ</option>
                    <option value="5000000">Dưới 5.000.000đ</option>
                </select>
            </div>

            <div style={{...s.group, borderRight: "none", borderBottom: "none"}}>
                <label style={s.label}>👥 3. Số lượng khách</label>
                <div style={{display: 'flex', alignItems: 'center'}}>
                    <select name="adults" value={filters.adults} onChange={handleChange} style={styles.selectGuest}>
                        {[...Array(10)].map((_, i) => <option key={i} value={i+1}>{i+1} Lớn</option>)}
                    </select>
                    <span style={{margin: '0 8px', color: '#ccc'}}>+</span>
                    <select name="children" value={filters.children} onChange={handleChange} style={styles.selectGuest}>
                         {[...Array(6)].map((_, i) => <option key={i} value={i}>{i} Trẻ em</option>)}
                    </select>
                </div>
            </div>

            <button 
                onClick={handleSearch} 
                style={s.button}
                onMouseOver={(e) => e.target.style.backgroundColor = "#1a3a8f"}
                onMouseOut={(e) => e.target.style.backgroundColor = TRIP_BLUE}
            >
                {isMobile ? "TÌM PHÒNG NGAY" : "TÌM KIẾM"}
            </button>
        </div>
    );
};

const styles = {
    inputCustom: {
        border: "none",
        outline: "none",
        fontSize: "1rem",
        fontWeight: "600",
        color: "#333",
        width: "100%",
        backgroundColor: "transparent",
        fontFamily: "inherit",
        cursor: "pointer"
    },
    selectInput: {
        border: "none",
        outline: "none",
        fontSize: "1rem",
        fontWeight: "600",
        color: "#333",
        width: "100%",
        backgroundColor: "transparent",
        cursor: "pointer",
        padding: "4px 0"
    },
    selectGuest: {
        border: "none",
        outline: "none",
        fontSize: "1rem",
        fontWeight: "600",
        color: "#333",
        backgroundColor: "transparent",
        cursor: "pointer",
        width: 'auto'
    }
}

export default SearchWidget;