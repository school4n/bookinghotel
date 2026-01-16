import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosClient from "../api/config"; 
import emailjs from '@emailjs/browser'; 

// 🎨 CẬP NHẬT ĐỊNH NGHĨA STYLE MÀU XANH
const ROYAL_COLOR = "#f3c300"; // Màu vàng nhấn
const DARK_BLUE_BG = "#2b50d8"; // Màu xanh dương chủ đạo (khớp với ảnh bạn gửi)
const LIGHT_BG = "#f0f2f5"; 
const INPUT_LIGHT_BG = "#e8f0fe"; // Màu nền input xanh nhạt khi focus
const TEXT_WHITE = "#ffffff";

const styles = {
    pageContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: LIGHT_BG,
        fontFamily: "'Inter', serif",
    },
    formContainer: {
        width: '100%',
        maxWidth: '450px',
        padding: '40px',
        backgroundColor: DARK_BLUE_BG, // 🔵 Thay đổi từ DARK_BG sang xanh dương
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
        marginBottom: '18px',
        textAlign: 'left',
    },
    label: {
        color: TEXT_WHITE, // ⚪ Chuyển nhãn sang màu trắng để nổi bật trên nền xanh
        display: 'block',
        marginBottom: '8px',
        fontSize: '0.85rem',
        fontWeight: '600'
    },
    inputStyle: {
        width: '100%',
        padding: '12px 15px',
        borderRadius: '8px',
        border: 'none', // Bỏ viền để trông hiện đại hơn
        backgroundColor: "rgba(255, 255, 255, 0.9)", // ⚪ Nền trắng mờ cho input
        color: "#333", // Chữ trong input màu tối để dễ đọc
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
        fontSize: '1rem',
        marginTop: '15px',
        marginLeft: '0px',
        marginRight: '0px',
        marginBottom: '0px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    linkText: {
        marginTop: '25px',
        color: TEXT_WHITE, // ⚪ Link màu trắng
        fontSize: '0.9rem'
    },
    errorText: {
        color: '#ffdad6', // Màu đỏ nhạt để dễ đọc trên nền xanh
        marginTop: '15px',
        fontSize: '0.9rem'
    }
};

function Register() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ✅ Khởi tạo EmailJS với Public Key của bạn
    useEffect(() => {
        emailjs.init("seajRlYP6YCpKbOZQ");
    }, []);

    const sendWelcomeEmail = (targetEmail, targetName) => {
        // ✅ Cấu trúc data gửi đi khớp 100% với {{name}} và {{email}} trong Template của bạn
        const templateParams = {
            name: targetName,  
            email: targetEmail 
        };

        emailjs.send(
            'service_iyu6lx9', 
            'template_vx7buky', // ✅ Đã cập nhật Template ID mới từ ảnh của bạn
            templateParams
        )
        .then((res) => {
            console.log("SUCCESS! Email chào mừng đã gửi.", res.status, res.text);
        })
        .catch((err) => {
            console.error("FAILED... Lỗi gửi email:", err);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password || !email) {
            setError("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);

        try {
            // 1. Gửi yêu cầu đăng ký lên Server Backend
            const response = await axiosClient.post("/auth/register", { username, password, email });

            // 2. Lưu thông tin xác thực
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', response.data.userId);
            localStorage.setItem('username', response.data.username);

            // 3. Kích hoạt gửi email tự động
            sendWelcomeEmail(email, username);

            window.dispatchEvent(new Event('auth-change'));
            alert("Đăng ký thành công! Hãy kiểm tra hòm thư chào mừng của bạn.");
            navigate('/'); 

        } catch (err) {
            const errorMessage = err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.pageContainer}>
            <div style={styles.formContainer}>
                <h2 style={styles.heading}>Đăng Ký Thành Viên</h2>
                
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tên đăng nhập</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            style={styles.inputStyle}
                            required
                        />
                    </div>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Địa chỉ Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@gmail.com"
                            style={styles.inputStyle}
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={styles.inputStyle}
                            required
                        />
                    </div>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            style={styles.inputStyle}
                            required
                        />
                    </div>
                    
                    {error && <p style={styles.errorText}>{error}</p>}

                    <button
                        type="submit"
                        style={styles.buttonStyle}
                        disabled={loading}
                    >
                        {loading ? 'Đang xử lý...' : 'ĐĂNG KÝ NGAY'}
                    </button>
                </form>

                <p style={styles.linkText}>
                    Bạn đã có tài khoản?{' '}
                    <Link to="/login" style={{ color: ROYAL_COLOR, textDecoration: 'none', fontWeight: 'bold' }}>
                        Đăng nhập
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;