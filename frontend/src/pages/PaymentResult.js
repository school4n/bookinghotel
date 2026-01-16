import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/config';
import emailjs from '@emailjs/browser';
import { FaCheckCircle, FaTimesCircle, FaHistory, FaHome } from 'react-icons/fa';

function PaymentResult() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("loading"); // loading | success | fail
    const [message, setMessage] = useState("Đang xử lý kết quả thanh toán...");
    const [bookingData, setBookingData] = useState(null);
    
    // Dùng ref để đảm bảo logic chỉ chạy 1 lần
    const hasRun = useRef(false);

    // === CẤU HÌNH EMAILJS ===
    const EMAIL_SERVICE_ID = "service_iyu6lx9";
    const EMAIL_TEMPLATE_ID = "template_9w1gpjo";
    // 👇 KHAI BÁO KEY TẠI ĐÂY ĐỂ DÙNG TRỰC TIẾP
    const EMAIL_PUBLIC_KEY = "seajRlYP6YCpKbOZQ"; 

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const verifyPayment = async () => {
            const params = Object.fromEntries([...searchParams]);
            
            try {
                // 1. Gọi Backend để kiểm tra tính hợp lệ
                const res = await axiosClient.get('/vnpay_return', { params });

                if (res.data.code === '00') {
                    // === THÀNH CÔNG ===
                    const orderId = params.vnp_TxnRef;

                    // 2. Lấy chi tiết đơn hàng
                    try {
                        const bookingRes = await axiosClient.get(`/bookings/${orderId}`);
                        const bookingInfo = bookingRes.data;
                        
                        setBookingData(bookingInfo);
                        setStatus("success");
                        setMessage("Thanh toán thành công!");

                        // 3. Gửi Email (Truyền thông tin vào hàm)
                        sendSuccessEmail(bookingInfo, orderId, params.vnp_Amount);
                    } catch (err) {
                        console.error("Lỗi lấy thông tin đơn hàng để gửi mail:", err);
                        setStatus("success");
                        setMessage("Thanh toán thành công (nhưng lỗi hệ thống gửi mail).");
                    }

                } else {
                    // === THẤT BẠI ===
                    setStatus("fail");
                    setMessage("Giao dịch thất bại hoặc bị hủy.");
                }

            } catch (err) {
                console.error("Lỗi kết nối:", err);
                setStatus("fail");
                setMessage("Lỗi kết nối tới server xác thực.");
            }
        };

        verifyPayment();
    }, [searchParams]);

    const sendSuccessEmail = (info, orderId, amountVNP) => {
        const realAmount = amountVNP ? parseInt(amountVNP) / 100 : 0;
        
        // Kiểm tra xem trường email tên là 'client_email' hay 'email'
        const targetEmail = info.client_email || info.email;

        if (!targetEmail) {
            console.error("❌ Không tìm thấy email khách hàng:", info);
            return;
        }

        const templateParams = {
            email: targetEmail, 
            name: info.client_name,
            order_id: orderId,
            booking_id: orderId,
            room_id: info.room_name,
            check_in_date: new Date(info.check_in_date).toLocaleDateString('vi-VN'),
            check_out_date: new Date(info.check_out_date).toLocaleDateString('vi-VN'),
            client_phone: info.client_phone,
            total_price: realAmount.toLocaleString('vi-VN')
        };

        console.log("🚀 Đang gửi mail tại PaymentResult...", templateParams);

        // 👇 QUAN TRỌNG: Truyền EMAIL_PUBLIC_KEY làm tham số thứ 4
        // Việc này thay thế hoàn toàn cho emailjs.init()
        emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, EMAIL_PUBLIC_KEY)
            .then(() => {
                console.log("✅ Email xác nhận đã được gửi thành công!");
            })
            .catch((error) => {
                console.error("❌ Gửi email thất bại:", error);
            });
    };

    // --- GIAO DIỆN ---
    const styles = {
        container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px', fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc' },
        card: { backgroundColor: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px', width: '100%' },
        iconSuccess: { color: '#059669', fontSize: '4rem', marginBottom: '20px' },
        iconFail: { color: '#ef4444', fontSize: '4rem', marginBottom: '20px' },
        title: { fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' },
        text: { color: '#64748b', marginBottom: '30px' },
        btnGroup: { display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' },
        btnPrimary: { backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
        btnSecondary: { backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }
    };

    if (status === "loading") {
        return (
            <div style={styles.container}>
                <h2>⏳ Đang xử lý kết quả...</h2>
                <p>Vui lòng không tắt trình duyệt.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {status === "success" ? (
                    <>
                        <FaCheckCircle style={styles.iconSuccess} />
                        <h2 style={styles.title}>Thanh toán Thành công!</h2>
                        <p style={styles.text}>
                            Cảm ơn bạn đã đặt phòng. Mã đơn hàng của bạn là <strong>#{searchParams.get('vnp_TxnRef')}</strong>.
                            <br/>Email xác nhận đã được gửi đến hộp thư của bạn.
                        </p>
                        <div style={styles.btnGroup}>
                            <button style={styles.btnSecondary} onClick={() => navigate('/')}>
                                <FaHome /> Trang chủ
                            </button>
                            <button style={styles.btnPrimary} onClick={() => navigate('/bookings')}>
                                <FaHistory /> Xem lịch sử đặt
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <FaTimesCircle style={styles.iconFail} />
                        <h2 style={styles.title}>Thanh toán Thất bại</h2>
                        <p style={styles.text}>{message}</p>
                        <div style={styles.btnGroup}>
                            <button style={styles.btnPrimary} onClick={() => navigate('/cart')}>
                                Thử lại
                            </button>
                            <button style={styles.btnSecondary} onClick={() => navigate('/')}>
                                Về trang chủ
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PaymentResult;