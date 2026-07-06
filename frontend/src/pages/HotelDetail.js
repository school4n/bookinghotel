import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
// import axios from "axios"; // Đã thay thế bằng axiosClient
import axiosClient from "../api/config"; 
import { FaEye, FaMapMarkerAlt, FaRulerCombined, FaUsers, FaStar, FaTimes, FaChevronLeft, FaChevronRight, FaPaperPlane } from 'react-icons/fa';

// 🎨 CÁC ĐỊNH NGHĨA STYLE 
const ROYAL_COLOR = "#f3c300";
const DARK_BG = "#0f172a";
const LIGHT_BG = "#f9f9ff"; 
const TEXT_COLOR = "#333"; 
const BUTTON_COLOR_GREEN = "#27ae60"; 
const MAPBOX_HEIGHT = "250px";

function HotelDetail() {
    // 📱 Check Mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { id } = useParams();
    const navigate = useNavigate();
    const [hotel, setHotel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [gallery, setGallery] = useState([]); 
    const [isBooking, setIsBooking] = useState(false);
    
    // LIGHTBOX STATES
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // REVIEW STATES
    const [reviews, setReviews] = useState([]); 
    const [userRating, setUserRating] = useState(0);
    const [userComment, setUserComment] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // 1. Hàm lấy đánh giá - Dùng axiosClient
    const fetchReviews = async () => {
        try {
            const res = await axiosClient.get(`/reviews/room/${id}`);
            setReviews(res.data);
        } catch (err) {
            console.error("Lỗi tải đánh giá:", err);
        }
    };

    useEffect(() => {
        // 2. Hàm lấy chi tiết phòng - Dùng axiosClient
        const fetchHotel = async () => {
            try {
                const res = await axiosClient.get(`/rooms/${id}`);
                const data = res.data;
                const priceValue = parseFloat(data.price_per_night) || 0; 
                
                // Xử lý Gallery
                const mainImageName = data.main_image_url ? `/images/${data.main_image_url}` : null;
                const imagesFromApi = (data.gallery || [])
                    .map(img => img.image_url ? `/images/${img.image_url}` : null)
                    .filter(img => img); 

                let allImages = [];
                if (mainImageName) allImages.push(mainImageName);
                allImages = allImages.concat(imagesFromApi);

                while (allImages.length < 3) {
                     allImages.push(`https://placehold.co/400x300/cccccc/333333?text=Hotel+Image`); 
                }
                setGallery(allImages);

                // Chuẩn hóa dữ liệu
                const mapped = {
                    id: data.id,
                    name: data.name || "Phòng nghỉ",
                    location: data.location || "Quận 1, TP. HCM, Việt Nam",
                    price: priceValue, 
                    view: data.view || "Không xác định",
                    room_size: data.area || 0, 
                    max_persons: data.max_guests || 0, 
                    description: data.description || "Chưa có mô tả chung về loại phòng này.",
                    facilities: (data.facilities && typeof data.facilities === 'string' && data.facilities.trim() !== "") 
                        ? data.facilities.split(',').map(f => f.trim()).filter(f => f) 
                        : [],
                    features: (data.features && typeof data.features === 'string' && data.features.trim() !== "") 
                        ? data.features.split(',').map(f => f.trim()).filter(f => f) 
                        : [],
                };

                setHotel(mapped);
            } catch (err) {
                console.error("❌ Lỗi tải phòng:", err.message);
                setError("Không thể tải dữ liệu phòng.");
            } finally {
                setLoading(false);
            }
        };

        fetchHotel();
        fetchReviews();
    }, [id]); 

    // 3. Hàm gửi đánh giá - axiosClient tự động đính kèm Token
    const handleSubmitReview = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Vui lòng đăng nhập để viết đánh giá!");
            navigate('/login');
            return;
        }
        if (userRating === 0 || userComment.length < 10) {
            alert("Vui lòng chọn sao và viết ít nhất 10 ký tự cho đánh giá.");
            return;
        }
        setIsSubmittingReview(true);
        try {
            await axiosClient.post(`/reviews`, {
                room_id: id, rating_point: userRating, review_text: userComment
            });

            alert("Đánh giá của bạn đã được gửi thành công!");
            setUserRating(0); setUserComment(""); fetchReviews();
        } catch (err) {
            alert(err.response?.data?.message || "Gửi đánh giá thất bại.");
        } finally {
            setIsSubmittingReview(false);
        }
    };
    
    // 4. Hàm đặt phòng - axiosClient tự động đính kèm Token
    const handleBooking = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Vui lòng đăng nhập để tiến hành đặt phòng.");
            navigate('/login'); return;
        }
        setIsBooking(true);
        try {
            const res = await axiosClient.post(`/cart`, 
                { room_id: Number(id), quantity: 1 }
            );
            // alert(res.data.message || "Đã thêm phòng vào đơn đặt hàng chờ.");
            navigate('/cart'); 
        } catch (err) {
            alert(`Đặt phòng thất bại: ${err.response?.data?.message || "Lỗi kết nối."}`);
        } finally {
            setIsBooking(false);
        }
    };

    // Các hàm helper giữ nguyên
    const formatPrice = (p) => (!p || p === 0) ? "Liên hệ" : `${p.toLocaleString("vi-VN")} VNĐ`;
    const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString("vi-VN") : "";
    const averageRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating_point, 0) / reviews.length).toFixed(1) : 0;

    const safeGallery = Array.isArray(gallery) ? gallery : [];
    const [mainImg, overlayImg1, overlayImg2] = safeGallery.slice(0, 3); 
    const currentImageUrl = safeGallery[currentImageIndex];

    const openLightbox = (index) => { setCurrentImageIndex(index); setIsLightboxOpen(true); };
    const closeLightbox = () => setIsLightboxOpen(false);
    const nextImage = () => { if (gallery.length > 0) setCurrentImageIndex((prev) => (prev + 1) % gallery.length); };
    const prevImage = () => { if (gallery.length > 0) setCurrentImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length); };

    // 🎨 STYLES (Giữ nguyên logic của bạn)
    const styles = {
        container: {
            padding: isMobile ? "20px 15px 100px 15px" : "40px 20px",
            maxWidth: "1200px", margin: "0 auto", fontFamily: "serif", backgroundColor: LIGHT_BG,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(600px, 1fr) 300px', 
            gap: '30px',
        },
        mainContent: { textAlign: 'left' },
        headerContainer: { marginBottom: '20px' },
        title: { fontSize: isMobile ? '1.8rem' : '2.5rem', color: DARK_BG, marginBottom: '5px', fontWeight: '700' },
        locationHeader: { display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '1.1rem', marginBottom: '15px' },
        galleryArea: {
            position: 'relative',
            height: isMobile ? '300px' : '450px', 
            marginBottom: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            overflow: 'hidden', cursor: 'pointer', display: 'grid',
            gridTemplateColumns: '1.5fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px',
        },
        mainImage: { width: '100%', height: '100%', objectFit: 'cover', gridColumn: '1 / 2', gridRow: '1 / 3', borderRadius: '8px 0 0 8px', transition: 'transform 0.3s' },
        overlayImageTop: { width: '100%', height: '100%', objectFit: 'cover', gridColumn: '2 / 3', gridRow: '1 / 2', borderRadius: '0 8px 0 0', transition: 'transform 0.3s' },
        overlayImageBottom: { width: '100%', height: '100%', objectFit: 'cover', gridColumn: '2 / 3', gridRow: '2 / 3', borderRadius: '0 0 8px 0', transition: 'transform 0.3s' },
        overlayTag: { position: 'absolute', bottom: '15px', right: '15px', backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '0.9rem', zIndex: 10 },
        specGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', padding: '20px 0', marginBottom: '30px', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd' },
        specItem: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px', fontSize: '0.9rem', color: '#555', textAlign: 'left' },
        specValue: { fontWeight: 'bold', color: DARK_BG, fontSize: '1.1rem' },
        detailTitle: { color: DARK_BG, fontSize: isMobile ? '1.4rem' : '1.6rem', marginBottom: '20px', fontWeight: '700', borderBottom: `2px solid ${ROYAL_COLOR}`, display: 'inline-block', paddingBottom: '5px' },
        detailSection: { marginBottom: '30px' },
        facilityGrid: { listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px 0' },
        sidebar: {
            display: 'flex', flexDirection: 'column', gap: '20px',
            position: isMobile ? 'static' : 'sticky', 
            top: '100px', alignSelf: 'flex-start',
            width: '100%'
        },
        priceBoxSidebar: { backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: `2px solid ${ROYAL_COLOR}`, textAlign: 'center' },
        priceSidebar: { color: '#e8491d', fontWeight: '900', fontSize: '2rem', marginBottom: '5px' },
        bookButtonSidebar: { background: ROYAL_COLOR, color: DARK_BG, border: 'none', padding: '12px 0', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: '100%', transition: 'background 0.3s' },
        ratingBox: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' },
        mapBox: { backgroundColor: '#eee', height: MAPBOX_HEIGHT, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666', fontSize: '1rem' },
        mobileStickyBar: {
            position: 'fixed', bottom: 0, left: 0, width: '100%',
            backgroundColor: '#fff', padding: '15px 20px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', zIndex: 999,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid #eee', boxSizing: 'border-box',
        },
        mobilePriceLabel: { fontSize: '0.9rem', color: '#666', marginBottom: '2px' },
        mobilePriceValue: { fontSize: '1.4rem', fontWeight: 'bold', color: '#e8491d' },
        mobileBookBtn: {
            background: BUTTON_COLOR_GREEN, color: 'white', border: 'none',
            padding: '12px 30px', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem',
            cursor: 'pointer'
        },
        lightboxOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' },
        lightboxImageContainer: { position: 'relative', maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' },
        lightboxImage: { width: 'auto', height: 'auto', maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain', borderRadius: '8px' },
        closeButton: { position: 'fixed', top: '20px', right: '20px', background: ROYAL_COLOR, color: DARK_BG, border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', zIndex: 10000, fontWeight: 'bold', display: 'flex', alignItems: 'center' },
        navButton: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white', border: 'none', padding: '15px', borderRadius: '50%', cursor: 'pointer', zIndex: 10000, fontSize: '1.5rem' },
        reviewSection: { marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' },
        reviewTitle: { color: DARK_BG, fontSize: '1.6rem', marginBottom: '20px', fontWeight: '700', borderBottom: `2px solid ${ROYAL_COLOR}`, display: 'inline-block', paddingBottom: '5px' },
        reviewForm: { padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' },
        reviewInput: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' },
        ratingStar: { cursor: 'pointer', transition: 'color 0.2s' },
        reviewList: { display: 'flex', flexDirection: 'column', gap: '15px' },
        reviewItem: { padding: '15px', border: '1px solid #eee', borderRadius: '6px', backgroundColor: '#fff' },
        reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' },
        reviewUser: { fontWeight: 'bold', color: DARK_BG },
        reviewDate: { fontSize: '0.8rem', color: '#888' }
    };

    if (loading) return <div style={{...styles.container, gridTemplateColumns: '1fr', textAlign: 'center'}}>⏳ Đang tải thông tin phòng...</div>;
    if (error) return <div style={{...styles.container, gridTemplateColumns: '1fr', textAlign: 'center', color: 'red'}}>{error}</div>;
    if (!hotel) return <div style={{...styles.container, gridTemplateColumns: '1fr', textAlign: 'center', color: 'red'}}>Không tìm thấy phòng.</div>;

    return (
        <>
            {/* LIGHTBOX */}
            {isLightboxOpen && (
                <div style={styles.lightboxOverlay} onClick={closeLightbox}>
                    <button style={styles.closeButton} onClick={closeLightbox}><FaTimes style={{marginRight: '5px'}} /> Đóng</button>
                    <div style={styles.lightboxImageContainer}>
                        <div style={{position: 'absolute', top: '10px', left: '20px', color: 'white', fontWeight: 'bold', zIndex: 10001}}>Ảnh {currentImageIndex + 1} / {safeGallery.length}</div>
                        <button style={{...styles.navButton, left: '20px'}} onClick={(e) => {e.stopPropagation(); prevImage();}}><FaChevronLeft /></button>
                        <img src={currentImageUrl} alt="Chi tiết" style={styles.lightboxImage} onClick={(e) => e.stopPropagation()} />
                        <button style={{...styles.navButton, right: '20px'}} onClick={(e) => {e.stopPropagation(); nextImage();}}><FaChevronRight /></button>
                    </div>
                </div>
            )}

            {/* 📱 MOBILE STICKY BOTTOM BAR */}
            {isMobile && (
                <div style={styles.mobileStickyBar}>
                    <div>
                        <div style={styles.mobilePriceLabel}>Giá mỗi đêm từ</div>
                        <div style={styles.mobilePriceValue}>{formatPrice(hotel.price)}</div>
                    </div>
                    <button style={styles.mobileBookBtn} onClick={handleBooking} disabled={isBooking}>
                        {isBooking ? '...' : 'Đặt Ngay'}
                    </button>
                </div>
            )}

            <div style={styles.container}>
                {/* CỘT TRÁI - NỘI DUNG CHÍNH */}
                <div style={styles.mainContent}>
                    <div style={styles.headerContainer}>
                        <h1 style={styles.title}>{hotel.name}</h1>
                        <div style={styles.locationHeader}><FaMapMarkerAlt color="#666" size={16} /> {hotel.location}</div>
                    </div>
                    
                    <div style={styles.galleryArea} onClick={() => openLightbox(0)}>
                        <img src={mainImg} alt={hotel.name} style={styles.mainImage} />
                        <img src={overlayImg1} alt="Ảnh phụ 1" style={styles.overlayImageTop} />
                        <img src={overlayImg2} alt="Ảnh phụ 2" style={styles.overlayImageBottom} />
                        {safeGallery.length > 3 && <div style={styles.overlayTag}>+ {safeGallery.length - 3} ảnh khác</div>}
                    </div>
                    
                    <div style={styles.specGrid}>
                        <div style={styles.specItem}>Địa điểm: <span style={styles.specValue}>{hotel.location}</span></div>
                        {hotel.max_persons > 0 && (<div style={styles.specItem}><FaUsers color="#555" size={16} style={{marginRight: '5px'}}/> Sức chứa: <span style={styles.specValue}>{hotel.max_persons} khách</span></div>)}
                        {hotel.room_size > 0 && (<div style={styles.specItem}><FaRulerCombined color="#555" size={16} style={{marginRight: '5px'}}/> Diện tích: <span style={styles.specValue}>{hotel.room_size} m²</span></div>)}
                        <div style={styles.specItem}><FaEye color="#555" size={16} style={{marginRight: '5px'}}/> View: <span style={styles.specValue}>{hotel.view}</span></div>
                    </div>

                    <div style={styles.detailSection}>
                        <h3 style={styles.detailTitle}>Mô tả Chung</h3>
                        <p style={{color: '#555', lineHeight: 1.6}}>{hotel.description}</p>
                    </div>
                    
                    <div style={styles.detailSection}>
                        <h3 style={styles.detailTitle}>Tiện nghi & Dịch vụ</h3>
                        <ul style={styles.facilityGrid}>
                            {hotel.facilities.map((fac, i) => <li key={`fac-${i}`} style={{marginBottom: '5px', color: '#555'}}>✅ {fac}</li>)}
                            {hotel.features.map((feat, i) => <li key={`feat-${i}`} style={{marginBottom: '5px', color: '#555'}}>⭐ {feat}</li>)}
                        </ul>
                        {hotel.facilities.length === 0 && hotel.features.length === 0 && <p style={{color: '#666', fontStyle: 'italic'}}>Chưa có thông tin tiện nghi chi tiết.</p>}
                    </div>
                    
                    {/* KHU VỰC ĐÁNH GIÁ */}
                    <div style={styles.reviewSection}>
                        <h3 style={styles.reviewTitle}>⭐ Đánh giá ({reviews.length})</h3>
                        <div style={styles.reviewForm}>
                            <h4 style={{color: DARK_BG, marginBottom: '15px'}}>Chia sẻ cảm nhận</h4>
                            <div style={{marginBottom: '10px', fontSize: '1.5rem', color: ROYAL_COLOR}}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <FaStar key={star} style={{...styles.ratingStar, color: star <= userRating ? ROYAL_COLOR : '#ccc', marginRight: '5px'}} onClick={() => setUserRating(star)}/>
                                ))}
                                <span style={{fontSize: '1rem', color: TEXT_COLOR, marginLeft: '10px'}}>{userRating > 0 ? `(${userRating} sao)` : ''}</span>
                            </div>
                            <textarea style={styles.reviewInput} rows="3" placeholder="Viết đánh giá (tối thiểu 10 ký tự)..." value={userComment} onChange={(e) => setUserComment(e.target.value)} disabled={isSubmittingReview} />
                            <button style={{...styles.bookButtonSidebar, width: 'auto', padding: '10px 20px', backgroundColor: BUTTON_COLOR_GREEN, color: 'white'}} onClick={handleSubmitReview} disabled={isSubmittingReview}>
                                <FaPaperPlane style={{marginRight: '10px'}} /> {isSubmittingReview ? 'ĐANG GỬI...' : 'GỬI ĐÁNH GIÁ'}
                            </button>
                        </div>
                        <div style={styles.reviewList}>
                            {reviews.length === 0 ? <p style={{color: '#666', fontStyle: 'italic'}}>Chưa có đánh giá nào.</p> : reviews.map(review => (
                                <div key={review.id} style={styles.reviewItem}>
                                    <div style={styles.reviewHeader}>
                                        <div style={styles.reviewUser}>{review.full_name || review.username || `User #${review.user_id}`}</div>
                                        <div style={styles.reviewDate}>{formatDate(review.created_at)}</div>
                                    </div>
                                    <div style={{marginBottom: '5px'}}>
                                        {[1, 2, 3, 4, 5].map(star => <FaStar key={star} size={14} color={star <= review.rating_point ? ROYAL_COLOR : '#ccc'} style={{marginRight: '2px'}}/>)}
                                    </div>
                                    <p style={{color: TEXT_COLOR, fontSize: '0.95rem'}}>{review.review_text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: SIDEBAR */}
                <div style={styles.sidebar}>
                    {!isMobile && (
                        <div style={styles.priceBoxSidebar}>
                            <p style={{color: '#666', marginBottom: '5px'}}>Giá mỗi đêm từ:</p>
                            <div style={styles.priceSidebar}>{formatPrice(hotel.price)}</div>
                            <button style={styles.bookButtonSidebar} onClick={handleBooking} disabled={isBooking}>
                                {isBooking ? 'ĐANG XỬ LÝ...' : 'ĐẶT PHÒNG NGAY'}
                            </button>
                        </div>
                    )}
                    <div style={styles.ratingBox}>
                        <h3 style={{color: TEXT_COLOR, fontSize: '1.1rem', marginBottom: '10px'}}>Đánh giá tổng quan</h3>
                        <div style={{marginBottom: '15px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}>
                            <span style={{fontSize: '3rem', fontWeight: '900', color: ROYAL_COLOR}}>{averageRating}</span>
                            <span style={{fontSize: '1rem', color: '#888', marginLeft: '5px'}}>/ 5.0</span>
                        </div>
                        <div style={{color: ROYAL_COLOR, fontWeight: 'bold'}}>
    <FaStar size={20} /> <FaStar size={20} /> <FaStar size={20} /> <FaStar size={20} /> <FaStar size={20} />
</div>
                    </div>
                   <div style={styles.mapBox}>
    <iframe 
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.424167419927!2d106.699419!3d10.77877!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f385570472f%3A0x17b56d9d00103c!2zUXXhuq1uIDEsIFRow6BuaCBwaOG7kSBI4buTIENow60gTWluaA!5e0!3m2!1svi!2svn!4v1700000000000!5m2!1svi!2svn" 
        width="100%" 
        height="100%" 
        style={{ border: 0 }} // ✅ Sửa từ string sang object
        allowFullScreen={true} // ✅ Sửa thành camelCase
        loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade" // ✅ Sửa thành camelCase
    ></iframe>
</div>
                </div>
            </div>
        </>
    );
}

export default HotelDetail;