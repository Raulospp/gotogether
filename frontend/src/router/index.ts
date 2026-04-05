import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/welcome' },
  { path: '/welcome', component: () => import('@/views/WelcomeView.vue') },
  { path: '/login/:role', component: () => import('@/views/LoginView.vue') },
  { path: '/register/tipo', component: () => import('@/views/RegisterTipoView.vue') },
  { path: '/register/conductor', component: () => import('@/views/RegisterConductorView.vue') },
  { path: '/register/pasajero', component: () => import('@/views/RegisterPasajeroView.vue') },
  { path: '/inicio', component: () => import('@/views/InicioView.vue') },
  { path: '/home', component: () => import('@/views/HomeView.vue') },
  { path: '/feed', component: () => import('@/views/FeedView.vue') },
  { path: '/solicitudes', component: () => import('@/views/SolicitudesView.vue') },
  { path: '/perfil/:role/:id', component: () => import('@/views/PerfilView.vue') },
  { path: '/viaje/:id', component: () => import('@/views/ViajeView.vue') },
  { path: '/editar-perfil', component: () => import('@/views/EditarPerfilView.vue') },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;