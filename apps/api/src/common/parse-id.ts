import { NotFoundException } from '@nestjs/common';

/** Un identifiant qui n'est pas un entier positif ne peut désigner aucune ressource : 404, pas 400 (RG-SEC-04). */
export function parseId(id: string): number {
  if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) throw new NotFoundException();
  return Number(id);
}
