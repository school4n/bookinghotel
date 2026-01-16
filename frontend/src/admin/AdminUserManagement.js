import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // Đã thay thế bằng axiosClient
import axiosClient from "../api/config"; 
import { FaUser, FaEnvelope, FaPhone, FaEdit, FaTrash, FaLock, FaUnlock, FaIdBadge } from 'react-icons/fa';

// --- Hằng số Styles ---
const ROYAL_COLOR = "#f3c300";
const DARK_BG = "#0f172a";

function AdminUserManagement() {
    // 📱 CHECK MOBILE
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalUser, setModalUser] = useState(null); 
    const [editData, setEditData] = useState({
        username: '', email: '', full_name: '', phone: '', password: '', isActive: false, 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- TẢI DỮ LIỆU ---
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            
            const response = await axiosClient.get('/admin/users');
            setUsers(Array.isArray(response.data) ? response.data : response.data.users || []);
            setError(null);
        } catch (err) {
            console.error("Lỗi tải users:", err);
            setError("Không thể tải danh sách người dùng. Vui lòng kiểm tra quyền hạn.");
        } finally {
            setLoading(false);
        }
    }, []); 

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // --- LOGIC XỬ LÝ ---
    const handleEditClick = (user) => {
        setModalUser(user);
        setEditData({
            username: user.username || '', email: user.email || '',
            full_name: user.full_name || '', phone: user.phone || '',
            isActive: user.isActive, password: ''
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (userId, statusChangeOnly = false, currentStatus = false) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const payload = {};
        const normalizeValue = (value) => { const trimmed = value?.trim(); return trimmed === '' ? null : trimmed; };
        
        if (statusChangeOnly) {
            payload.isActive = !currentStatus;
        } else {
            const newUsername = normalizeValue(editData.username);
            if (!newUsername) { alert("Username không được để trống."); setIsSubmitting(false); return; }
            if (newUsername !== modalUser.username) payload.username = newUsername;
            if (normalizeValue(editData.email) !== modalUser.email) payload.email = normalizeValue(editData.email);
            if (normalizeValue(editData.full_name) !== modalUser.full_name) payload.full_name = normalizeValue(editData.full_name);
            if (normalizeValue(editData.phone) !== modalUser.phone) payload.phone = normalizeValue(editData.phone);
            if (editData.password.trim() !== '') payload.password = editData.password.trim();
        }

        if (Object.keys(payload).length === 0) {
             alert("Không có thay đổi nào."); setIsSubmitting(false); if (!statusChangeOnly) setModalUser(null); return;
        }

        try {
            // SỬ DỤNG axiosClient cho yêu cầu PUT
            await axiosClient.put(`/admin/users/${userId}`, payload);
            alert(statusChangeOnly ? `Đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công!` : "Cập nhật thành công!");
            if (!statusChangeOnly) setModalUser(null);
            fetchUsers();
        } catch (err) {
            alert("Lỗi cập nhật: " + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleToggleStatus = (user) => {
        const action = !user.isActive ? 'KÍCH HOẠT' : 'VÔ HIỆU HÓA';
        if (!window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản ${user.username}?`)) return;
        handleEditSubmit(user.id, true, user.isActive);
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Bạn có chắc chắn muốn XÓA tài khoản ${username}? Thao tác này KHÔNG thể hoàn tác.`)) return;
        try {
            // SỬ DỤNG axiosClient cho yêu cầu DELETE
            await axiosClient.delete(`/admin/users/${userId}`);
            alert(`Đã xóa tài khoản ${username}.`);
            fetchUsers();
        } catch (err) {
            alert("Lỗi xóa: " + (err.response?.data?.message || err.message));
        }
    };

    // 🎨 STYLES (Giữ nguyên logic của bạn)
    const styles = {
        container: { padding: isMobile ? '15px' : '30px', fontFamily: 'serif', backgroundColor: '#f4f6f8', minHeight: '100%' },
        title: { color: DARK_BG, marginBottom: '20px', fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' },
        tableContainer: { display: isMobile ? 'none' : 'block', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse' },
        tableHeader: { backgroundColor: '#343a40', color: 'white' },
        tableCell: { padding: '15px', verticalAlign: 'middle', borderBottom: '1px solid #eee', fontSize: '14px', textAlign: 'left' },
        mobileList: { display: isMobile ? 'flex' : 'none', flexDirection: 'column', gap: '15px' },
        card: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #ddd' },
        cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' },
        cardRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '0.9rem', color: '#555' },
        cardLabel: { fontWeight: 'bold', minWidth: '30px' },
        statusActive: { color: 'white', backgroundColor: '#28a745', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' },
        statusInactive: { color: 'white', backgroundColor: '#ffc107', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' },
        actionContainer: { display: 'flex', gap: '5px', justifyContent: isMobile ? 'space-between' : 'flex-start', marginTop: isMobile ? '10px' : '0' },
        btn: (bg) => ({
            padding: '8px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: bg, color: 'white', 
            fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', flex: isMobile ? 1 : 'none', justifyContent: 'center'
        }),
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
        modalContent: { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: isMobile ? '90%' : '450px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
        input: { width: '100%', padding: '10px', margin: '8px 0 15px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
        label: { fontWeight: 'bold', fontSize: '0.9rem', color: DARK_BG },
        modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>⏳ Đang tải dữ liệu khách hàng...</div>;

    const renderActions = (user) => (
        <div style={styles.actionContainer}>
            <button style={styles.btn(user.isActive ? '#ffc107' : '#28a745')} onClick={() => handleToggleStatus(user)}>
                {user.isActive ? <FaLock /> : <FaUnlock />} {isMobile ? (user.isActive ? 'Khóa' : 'Mở') : ''}
            </button>
            <button style={styles.btn('#007bff')} onClick={() => handleEditClick(user)}>
                <FaEdit /> {isMobile ? 'Sửa' : ''}
            </button>
            <button style={styles.btn('#dc3545')} onClick={() => handleDeleteUser(user.id, user.username)}>
                <FaTrash /> {isMobile ? 'Xóa' : ''}
            </button>
        </div>
    );

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>👨‍💼 Quản Lý Khách Hàng ({users.length})</h2>
            
            {/* DESKTOP TABLE */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.tableHeader}>
                            <th style={{...styles.tableCell, width: '5%'}}>ID</th>
                            <th style={styles.tableCell}>Username</th>
                            <th style={styles.tableCell}>Họ Tên</th>
                            <th style={styles.tableCell}>Email</th>
                            <th style={styles.tableCell}>SĐT</th>
                            <th style={{...styles.tableCell, textAlign: 'center'}}>Trạng Thái</th>
                            <th style={styles.tableCell}>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td style={styles.tableCell}>{user.id}</td>
                                <td style={{...styles.tableCell, fontWeight: 'bold'}}>{user.username}</td>
                                <td style={styles.tableCell}>{user.full_name || '---'}</td>
                                <td style={styles.tableCell}>{user.email}</td>
                                <td style={styles.tableCell}>{user.phone || '---'}</td>
                                <td style={{...styles.tableCell, textAlign: 'center'}}>
                                    <span style={user.isActive ? styles.statusActive : styles.statusInactive}>{user.isActive ? 'ACTIVE' : 'LOCKED'}</span>
                                </td>
                                <td style={styles.tableCell}>{renderActions(user)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MOBILE CARD LIST */}
            <div style={styles.mobileList}>
                {users.map(user => (
                    <div key={user.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <span style={{fontWeight: 'bold', color: '#666'}}>ID: #{user.id}</span>
                            <span style={user.isActive ? styles.statusActive : styles.statusInactive}>{user.isActive ? 'ACTIVE' : 'LOCKED'}</span>
                        </div>
                        <div style={styles.cardRow}><FaUser color="#888"/> <strong>{user.username}</strong></div>
                        <div style={styles.cardRow}><FaIdBadge color="#888"/> {user.full_name || 'Chưa cập nhật tên'}</div>
                        <div style={styles.cardRow}><FaEnvelope color="#888"/> {user.email}</div>
                        <div style={styles.cardRow}><FaPhone color="#888"/> {user.phone || 'Chưa có SĐT'}</div>
                        {renderActions(user)}
                    </div>
                ))}
            </div>

            {/* MODAL */}
            {modalUser && (
                <div style={styles.modalOverlay} onClick={() => setModalUser(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{marginBottom: '20px', color: DARK_BG}}>Chỉnh sửa: {modalUser.username}</h3>
                        
                        <label style={styles.label}>Username</label>
                        <input style={styles.input} type="text" name="username" value={editData.username} onChange={handleEditChange} />
                        
                        <label style={styles.label}>Email</label>
                        <input style={styles.input} type="email" name="email" value={editData.email} onChange={handleEditChange} />
                        
                        <label style={styles.label}>Họ Tên</label>
                        <input style={styles.input} type="text" name="full_name" value={editData.full_name} onChange={handleEditChange} />
                        
                        <label style={styles.label}>Số Điện Thoại</label>
                        <input style={styles.input} type="text" name="phone" value={editData.phone} onChange={handleEditChange} />
                        
                        <label style={styles.label}>Mật khẩu mới (Để trống nếu không đổi)</label>
                        <input style={styles.input} type="password" name="password" placeholder="***" value={editData.password} onChange={handleEditChange} />

                        <div style={styles.modalActions}>
                            <button style={styles.btn('#6c757d')} onClick={() => setModalUser(null)}>Hủy</button>
                            <button style={styles.btn('#28a745')} onClick={() => handleEditSubmit(modalUser.id)} disabled={isSubmitting}>
                                {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminUserManagement;