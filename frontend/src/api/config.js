import axios from 'axios';

// 🌐 URL API: Dùng biến môi trường để tương thích cả Local Dev và Vercel Production
// - Local: tạo file .env với REACT_APP_API_URL=http://localhost:3001/api
// - Vercel: set biến REACT_APP_API_URL trong Vercel Dashboard > Settings > Environment Variables
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

// Tạo instance axios để dùng lại cấu hình
const axiosClient = axios.create({
    baseURL: BASE_URL,
});

// Tự động đính kèm Token vào mọi request (Interceptors)
axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosClient;