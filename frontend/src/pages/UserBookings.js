import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from "../api/config"; 
import { 
    FaHistory, FaCalendarAlt, FaClock, FaUser, FaTrashAlt, 
    FaMoneyBillWave, FaIdCard, FaBed, FaInfoCircle, FaChevronRight 
} from 'react-icons/fa'; 

// 🎨 MODERN LUXURY PALETTE
const COLORS = {
    primary: "#1e293b",    // Slate 800
    accent: "#c5a059",     // Muted Gold
    danger: "#be123c",     // Rose 700
    success: "#059669",    // Emerald 600
    info: "#0369a1",       // Blue 700
    warning: "#d97706",    // Amber 600
    bg: "#f8fafc",         // Slate 50
    white: "#ffffff",
    border: "#e2e8f0",     // Slate 200
    textMain: "#1e293b",
    textMuted: "#64748b"
};

const styles = {
    container: {
        padding: "60px 20px",
        maxWidth: "1000px",
        margin: "0 auto",
        fontFamily: "'Inter', system-ui, sans-serif",
        backgroundColor: COLORS.bg,
        minHeight: '100vh',
    },
    heading: {
        fontSize: "2.5rem",
        color: COLORS.primary,
        marginBottom: "50px",
        fontWeight: "850",
        textAlign: 'center',
        letterSpacing: '-0.05em',
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: '24px',
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)",
        marginBottom: '40px',
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
    },
    cardHeader: {
        padding: '20px 30px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff',
    },
    bookingId: {
        fontSize: '1rem',
        fontWeight: '800',
        color: COLORS.primary,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    statusBadge: {
        padding: '6px 14px',
        borderRadius: '100px',
        fontSize: '0.7rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        border: '1px solid rgba(0,0,0,0.05)'
    },
    cardBody: {
        padding: '30px',
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 992 ? '1fr' : '1.2fr 1fr',
        gap: '40px',
    },
    sectionTitle: {
        fontSize: '0.85rem',
        fontWeight: '800',
        color: COLORS.textMuted,
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    roomItem: {
        display: 'flex',
        gap: '20px',
        padding: '15px',
        borderRadius: '16px',
        backgroundColor: '#fcfcfd',
        border: '1px solid #f1f5f9',
    },
    itemImage: {
        width: '100px',
        height: '100px',
        objectFit: 'cover',
        borderRadius: '12px',
    },
    roomName: {
        fontWeight: '700',
        fontSize: '1.1rem',
        color: COLORS.primary,
        marginBottom: '4px',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '12px',
    },
    infoLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.95rem',
        color: COLORS.textMain,
        fontWeight: '500'
    },
    dateRange: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        backgroundColor: '#f8fafc',
        padding: '15px',
        borderRadius: '12px',
        marginTop: '10px'
    },
    totalSection: {
        marginTop: '30px',
        padding: '20px',
        borderRadius: '16px',
        background: COLORS.primary,
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    totalPrice: {
        fontSize: '1.5rem',
        fontWeight: '900',
        color: COLORS.accent,
    },
    cardFooter: {
        padding: '20px 30px',
        backgroundColor: '#fff',
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
    },
    btn: {
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: '700',
        fontSize: '0.85rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        border: 'none',
    },
    btnDetail: {
        backgroundColor: COLORS.bg,
        color: COLORS.primary,
        textDecoration: 'none',
    },
    btnCancel: {
        backgroundColor: '#fff',
        color: COLORS.danger,
        border: `1px solid #fecdd3`,
    }
};

function UserBookings() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const token = localStorage.getItem('token');

    // 🛠️ HÀM PHÂN LOẠI TRẠNG THÁI
    const getStatusLabel = (status) => {
        switch (status) {
            case 'checked_in':
                return { text: "Đang lưu trú", color: COLORS.info, bg: "#f0f9ff" };
            case 'confirmed':
                return { text: "Đã xác nhận", color: COLORS.success, bg: "#ecfdf5" };
            case 'pending':
                return { text: "Chờ xử lý", color: COLORS.warning, bg: "#fffbeb" };
            default:
                return { text: status, color: COLORS.textMuted, bg: COLORS.bg };
        }
    };

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        if (!token) return navigate('/login');
        try {
            const res = await axiosClient.get("/bookings");
            setBookings(res.data); 
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, navigate]); 

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn đặt phòng #${bookingId}?`)) return;
        setIsCancelling(true);
        try {
            await axiosClient.delete(`/bookings/${bookingId}`);
            fetchBookings();
        } catch (err) {
            alert("Không thể hủy đơn này. Vui lòng liên hệ lễ tân.");
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) return <div style={styles.container}><p style={{textAlign:'center'}}>Đang tải lịch sử...</p></div>;

    // ✅ BƯỚC QUAN TRỌNG: Lọc bỏ các đơn 'cancelled' trước khi hiển thị
    const activeBookings = bookings.filter(b => b.order_status !== 'cancelled');

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Lịch Sử Đặt Phòng</h2>
            
            {activeBookings.length === 0 ? (
                <div style={{textAlign: 'center', padding: '100px 0'}}>
                    <FaHistory size={50} color={COLORS.border} style={{marginBottom: '20px'}}/>
                    <p style={{color: COLORS.textMuted, fontSize: '1.1rem'}}>Bạn không có đơn đặt phòng nào đang hoạt động.</p>
                    <Link to="/" style={{color: COLORS.accent, textDecoration: 'none', fontWeight: 'bold'}}>Khám phá phòng ngay</Link>
                </div>
            ) : (
                activeBookings.map((booking) => {
                    const status = getStatusLabel(booking.order_status);
                    return (
                        <div key={booking.booking_id} style={styles.card}>
                            {/* Header: ID & Status */}
                            <div style={styles.cardHeader}>
                                <div style={styles.bookingId}>
                                    <span style={{color: COLORS.accent}}>●</span> ĐƠN HÀNG #{booking.booking_id}
                                    <span style={{
                                        ...styles.statusBadge, 
                                        color: status.color, 
                                        backgroundColor: status.bg 
                                    }}>
                                        {status.text}
                                    </span>
                                </div>
                                <div style={{fontSize: '0.85rem', color: COLORS.textMuted, fontWeight: '600'}}>
                                    Ngày đặt: {new Date(booking.created_at).toLocaleDateString('vi-VN')}
                                </div>
                            </div>

                            <div style={styles.cardBody}>
                                {/* Left Column: Room Info */}
                                <div>
                                    <div style={styles.sectionTitle}><FaBed size={14}/> Thông tin phòng nghỉ</div>
                                    <div style={{display: 'grid', gap: '15px'}}>
                                        {booking.items?.map(item => (
                                            <div key={item.id} style={styles.roomItem}>
                                                <img 
                                                    src={item.image ? `/images/${item.image}` : `https://via.placeholder.com/100`} 
                                                    alt="Room" style={styles.itemImage} 
                                                />
                                                <div>
                                                    <div style={styles.roomName}>{item.room_name}</div>
                                                    <div style={{fontSize: '0.85rem', color: COLORS.textMuted}}>
                                                        Phòng tiêu chuẩn · {item.max_guests} Khách tối đa
                                                    </div>
                                                    <div style={{marginTop: '10px', fontWeight: '700', color: COLORS.primary}}>
                                                        {item.unit_price?.toLocaleString()} VNĐ / Đêm
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Column: Customer & Time */}
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <div style={styles.sectionTitle}><FaUser size={14}/> Chi tiết lưu trú</div>
                                    <div style={styles.infoGrid}>
                                        <div style={styles.infoLabel}><FaUser size={14} color={COLORS.accent}/> {booking.client_name}</div>
                                        <div style={styles.infoLabel}><FaIdCard size={14} color={COLORS.accent}/> CCCD: {booking.cccd}</div>
                                        <div style={styles.infoLabel}>
                                            <FaMoneyBillWave size={14} color={COLORS.accent}/> 
                                            PTTT: {booking.payment_method === 'cash' ? 'Thanh toán tại khách sạn' : 'Đã thanh toán Online'}
                                        </div>
                                    </div>

                                    <div style={{marginTop: '30px'}}>
                                        <div style={styles.sectionTitle}><FaCalendarAlt size={14}/> Thời gian nhận/trả</div>
                                        <div style={styles.dateRange}>
                                            <div>
                                                <div style={{fontSize: '0.7rem', color: COLORS.textMuted, fontWeight: '700'}}>CHECK-IN</div>
                                                <div style={{fontWeight: '800', fontSize: '1rem'}}>{new Date(booking.check_in_date).toLocaleDateString('vi-VN')}</div>
                                            </div>
                                            <FaChevronRight size={12} color={COLORS.border}/>
                                            <div>
                                                <div style={{fontSize: '0.7rem', color: COLORS.textMuted, fontWeight: '700'}}>CHECK-OUT</div>
                                                <div style={{fontWeight: '800', fontSize: '1rem'}}>{new Date(booking.check_out_date).toLocaleDateString('vi-VN')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={styles.totalSection}>
                                        <span style={{fontSize:'0.75rem', fontWeight:'800'}}>TỔNG TIỀN PHẢI TRẢ</span>
                                        <span style={styles.totalPrice}>
                                            {booking.total_price?.toLocaleString('vi-VN')} VNĐ
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.cardFooter}>
                                {/* ✅ Chỉ cho phép hủy nếu chưa nhận phòng (Status khác checked_in) */}
                                {booking.order_status !== 'checked_in' && (
                                    <button
                                        onClick={() => handleCancelBooking(booking.booking_id)}
                                        style={{...styles.btn, ...styles.btnCancel}}
                                        disabled={isCancelling}
                                    >
                                        <FaTrashAlt size={12}/> Hủy đặt phòng
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default UserBookings;