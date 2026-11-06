import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import { authGuard } from './guards'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: DashboardView },
  // Chargée à la demande : son code n'est téléchargé qu'à la première visite de la page.
  {
    path: '/apercu-etapes',
    name: 'step-preview',
    component: () => import('../views/StepPreviewView.vue'),
  },
  {
    path: '/watches/new',
    name: 'new-watch',
    component: () => import('../views/NewWatchView.vue'),
  },
  {
    path: '/watches/:id/edit',
    name: 'edit-watch',
    component: () => import('../views/EditWatchView.vue'),
  },
  {
    path: '/watches/:id',
    name: 'watch-detail',
    component: () => import('../views/WatchDetailView.vue'),
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('../views/AccountView.vue'),
  },
  // Pages d'authentification : seules routes accessibles sans session.
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/auth/RegisterView.vue'),
    meta: { public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../views/auth/ForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../views/auth/ResetPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('../views/auth/VerifyEmailView.vue'),
    meta: { public: true },
  },
]

export const router = createRouter({ history: createWebHistory(), routes })
router.beforeEach(authGuard)
