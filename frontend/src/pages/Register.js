import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosClient from "../api/config"; 
import emailjs from '@emailjs/browser'; 

// 🎨 CÁC ĐỊNH NGHĨA STYLE (Giữ nguyên như cũ)
const ROYAL_COLOR = "#f3c300"; 
const DARK_BLUE_BG = "#2b50d8"; 
const LIGHT_BG = "#f0f2f5"; 
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
        marginBottom: '18px',
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
        fontSize: '1rem',
        marginTop: '15px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    linkText: {
        marginTop: '25px',
        color: TEXT_WHITE,
        fontSize: '0.9rem'
    },
    errorText: {
        color: '#ffdad6',
        marginTop: '15px',
        fontSize: '0.9rem'
    }
};

function Register() {
    const navigate = useNavigate();
    
    // ✅ 1. Thêm state cho Name và Phone
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');     // Thêm state Họ tên
    const [phone, setPhone] = useState('');   // Thêm state SĐT
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        emailjs.init("seajRlYP6YCpKbOZQ");
    }, []);

    const sendWelcomeEmail = (targetEmail, targetName) => {
        const templateParams = {
            name: targetName,  
            email: targetEmail 
        };

        emailjs.send(
            'service_iyu6lx9', 
            'template_vx7buky', 
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

        // ✅ Kiểm tra nhập đủ thông tin (bao gồm name và phone)
        if (!username || !password || !email || !name || !phone) {
            setError("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);

        try {
           
            const response = await axiosClient.post("/auth/register", { 
                username, 
                password, 
                email,
                name: name,   
                phone: phone  
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', response.data.userId);
            localStorage.setItem('username', response.data.username);

           
            sendWelcomeEmail(email, name);

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
                    
                    {/* ✅ 3. Thêm ô nhập Họ và Tên */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Họ và Tên</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nguyễn Văn A"
                            style={styles.inputStyle}
                            required
                        />
                    </div>

                    {/* ✅ 4. Thêm ô nhập Số điện thoại */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Số điện thoại</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="09xx..."
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