import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.response.use(r=>r, error=>Promise.reject(error.response?.data?.message || error.message || 'Something went wrong'));
export default api;
