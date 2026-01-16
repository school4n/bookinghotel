import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa'; // Thêm FaSignOutAlt

// Dữ liệu menu (Giữ nguyên)
const adminMenuItems = [
    { title: 'Thống Kê', path: '/admin/dashboard', icon: '📊' },
    { 
        title: 'Đặt Phòng', 
        icon: '🏨',
        children: [
            { title: 'Phòng Mới Đặt', path: '/admin/bookings/new' },
            { title: 'Xác Nhận Thanh Toán', path: '/admin/bookings/payment' },
            { title: 'Hồ Sơ Đặt Phòng', path: '/admin/bookings/history' },
        ]
    },
    { title: 'Khách Hàng', path: '/admin/users', icon: '🧑' },
    { title: 'Đánh Giá', path: '/admin/reviews', icon: '⭐' },
    { title: 'Phòng', path: '/admin/rooms', icon: '🚪' },
    { title: 'Cơ Sở và Trang Thiết Bị', path: '/admin/facilities', icon: '🛠️' },
];

const AdminSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
    const [isOpen, setIsOpen] = useState(false); 
    const [isLogoutHovered, setIsLogoutHovered] = useState(false); // State hover cho nút đăng xuất

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 992;
            setIsMobile(mobile);
            if (!mobile) setIsOpen(true); 
            else setIsOpen(false); 
        };
        handleResize(); 
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isBookingDropdownOpen, setIsBookingDropdownOpen] = useState(
        adminMenuItems.some(item => 
            item.children && item.children.some(child => child.path === currentPath)
        )
    );
    const [hoveredItem, setHoveredItem] = useState(null);
    const [hoveredChildItem, setHoveredChildItem] = useState(null);

    const toggleBookingDropdown = (title) => {
        if (title === 'Đặt Phòng') {
            setIsBookingDropdownOpen(!isBookingDropdownOpen);
        }
    };
    
    const handleNavigation = (path) => {
        navigate(path);
        if (isMobile) setIsOpen(false); 
    };

    // Hàm xử lý đăng xuất
    const handleLogout = () => {
        if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
            // Xóa token hoặc thông tin user trong localStorage/sessionStorage
            localStorage.removeItem('token'); 
            localStorage.removeItem('user');
            
            // Điều hướng về trang login
            navigate('/admin/login');
        }
    };

    const styles = {
        // ... (Giữ các style cũ của bạn)
        mobileToggleBtn: {
            display: isMobile ? 'flex' : 'none',
            position: 'fixed',
            top: '15px',
            left: '15px',
            zIndex: 2000, 
            backgroundColor: '#212529',
            color: 'white',
            border: 'none',
            padding: '10px',
            borderRadius: '5px',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
        },
        overlay: {
            display: isMobile && isOpen ? 'block' : 'none',
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
        },
        sidebar: {
            width: '250px',
            backgroundColor: '#212529',
            color: '#f8f9fa',
            height: '100vh',
            padding: '0 0 10px 0',
            fontFamily: 'Arial, sans-serif',
            position: 'fixed',
            left: 0,
            top: 0,
            boxShadow: '2px 0 5px rgba(0,0,0,0.5)',
            zIndex: 1000,
            transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 0.3s ease-in-out',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
        },
        header: {
            padding: '20px',
            borderBottom: '1px solid #495057',
            marginTop: isMobile ? '40px' : '0',
            flexShrink: 0,
        },
        hotelName: { fontSize: '22px', fontWeight: 'bold', marginBottom: '5px', cursor: 'pointer' },
        adminTitle: { fontSize: '16px', color: '#adb5bd', fontWeight: 'normal', letterSpacing: '2px' },
        
        menuContainer: { 
            paddingTop: '10px',
            flexGrow: 1, 
            display: 'flex',
            flexDirection: 'column',
        },
        
        menuItem: {
            base: { padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative', transition: 'all 0.2s' },
            hover: { backgroundColor: '#343a40' }
        },
        icon: { marginRight: '10px' },
        dropdownArrow: { position: 'absolute', right: '20px', fontSize: '10px' },
        dropdown: { backgroundColor: '#1a1d20' },
        dropdownItem: {
            base: { padding: '10px 20px 10px 40px', cursor: 'pointer', transition: 'all 0.2s' },
            selected: { backgroundColor: '#007bff', color: 'white', fontWeight: 'bold' },
            hover: { backgroundColor: '#0056b3' }
        },

        // Style mới cho nút Đăng xuất
        logoutSection: {
            borderTop: '1px solid #495057',
            padding: '10px 0',
            marginTop: 'auto', // Đẩy xuống cuối cùng
            flexShrink: 0
        },
        logoutBtn: {
            padding: '15px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#ff4d4d', // Màu đỏ nhẹ cho nút đăng xuất
            transition: 'all 0.2s',
            fontWeight: '500',
            backgroundColor: isLogoutHovered ? '#dc3545' : 'transparent',
            color: isLogoutHovered ? 'white' : '#ff4d4d',
        }
    };

    return (
        <>
            <button style={styles.mobileToggleBtn} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>

            <div style={styles.overlay} onClick={() => setIsOpen(false)}></div>

            <div style={styles.sidebar}>
                <div style={styles.header}>
                    <h1 style={styles.hotelName} onClick={() => handleNavigation('/admin/dashboard')}>
                        ThaiTruongAnn Hotel
                    </h1>
                    <h2 style={styles.adminTitle}>ADMIN PANEL</h2>
                </div>
                
                <div style={styles.menuContainer}>
                    {adminMenuItems.map((item) => {
                        const isItemActive = item.path === currentPath;
                        const isHovered = hoveredItem === item.title;

                        return (
                            <React.Fragment key={item.title}>
                                <div
                                    style={{
                                        ...styles.menuItem.base,
                                        ...(isItemActive && !item.children ? styles.dropdownItem.selected : {}), 
                                        ...(!isItemActive && isHovered ? styles.menuItem.hover : {})
                                    }}
                                    onClick={() => {
                                        toggleBookingDropdown(item.title);
                                        if (!item.children) {
                                            handleNavigation(item.path);
                                        }
                                    }}
                                    onMouseEnter={() => setHoveredItem(item.title)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    {item.icon && <span style={styles.icon}>{item.icon}</span>}
                                    <span>{item.title}</span>
                                    {item.children && <span style={styles.dropdownArrow}>{isBookingDropdownOpen ? '▲' : '▼'}</span>}
                                </div>

                                {item.children && isBookingDropdownOpen && item.title === 'Đặt Phòng' && (
                                    <div style={styles.dropdown}>
                                        {item.children.map((child) => {
                                            const isSelected = child.path === currentPath;
                                            const isChildHovered = hoveredChildItem === child.title;

                                            return (
                                                <div
                                                    key={child.title}
                                                    style={{
                                                        ...styles.dropdownItem.base,
                                                        ...(isSelected ? styles.dropdownItem.selected : {}),
                                                        ...(!isSelected && isChildHovered ? styles.dropdownItem.hover : {})
                                                    }}
                                                    onClick={() => handleNavigation(child.path)}
                                                    onMouseEnter={() => setHoveredChildItem(child.title)}
                                                    onMouseLeave={() => setHoveredChildItem(null)}
                                                >
                                                    {child.title}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* NÚT ĐĂNG XUẤT NẰM Ở ĐÂY */}
                <div style={styles.logoutSection}>
                    <div 
                        style={styles.logoutBtn}
                        onClick={handleLogout}
                        onMouseEnter={() => setIsLogoutHovered(true)}
                        onMouseLeave={() => setIsLogoutHovered(false)}
                    >
                        <FaSignOutAlt style={{ marginRight: '10px' }} />
                        <span>Đăng xuất</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminSidebar;