import axios from 'axios';

const trimmedEnvApiUrl = import.meta.env.VITE_API_URL?.trim();
const trimmedReactStyleApiUrl =
  typeof process !== 'undefined' ? process.env?.REACT_APP_API_URL?.trim() : '';

const API_BASE =
  trimmedEnvApiUrl ||
  trimmedReactStyleApiUrl ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/api');

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthEntry =
      url.includes('/auth/login') ||
      url.includes('/auth/signup');
    if (err.response?.status === 401 && !isAuthEntry) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_BASE };
