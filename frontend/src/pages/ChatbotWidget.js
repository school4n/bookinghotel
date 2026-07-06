import React, { useState, useRef, useEffect } from 'react';
import axiosClient from "../api/config"; 
import ReactMarkdown from 'react-markdown'; // Đảm bảo đã chạy: npm install react-markdown

// --- CSS Styles ---
const styles = {
    container: { 
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000, fontFamily: 'Segoe UI, sans-serif' 
    },
    // Nút mở chat tròn
    button: { 
        width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#007bff', color: 'white', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', transition: 'transform 0.2s'
    },
    // Cửa sổ chat
    window: { 
        width: '360px', height: '520px', backgroundColor: '#f8f9fa', borderRadius: '16px', 
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', 
        marginBottom: '15px', overflow: 'hidden', border: '1px solid #e1e1e1'
    },
    header: { 
        backgroundColor: '#007bff', color: 'white', padding: '16px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(90deg, #007bff 0%, #0056b3 100%)'
    },
    headerTitle: { margin: '0', fontSize: '16px', fontWeight: '600' },
    
    body: { 
        flexGrow: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#fff', 
        display: 'flex', flexDirection: 'column', gap: '10px'
    },
    
    // Khung tin nhắn chung
    messageBase: { 
        maxWidth: '85%', padding: '12px 16px', borderRadius: '18px', 
        fontSize: '0.95rem', lineHeight: 1.5, wordWrap: 'break-word',
        whiteSpace: 'pre-wrap' // QUAN TRỌNG: Giúp hiển thị xuống dòng đúng cách
    },
    messageBot: { 
        backgroundColor: '#f0f2f5', color: '#1c1e21', alignSelf: 'flex-start', 
        borderBottomLeftRadius: '4px', border: '1px solid #e5e5e5'
    },
    messageUser: { 
        backgroundColor: '#007bff', color: 'white', alignSelf: 'flex-end', 
        borderBottomRightRadius: '4px', boxShadow: '0 2px 4px rgba(0,123,255,0.2)'
    },

    inputArea: { 
        display: 'flex', padding: '12px', borderTop: '1px solid #eee', backgroundColor: '#fff', gap: '8px' 
    },
    input: { 
        flexGrow: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '24px', 
        outline: 'none', fontSize: '14px', transition: 'border 0.2s'
    },
    sendButton: { 
        padding: '0 20px', backgroundColor: '#007bff', color: 'white', border: 'none', 
        borderRadius: '24px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
    }
};

const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Xin chào! 👋\nTôi có thể giúp gì cho bạn? (Ví dụ: "Tìm phòng VIP dưới 2 triệu")' },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const chatBodyRef = useRef(null);

    // Auto scroll xuống cuối
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages, isTyping, isOpen]);

    const sendMessage = async () => {
        const text = inputMessage.trim();
        if (!text) return;

        // 1. Hiện tin nhắn user
        setMessages(prev => [...prev, { sender: 'user', text }]);
        setInputMessage('');
        setIsTyping(true);

        try {
            // 2. Gọi API
            const response = await axiosClient.post('/chatbot', { message: text });
            
            // Lấy dữ liệu an toàn
            const replyText = response.reply || response.data?.reply || "Xin lỗi, tôi không hiểu ý bạn.";

            setMessages(prev => [...prev, { sender: 'bot', text: replyText }]);
        } catch (error) {
            console.error("Lỗi Chatbot:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "⚠️ Lỗi kết nối server. Vui lòng thử lại sau." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={styles.container}>
            {isOpen && (
                <div style={styles.window}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <span style={{fontSize: '20px'}}>🤖</span>
                            <h4 style={styles.headerTitle}>Trợ lý Đặt Phòng</h4>
                        </div>
                        <span 
                            style={{ cursor: 'pointer', fontSize: '24px', lineHeight: '20px', opacity: 0.8 }} 
                            onClick={() => setIsOpen(false)}
                        >×</span>
                    </div>
                    
                    {/* Body Chat */}
                    <div style={styles.body} ref={chatBodyRef}>
                        {messages.map((msg, index) => (
                            <div key={index} style={msg.sender === 'bot' ? {...styles.messageBase, ...styles.messageBot} : {...styles.messageBase, ...styles.messageUser}}>
                                
                                {/* --- PHẦN QUAN TRỌNG: BIẾN LINK THÀNH NÚT --- */}
                                <ReactMarkdown 
                                    components={{
                                        // Custom thẻ Link (a) thành Button đẹp mắt
                                        a: ({node, ...props}) => (
                                            <a 
                                                {...props} 
                                                // ĐÃ XÓA: target="_blank" để mở ở tab hiện tại
                                                // ĐÃ XÓA: rel="noopener noreferrer" vì không mở tab mới
                                                style={{
                                                    display: 'inline-block',
                                                    marginTop: '8px',
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    textDecoration: 'none',
                                                    fontWeight: '600',
                                                    fontSize: '0.9rem',
                                                    transition: 'opacity 0.2s',
                                                    cursor: 'pointer', // Thêm con trỏ tay
                                                    // Logic màu sắc:
                                                    backgroundColor: msg.sender === 'bot' ? '#e7f1ff' : 'rgba(255,255,255,0.2)',
                                                    color: msg.sender === 'bot' ? '#007bff' : '#fff',
                                                    border: msg.sender === 'bot' ? '1px solid #b3d7ff' : '1px solid rgba(255,255,255,0.4)',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                }}
                                            />
                                        ),
                                        // Custom thẻ P để bỏ margin thừa
                                        p: ({node, ...props}) => (
                                            <p {...props} style={{ margin: 0 }} />
                                        )
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                                {/* --------------------------------------------- */}

                            </div>
                        ))}
                        
                        {isTyping && (
                            <div style={{ ...styles.messageBase, ...styles.messageBot, fontStyle: 'italic', opacity: 0.6, fontSize: '0.85rem' }}>
                                Đang soạn tin... ✍️
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div style={styles.inputArea}>
                        <input
                            type="text"
                            style={styles.input}
                            placeholder="Nhập câu hỏi..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button style={styles.sendButton} onClick={sendMessage}>Gửi</button>
                    </div>
                </div>
            )}
            
            {/* Nút mở Chat */}
            {!isOpen && (
                <div style={styles.button} onClick={() => setIsOpen(true)}>
                    <span style={{fontSize: '28px'}}>💬</span>
                </div>
            )}
        </div>
    );
};

export default ChatbotWidget;