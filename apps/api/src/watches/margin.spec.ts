import { Prisma } from '../generated/prisma/client.js';
import { computeCostPrice, computeMargin } from './margin.js';

const d = (value: string) => new Prisma.Decimal(value);

describe('computeMargin', () => {
  it('S23 200 − 80 − (25 + 15) = 80.00', () => {
    const margin = computeMargin({ resalePrice: d('200'), purchasePrice: d('80'), expenses: [d('25'), d('15')] });
    expect(margin?.toFixed(2)).toBe('80.00');
  });

  it('S24 pas de marge si non vendue', () => {
    expect(computeMargin({ resalePrice: null, purchasePrice: d('80'), expenses: [d('25')] })).toBeNull();
  });

  it("S24 pas de marge si prix d'achat inconnu", () => {
    expect(computeMargin({ resalePrice: d('200'), purchasePrice: null, expenses: [] })).toBeNull();
  });

  it("RG-FIN-06 aucune erreur d'arrondi : 0.10 + 0.20 de coûts donne 0.30", () => {
    const margin = computeMargin({ resalePrice: d('1.00'), purchasePrice: d('0.40'), expenses: [d('0.10'), d('0.20')] });
    // toString et non toFixed(2) : en `number` le résultat vaut 0.29999999999999993, que toFixed(2) arrondit à « 0.30 ».
    expect(margin?.toString()).toBe('0.3');
  });

  it('RG-FIN-06 une marge négative est renvoyée telle quelle', () => {
    const margin = computeMargin({ resalePrice: d('50'), purchasePrice: d('80'), expenses: [d('10')] });
    expect(margin?.toFixed(2)).toBe('-40.00');
  });
});

describe('computeCostPrice', () => {
  it('RG-FIN-13 coût de revient = achat 120 + coûts 45 et 30.5 = 195.50', () => {
    expect(computeCostPrice({ purchasePrice: d('120'), expenses: [d('45'), d('30.5')] })?.toFixed(2)).toBe('195.50');
  });

  it('RG-FIN-13 sans coût, le coût de revient est le prix d’achat', () => {
    expect(computeCostPrice({ purchasePrice: d('120'), expenses: [] })?.toFixed(2)).toBe('120.00');
  });

  it('RG-FIN-13 sans prix d’achat, le coût de revient est inconnu', () => {
    expect(computeCostPrice({ purchasePrice: null, expenses: [d('45')] })).toBeNull();
  });

  it('RG-FIN-13 aucune erreur d’arrondi : 0.10 + 0.20 de coûts sur 0.00 donne 0.3', () => {
    expect(computeCostPrice({ purchasePrice: d('0'), expenses: [d('0.10'), d('0.20')] })?.toString()).toBe('0.3');
  });
});
