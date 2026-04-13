import axios from 'axios';

const API_URL = 'https://gotogether-nhuj.onrender.com';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  async registerConductor(data: {
    name: string; email: string; password: string; phone?: string;
    city: string; car_model: string; plate: string; route?: string;
    vehicle_type: string; capacity: number;
  }) {
    const res = await api.post('/api/auth/register/conductor', data);
    // ✅ Solo guarda si el backend devuelve token (puede que requiera login aparte)
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data?.user) {
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async registerPasajero(data: {
    name: string; email: string; password: string; phone?: string;
    city: string; university: string; route?: string;
  }) {
    const res = await api.post('/api/auth/register/pasajero', data);
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data?.user) {
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async login(email: string, password: string) {
    const res = await api.post('/api/auth/login', { email, password });
    if (!res.data?.token) throw new Error('El servidor no devolvió token');
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user ?? {}));
    return res.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  getUser() {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : null; // ✅ guarda contra "undefined" literal
    } catch {
      localStorage.removeItem('user'); // ✅ limpia dato corrupto
      return null;
    }
  },
};

export default authService;