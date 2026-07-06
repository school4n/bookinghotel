import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/config';
import emailjs from '@emailjs/browser'; 
import { 
    FaCreditCard, FaCheckCircle, FaCalendarAlt, FaUser, 
    FaPhone, FaIdCard, FaArrowRight, FaEnvelope, FaGlobeAsia 
} from 'react-icons/fa';

const COLORS = {
    primary: "#1e293b", accent: "#c5a059", success: "#059669",
    bg: "#f8fafc", textMain: "#1e293b", textMuted: "#64748b",
    white: "#ffffff", border: "#e2e8f0"
};

const calculateNights = (checkInDate, checkOutDate) => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)); 
};

function Cart() {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(2); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutInfo, setCheckoutInfo] = useState({
        name: "", 
        phone: "", 
        email: "", 
        address: "N/A", 
        cccd: "", 
        method: "cash", 
        checkIn: "", 
        checkOut: ""
    });
    const [paymentResult, setPaymentResult] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const styles = {
        container: { padding: isMobile ? "20px 15px" : "60px 20px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif", backgroundColor: COLORS.bg, minHeight: '100vh' },
        heading: { fontSize: isMobile ? "1.75rem" : "2.5rem", color: COLORS.textMain, marginBottom: "40px", fontWeight: "800", textAlign: 'center' },
        checkoutLayout: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: '40px', alignItems: 'start' },
        roomCard: { backgroundColor: COLORS.white, borderRadius: '20px', boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)", overflow: 'hidden', border: `1px solid ${COLORS.border}` },
        roomImage: { width: '100%', height: '240px', objectFit: 'cover' },
        roomInfo: { padding: '24px' },
        priceBadge: { fontSize: '1.4rem', fontWeight: '800', color: COLORS.accent, margin: '8px 0 0 0', display: 'block' },
        formCard: { backgroundColor: COLORS.white, padding: isMobile ? '24px' : '40px', borderRadius: '20px', boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: `1px solid ${COLORS.border}` },
        inputGroup: { marginBottom: '20px' },
        label: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '700', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase' },
        input: { width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fcfcfd', fontSize: '16px', boxSizing: 'border-box', outline: 'none' },
        bankInfoBox: { backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.accent}`, marginTop: '10px' },
        summaryBox: { backgroundColor: '#f1f5f9', padding: '24px', borderRadius: '16px', marginTop: '30px', border: '1px dashed #cbd5e1' },
        btnPrimary: { background: COLORS.primary, color: COLORS.accent, border: 'none', padding: '18px', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '1.1rem', width: '100%', marginTop: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }
    };

    const fetchCartItems = useCallback(async () => {
        if (!token) return navigate('/login');
        try {
            const res = await axiosClient.get('/cart');
            if (res.data.length > 0) {
                const room = res.data[0];
                setCartItems([{ 
                    ...room, 
                    price: room.price_per_night || room.price, 
                    main_image_url: room.main_image_url || room.image 
                }]);
            }
        } catch (err) { 
            console.error("Lỗi lấy giỏ hàng:", err); 
        } finally { 
            setLoading(false); 
        }
    }, [token, navigate]);

    useEffect(() => { fetchCartItems(); }, [fetchCartItems]);

   
    const sendConfirmationEmail = (paymentId, bookingData, roomInfo) => {
        const targetEmail = checkoutInfo.email; 
        if (!targetEmail) return;

        const templateParams = {
            email: targetEmail,            
            name: bookingData.name,         
            order_id: paymentId,          
            booking_id: paymentId,        
            room_id: roomInfo.name,          
            check_in_date: bookingData.checkIn,  
            check_out_date: bookingData.checkOut, 
            client_phone: bookingData.phone,     
            total_price: bookingData.totalPrice.toLocaleString() 
        };

        const EMAIL_PUBLIC_KEY = "seajRlYP6YCpKbOZQ"; 

        console.log("🚀 Đang gửi mail Tiền mặt...", templateParams);

        emailjs.send('service_iyu6lx9', 'template_9w1gpjo', templateParams, EMAIL_PUBLIC_KEY)
            .then((res) => { console.log("✅ EmailJS SUCCESS!", res.status, res.text); })
            .catch((err) => { console.error("❌ EmailJS FAILED...", err); });
    };

    const handleFormChange = (e) => setCheckoutInfo({ ...checkoutInfo, [e.target.name]: e.target.value });

    const nights = calculateNights(checkoutInfo.checkIn, checkoutInfo.checkOut);
    const roomItem = cartItems[0]; 
    const cartTotal = roomItem ? (roomItem.price || 0) * (nights > 0 ? nights : 1) : 0;

    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        const { name, phone, email, cccd, checkIn, checkOut, method } = checkoutInfo;
        
        if (!name || !phone || !email || !cccd || !checkIn || !checkOut) {
            alert("Vui lòng điền đầy đủ Họ tên, SĐT, Email, CCCD và chọn Ngày nhận/trả.");
            return;
        }
        if (nights <= 0) {
            alert("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");
            return;
        }
        
        setIsProcessing(true);
        try {
          
            if (method === 'vnpay') {
                const res = await axiosClient.post('/create_payment_url', { 
                    amount: cartTotal,
                    language: 'vn',
                    name: checkoutInfo.name,
                    phone: checkoutInfo.phone,
                    email: checkoutInfo.email,
                    cccd: checkoutInfo.cccd,
                    address: checkoutInfo.address,
                    checkIn: checkoutInfo.checkIn,
                    checkOut: checkoutInfo.checkOut
                });
                
                if (res.data.paymentUrl) {
                    console.log("Redirecting to VNPAY:", res.data.paymentUrl);
                    window.location.href = res.data.paymentUrl;
                } else {
                    alert("Không lấy được link thanh toán từ hệ thống.");
                    setIsProcessing(false);
                }
                return; 
            }

            // CASE 2: TIỀN MẶT
            const paymentData = { 
                ...checkoutInfo, 
                totalPrice: cartTotal 
            };

            const res = await axiosClient.post('/payments', paymentData);
            
            if (res.data.paymentId) {
                // Gọi hàm gửi mail đã sửa
                sendConfirmationEmail(res.data.paymentId, { ...checkoutInfo, totalPrice: cartTotal }, roomItem);
                
                setPaymentResult({ paymentId: res.data.paymentId, total: cartTotal });
                setStep(3);
            }

        } catch (err) {
            const errorMsg = err.response?.data?.message || "Lỗi hệ thống khi đặt phòng.";
            alert("Đặt phòng thất bại: " + errorMsg);
        } finally { 
            if (method !== 'vnpay') setIsProcessing(false); 
        }
    };

    if (loading) return <div style={styles.container}>Đang tải...</div>;

    if (step === 3) return (
        <div style={styles.container}>
            <div style={{...styles.formCard, textAlign: 'center', maxWidth: '500px', margin: '0 auto'}}>
                <FaCheckCircle size={60} color={COLORS.success} />
                <h2 style={{marginTop: '20px', color: COLORS.primary}}>Đặt phòng thành công!</h2>
                <p style={{color: COLORS.textMuted, marginBottom: '20px'}}>Mã hóa đơn: <strong>#{paymentResult?.paymentId}</strong></p>
                <p style={{fontSize: '0.9rem'}}>Thông tin xác nhận đã được gửi về email <strong>{checkoutInfo.email}</strong>.</p>
                <button style={styles.btnPrimary} onClick={() => navigate('/bookings')}>XEM LỊCH SỬ ĐẶT</button>
            </div>
        </div>
    );

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Xác Nhận Đặt Phòng</h2>
            <div style={styles.checkoutLayout}>
                <div style={styles.roomCard}>
                    <img src={roomItem?.main_image_url ? `/images/${roomItem.main_image_url}` : 'https://via.placeholder.com/400'} alt="Room" style={styles.roomImage} />
                    <div style={styles.roomInfo}>
                        <h3 style={{fontWeight: '700'}}>{roomItem?.name || "Phòng nghỉ"}</h3>
                        <span style={styles.priceBadge}>{roomItem?.price?.toLocaleString()} VNĐ <small style={{fontWeight: '400', fontSize: '0.8rem', color: COLORS.textMuted}}>/ đêm</small></span>
                    </div>
                </div>

                <div style={styles.formCard}>
                    <form onSubmit={handleConfirmPayment}>
                        <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px'}}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}><FaUser size={12}/> Họ Tên</label>
                                <input type="text" name="name" value={checkoutInfo.name} placeholder="Nguyễn Văn A" style={styles.input} onChange={handleFormChange} required />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}><FaPhone size={12}/> Số Điện Thoại</label>
                                <input type="tel" name="phone" value={checkoutInfo.phone} placeholder="090..." style={styles.input} onChange={handleFormChange} required />
                            </div>
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}><FaEnvelope size={12}/> Địa chỉ Email nhận thông báo</label>
                            <input type="email" name="email" value={checkoutInfo.email} placeholder="vidu@gmail.com" style={styles.input} onChange={handleFormChange} required />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}><FaIdCard size={12}/> Số CCCD / CMND</label>
                            <input type="text" name="cccd" value={checkoutInfo.cccd} placeholder="001..." style={styles.input} onChange={handleFormChange} required />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}><FaCreditCard size={12}/> Phương Thức Thanh Toán</label>
                            <select name="method" style={styles.input} onChange={handleFormChange} value={checkoutInfo.method}>
                                <option value="cash">Tiền mặt (Tại khách sạn)</option>
                                <option value="vnpay">Ví điện tử VNPAY (Sandbox)</option>
                            </select>
                        </div>
                        
                        {checkoutInfo.method === 'vnpay' && (
                            <div style={{...styles.bankInfoBox, borderColor: '#005baa', backgroundColor: '#f0f9ff'}}>
                                <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
                                    <FaGlobeAsia color="#005baa" size={24} />
                                    <div>
                                        <p style={{fontWeight:'bold', color: '#005baa', margin:0}}>Cổng thanh toán VNPAY (Test)</p>
                                        <p style={{fontSize: '0.8rem', margin:0}}>Bạn sẽ được chuyển hướng sang VNPAY để nhập thẻ.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px'}}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}><FaCalendarAlt size={12}/> Ngày Nhận</label>
                                <input type="date" name="checkIn" value={checkoutInfo.checkIn} style={styles.input} onChange={handleFormChange} required />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}><FaCalendarAlt size={12}/> Ngày Trả</label>
                                <input type="date" name="checkOut" value={checkoutInfo.checkOut} style={styles.input} onChange={handleFormChange} required />
                            </div>
                        </div>

                        {nights > 0 && (
                            <div style={styles.summaryBox}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <span style={{fontWeight: '700'}}>Tổng Thanh Toán ({nights} đêm)</span>
                                    <span style={{fontWeight: '900', fontSize: '1.6rem', color: COLORS.accent}}>{cartTotal.toLocaleString()} VNĐ</span>
                                </div>
                            </div>
                        )}

                        <button type="submit" style={styles.btnPrimary} disabled={isProcessing || nights === 0}>
                            {isProcessing ? 'ĐANG XỬ LÝ...' : <>XÁC NHẬN ĐẶT PHÒNG <FaArrowRight size={16}/></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Cart;