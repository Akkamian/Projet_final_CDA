import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Page accessible sans session (RG-SEC-03). */
    public?: boolean
  }
}

/** Toute page exige une session, sauf celles marquées `meta.public` ; sinon retour à /login (la destination est gardée). */
export async function authGuard(to: RouteLocationNormalized): Promise<true | RouteLocationRaw> {
  const auth = useAuthStore()
  await auth.bootstrap()
  if (to.meta.public || auth.isAuthenticated) return true
  return { name: 'login', query: { redirect: to.fullPath } }
}
