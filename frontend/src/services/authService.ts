import axios, { AxiosError } from 'axios';

// URL correcta del backend en Render
const API_URL = 'https://gotogether-api.onrender.com';

// Instancia base de axios (se exporta para usar en otros componentes)
export const api = axios.create({ baseURL: API_URL });

// Interceptor para agregar el token a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[Auth] Token enviado a ${config.url}`, token.substring(0, 20) + '...');
    } else {
      console.warn(`[Auth] No hay token para ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores 401 globalmente
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error('[Auth] Error 401 - Token inválido o expirado');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Si usas Vue Router, puedes redirigir:
      // router.push('/login');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async registerConductor(data: {
    name: string; email: string; password: string; phone?: string;
    city: string; car_model: string; plate: string; route?: string;
    vehicle_type: string; capacity: number;
  }) {
    try {
      const res = await api.post('/api/auth/register/conductor', data);
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        console.log('[Auth] Token guardado tras registro conductor');
      }
      if (res.data?.user) localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    } catch (error) {
      console.error('[Auth] Error en registro conductor:', error);
      throw error;
    }
  },

  async registerPasajero(data: {
    name: string; email: string; password: string; phone?: string;
    city: string; university: string; route?: string;
  }) {
    try {
      const res = await api.post('/api/auth/register/pasajero', data);
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        console.log('[Auth] Token guardado tras registro pasajero');
      }
      if (res.data?.user) localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    } catch (error) {
      console.error('[Auth] Error en registro pasajero:', error);
      throw error;
    }
  },

  async login(email: string, password: string) {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (!res.data?.token) throw new Error('El servidor no devolvió token');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user ?? {}));
      console.log('[Auth] Login exitoso, token guardado');
      return res.data;
    } catch (error) {
      console.error('[Auth] Error en login:', error);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('[Auth] Sesión cerrada');
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const isValid = !!token;
    console.log(`[Auth] isAuthenticated: ${isValid}`);
    return isValid;
  },

  getUser() {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },

  // Método para obtener el token actual (depuración)
  getToken(): string | null {
    return localStorage.getItem('token');
  }
};

export default authService;