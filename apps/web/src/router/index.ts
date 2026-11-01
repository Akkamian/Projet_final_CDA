import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  // Chargée à la demande : son code n'est téléchargé qu'à la première visite de la page.
  {
    path: '/apercu-etapes',
    name: 'step-preview',
    component: () => import('../views/StepPreviewView.vue'),
  },
]

export const router = createRouter({ history: createWebHistory(), routes })
