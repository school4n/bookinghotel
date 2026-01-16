import axios from 'axios';

// 1. Nơi duy nhất chứa Domain API
const BASE_URL = "http://localhost:3001/api"; 
// const BASE_URL = "https://backend-black-tau-39.vercel.app/api"; 
// 2. Tạo instance axios để dùng lại cấu hình
const axiosClient = axios.create({
    baseURL: BASE_URL,
});

// 3. Tự động đính kèm Token vào mọi request (Interceptors)
axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosClient;