import type { CookieOptions } from 'express';
import type { AppConfig } from '../config/configuration.js';

export const REFRESH_COOKIE = 'refresh_token';

// RG-CPT-12 : httpOnly, SameSite=Lax, limité à /auth ; Secure en production.
// Pour effacer le cookie il faut les mêmes options que pour le poser : un seul endroit pour les deux.
export function refreshCookieOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/auth',
  };
}
