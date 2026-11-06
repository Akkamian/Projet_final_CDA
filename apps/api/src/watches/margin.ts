import { Prisma } from '../generated/prisma/client.js';

/**
 * Marge d'une montre = revente − achat − somme des coûts de tous ses projets (RG-FIN-06).
 * Nulle si la montre n'est pas vendue ou si le prix d'achat est inconnu (RG-FIN-07).
 */
export function computeMargin(input: {
  resalePrice: Prisma.Decimal | null;
  purchasePrice: Prisma.Decimal | null;
  expenses: Prisma.Decimal[];
}): Prisma.Decimal | null {
  if (input.resalePrice === null || input.purchasePrice === null) return null;
  const total = input.expenses.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0));
  return input.resalePrice.minus(input.purchasePrice).minus(total);
}

/**
 * Coût de revient d'une montre = prix d'achat + somme des coûts de tous ses projets (RG-FIN-13).
 * Inconnu si le prix d'achat est inconnu ; calculé même si la montre n'est pas vendue.
 */
export function computeCostPrice(input: { purchasePrice: Prisma.Decimal | null; expenses: Prisma.Decimal[] }): Prisma.Decimal | null {
  if (input.purchasePrice === null) return null;
  return input.expenses.reduce((sum, amount) => sum.plus(amount), input.purchasePrice);
}
