import React from 'react';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebookMessenger } from 'react-icons/fa';

// 🎨 ĐỊNH NGHĨA MÀU SẮC ĐỒNG NHẤT
const ROYAL_COLOR = "#f3c300";
const DARK_BG = "#0f172a";
const LIGHT_BG = "#f8fafc";

const HotelSupport = () => {
    const contactInfo = [
        { 
            icon: <FaPhoneAlt />, 
            label: "Hotline đặt phòng", 
            value: "090 123 4567", 
            sub: "Hỗ trợ 24/7 (Cả ngày lễ)" 
        },
        { 
            icon: <FaEnvelope />, 
            label: "Email hỗ trợ", 
            value: "support@hotelbooking.online", 
            sub: "Phản hồi trong vòng 24 giờ" 
        },
        { 
            icon: <FaMapMarkerAlt />, 
            label: "Địa chỉ khách sạn", 
            value: "Trung tâm Quận 1, TP. Hồ Chí Minh", // Lấy từ thông tin hệ thống
            sub: "Vị trí đắc địa, gần chợ Bến Thành" 
        },
        { 
            icon: <FaClock />, 
            label: "Giờ làm việc lễ tân", 
            value: "Mở cửa 24/24", 
            sub: "Nhận phòng: 14:00 | Trả phòng: 12:00" 
        }
    ];

    const styles = {
        page: { padding: '60px 20px', backgroundColor: LIGHT_BG, minHeight: '100vh', fontFamily: 'serif' },
        container: { maxWidth: '900px', margin: '0 auto' },
        header: { textAlign: 'center', marginBottom: '50px' },
        title: { fontSize: '2.5rem', color: DARK_BG, margin: '0 0 10px 0' },
        underline: { width: '80px', height: '4px', backgroundColor: ROYAL_COLOR, margin: '0 auto' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginTop: '40px' },
        card: { 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '15px', 
            textAlign: 'center', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #eef2f6'
        },
        iconBox: { 
            fontSize: '2rem', 
            color: ROYAL_COLOR, 
            backgroundColor: DARK_BG, 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 20px' 
        },
        label: { fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' },
        value: { fontSize: '1.2rem', color: DARK_BG, fontWeight: 'bold', marginBottom: '5px' },
        sub: { fontSize: '0.85rem', color: '#94a3b8' },
        btnMessenger: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            backgroundColor: '#0084FF',
            color: 'white',
            padding: '15px 30px',
            borderRadius: '30px',
            textDecoration: 'none',
            fontWeight: 'bold',
            margin: '50px auto 0',
            width: 'fit-content',
            boxShadow: '0 4px 15px rgba(0,132,255,0.3)'
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Trung Tâm Hỗ Trợ</h1>
                    <div style={styles.underline}></div>
                    <p style={{ marginTop: '20px', color: '#64748b' }}>Chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn</p>
                </div>

                <div style={styles.grid}>
                    {contactInfo.map((item, index) => (
                        <div key={index} style={styles.card}>
                            <div style={styles.iconBox}>{item.icon}</div>
                            <div style={styles.label}>{item.label}</div>
                            <div style={styles.value}>{item.value}</div>
                            <div style={styles.sub}>{item.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Nút liên kết nhanh qua Messenger */}
                <a href="https://m.me/yourpage" target="_blank" rel="noreferrer" style={styles.btnMessenger}>
                    <FaFacebookMessenger size={20} /> NHẮN TIN QUA MESSENGER
                </a>
            </div>
        </div>
    );
};

export default HotelSupport;