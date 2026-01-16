import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosClient from "../api/config"; 

// 🎨 ĐỊNH NGHĨA STYLE ĐỒNG NHẤT VỚI HỆ THỐNG
const ROYAL_COLOR = "#f3c300"; // Màu vàng nhấn
const DARK_BLUE_BG = "#2b50d8"; // Màu xanh dương chủ đạo
const LIGHT_BG = "#f0f2f5"; 
const TEXT_WHITE = "#ffffff";

const styles = {
    pageContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: LIGHT_BG,
        fontFamily: "'Inter', sans-serif",
    },
    formContainer: {
        width: '100%',
        maxWidth: '450px',
        padding: '40px',
        backgroundColor: DARK_BLUE_BG,
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        textAlign: 'center',
    },
    heading: {
        color: ROYAL_COLOR,
        marginBottom: '25px',
        fontSize: '1.8rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    formGroup: {
        marginBottom: '20px',
        textAlign: 'left',
    },
    label: {
        color: TEXT_WHITE,
        display: 'block',
        marginBottom: '8px',
        fontSize: '0.85rem',
        fontWeight: '600'
    },
    inputStyle: {
        width: '100%',
        padding: '12px 15px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        color: "#333",
        fontSize: '1rem',
        boxSizing: 'border-box',
        outline: 'none',
    },
    buttonStyle: {
        width: '100%',
        padding: '14px',
        backgroundColor: ROYAL_COLOR,
        color: "#000",
        border: 'none',
        borderRadius: '8px',
        fontWeight: '800',
        cursor: 'pointer',
        fontSize: '1.1rem',
        marginTop: '10px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    linkText: {
        marginTop: '20px',
        color: TEXT_WHITE,
    },
    errorText: {
        color: '#ffdad6',
        marginTop: '15px',
        fontSize: '0.9rem'
    },
};

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError("Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.");
            return;
        }

        setLoading(true);

        try {
            // Gửi yêu cầu đăng nhập tới Backend
            const response = await axiosClient.post("/auth/login", { username, password });

            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', response.data.userId);
            localStorage.setItem('username', response.data.username); 
            
            
            localStorage.setItem('email', response.data.email || ""); 

            // Thông báo cho toàn hệ thống về sự thay đổi trạng thái đăng nhập
            window.dispatchEvent(new Event('auth-change')); 
            
            alert("Đăng nhập thành công!");
            navigate('/'); 

        } catch (err) {
            // Hiển thị lỗi từ Backend (Ví dụ: Tài khoản bị khóa, sai pass...)
            const errorMessage = err.response?.data?.message || "Sai tên đăng nhập hoặc mật khẩu.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.pageContainer}>
            <div style={styles.formContainer}>
                <h2 style={styles.heading}>ĐĂNG NHẬP HỆ THỐNG</h2>
                
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tên đăng nhập</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập tên đăng nhập"
                            style={styles.inputStyle}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            style={styles.inputStyle}
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    {error && <p style={styles.errorText}>{error}</p>}

                    <button
                        type="submit"
                        style={styles.buttonStyle}
                        disabled={loading}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d6ad00'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = ROYAL_COLOR}
                    >
                        {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
                    </button>
                </form>

                <p style={styles.linkText}>
                    Chưa có tài khoản?{' '}
                    <Link to="/register" style={{ color: ROYAL_COLOR, textDecoration: 'none', fontWeight: 'bold' }}>
                        Đăng ký ngay
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;