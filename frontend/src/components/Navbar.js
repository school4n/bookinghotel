import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// 🎨 MÀU SẮC THEO PHONG CÁCH TRIP.COM
const TRIP_BLUE = "#2b56cc"; 
const TRIP_ORANGE = "#ff9500"; 
const TEXT_WHITE = "#ffffff";
const HOVER_BG = "rgba(255, 255, 255, 0.1)"; 

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    
    // --- STATE CHO MOBILE ---
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
    const [menuOpen, setMenuOpen] = useState(false); 

    const checkAuthStatus = () => {
        const storedUsername = localStorage.getItem('username'); 
        if (storedUsername) setUser({ username: storedUsername });
        else setUser(null);
    };

    useEffect(() => {
        checkAuthStatus();
        window.addEventListener('auth-change', checkAuthStatus);
        
        const handleResize = () => {
            const mobile = window.innerWidth < 992;
            setIsMobile(mobile);
            if (!mobile) setMenuOpen(false); 
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('auth-change', checkAuthStatus);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        setUser(null);
        setMenuOpen(false);
        alert("Đã đăng xuất thành công!");
        navigate('/login'); 
    };

    // 🎨 STYLES OBJECT
    const styles = {
        navbarContainer: {
            backgroundColor: TRIP_BLUE,
            padding: isMobile ? '10px 20px' : '0 40px', 
            height: isMobile ? '60px' : '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },

        logoLink: {
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            fontSize: '24px',
            fontWeight: '800',
            color: TEXT_WHITE,
            letterSpacing: '-0.5px',
        },
        logoDot: {
            color: TRIP_ORANGE,
            fontSize: '30px',
            lineHeight: '0',
            marginLeft: '2px',
            marginBottom: '5px'
        },

        navWrapper: {
            display: isMobile ? (menuOpen ? 'flex' : 'none') : 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            position: isMobile ? 'absolute' : 'static',
            top: isMobile ? '60px' : 'auto',
            left: 0,
            width: isMobile ? '100%' : '100%',
            backgroundColor: isMobile ? TRIP_BLUE : 'transparent',
            padding: isMobile ? '0' : '0', // Fix padding wrapper
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between', 
            boxShadow: isMobile ? '0 10px 20px rgba(0,0,0,0.2)' : 'none',
        },

        navLinksLeft: {
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            listStyle: 'none',
            gap: isMobile ? '0' : '10px',
            margin: 0,
            padding: 0,
            width: isMobile ? '100%' : 'auto',
        },
        
        navLinksRight: {
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            listStyle: 'none',
            gap: isMobile ? '15px' : '15px',
            margin: isMobile ? '0' : '0',
            padding: 0,
            alignItems: isMobile ? 'flex-start' : 'center', // Mobile căn trái
            width: isMobile ? '100%' : 'auto',
        },

        linkItem: {
            textDecoration: 'none',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '15px',
            fontWeight: '600',
            // 🛠️ FIX: Padding thống nhất 15px 20px cho cả mobile
            padding: isMobile ? '15px 20px' : '10px 15px',
            borderRadius: isMobile ? '0' : '20px',
            transition: 'all 0.2s ease',
            display: 'block',
            width: isMobile ? '100%' : 'auto',
            borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none',
            boxSizing: 'border-box', // Đảm bảo padding không làm vỡ layout
        },

        authButton: {
            backgroundColor: TEXT_WHITE,
            color: TRIP_BLUE,
            padding: '8px 16px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'opacity 0.3s',
            whiteSpace: 'nowrap',
            display: isMobile ? 'block' : 'inline-block',
            textAlign: 'center',
            margin: isMobile ? '20px' : '0', // Mobile có margin riêng
            width: isMobile ? 'calc(100% - 40px)' : 'auto',
        },

        hamburger: {
            display: isMobile ? 'block' : 'none',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            padding: '5px',
        },
        
        activeBorder: {
            position: 'absolute',
            bottom: isMobile ? '0' : '5px',
            left: isMobile ? '0' : '15px',
            width: isMobile ? '4px' : 'calc(100% - 30px)',
            height: isMobile ? '100%' : '2px',
            backgroundColor: 'white',
        },

        // 🛠️ STYLE MỚI CHO USER GREETING TRÊN MOBILE
        userGreetingText: {
            color: 'white', 
            fontWeight: 'bold', 
            // Fix Padding giống hệt Link Item (15px 20px)
            padding: isMobile ? '15px 20px' : '0', 
            fontSize: '15px',
            width: isMobile ? '100%' : 'auto',
            display: 'block',
            boxSizing: 'border-box',
            // Thêm đường kẻ trên đầu để tách biệt với menu trên
            borderTop: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none',
            marginTop: isMobile ? '10px' : '0',
        }
    };

    const NavLink = ({ to, label, isAction = false }) => {
        const isActive = location.pathname === to;
        
        if (isAction) {
            return (
                <Link 
                    to={to} 
                    style={styles.authButton}
                    onClick={() => setMenuOpen(false)}
                >
                    {label}
                </Link>
            );
        }

        return (
            <Link 
                to={to} 
                style={{
                    ...styles.linkItem,
                    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.8)',
                }}
                onClick={() => setMenuOpen(false)}
            >
                {label}
                {isActive && <div style={styles.activeBorder}></div>}
            </Link>
        );
    };

    return (
        <nav style={styles.navbarContainer}>
            <Link to="/" style={styles.logoLink}>
                HotelBooking<span style={styles.logoDot}>.</span>online
            </Link>

            <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? '✕' : '☰'}
            </button>

            <div style={styles.navWrapper}>
                <ul style={styles.navLinksLeft}>
                    <li><NavLink to="/rooms" label="Khách sạn & Chỗ nghỉ" /></li>
                    <li><NavLink to="/bookings" label="Lịch sử đặt phòng" /></li>
                    <li><NavLink to="/about" label="Giới thiệu" /></li>
                    <li><NavLink to="/welcome" label="Cảm Dứng Du Lịch" /></li>
                </ul>

                <ul style={styles.navLinksRight}>
                    <li style={{display: isMobile ? 'none' : 'block'}}>
                        <a href="/support" style={{...styles.linkItem, fontSize: '14px'}}>Hỗ trợ</a>
                    </li>

                    {user ? (
                        <li style={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row', 
                            alignItems: isMobile ? 'flex-start' : 'center', // Mobile căn trái
                            gap: isMobile ? '0' : '10px', // Bỏ gap trên mobile vì đã có padding
                            width: isMobile ? '100%' : 'auto'
                        }}>
                            {/* 🛠️ FIX TEXT HIỂN THỊ */}
                            <span style={styles.userGreetingText}>
                                Hi, {user.username}
                            </span>
                            
                            <button 
                                onClick={handleLogout}
                                style={{
                                    ...styles.authButton, 
                                    backgroundColor: 'rgba(255,255,255,0.2)', 
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    // Mobile: Cách chữ Hi 1 chút, margin 2 bên 20px
                                    marginTop: isMobile ? '0' : '0',
                                    marginBottom: isMobile ? '20px' : '0'
                                }}
                            >
                                Đăng xuất
                            </button>
                        </li>
                    ) : (
                        <li style={{width: isMobile ? '100%' : 'auto'}}>
                            <NavLink to="/login" label="Đăng Nhập / Đăng Ký" isAction={true} />
                        </li>
                    )}
                </ul>
            </div>
        </nav>
    );
}

export default Navbar;