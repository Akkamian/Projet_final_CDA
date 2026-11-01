import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marque une route accessible sans session (RG-SEC-03) ; toutes les autres exigent un utilisateur connecté. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
