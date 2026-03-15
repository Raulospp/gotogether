import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService } from '@/services/authService';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{
    id: number; name: string; email: string; role: string;
    city?: string; university?: string; car_model?: string;
    plate?: string; route?: string; vehicle_type?: string;
    capacity?: number; phone?: string;
  } | null>(authService.getUser());
  const isLoggedIn = ref(authService.isAuthenticated());
  const loading = ref(false);
  const error = ref('');

  async function registerConductor(data: {
    name: string; email: string; password: string; phone?: string;
    city: string; car_model: string; plate: string; route?: string;
    vehicle_type: string; capacity: number;
  }) {
    loading.value = true; error.value = '';
    try {
      await authService.loginConductor(data);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al registrarse'; throw err;
    } finally { loading.value = false; }
  }

  async function registerPasajero(data: {
    name: string; email: string; password: string; phone?: string;
    city: string; university: string; route?: string;
  }) {
    loading.value = true; error.value = '';
    try {
      await authService.loginPasajero(data);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al registrarse'; throw err;
    } finally { loading.value = false; }
  }

  async function login(email: string, password: string) {
    loading.value = true; error.value = '';
    try {
      const res = await authService.login(email, password);
      user.value = res.user; isLoggedIn.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Credenciales inválidas'; throw err;
    } finally { loading.value = false; }
  }

  function logout() {
    authService.logout();
    user.value = null; isLoggedIn.value = false;
  }

  return { user, isLoggedIn, loading, error, registerConductor, registerPasajero, login, logout };
});