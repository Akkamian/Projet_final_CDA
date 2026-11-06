import { matchesQuery, paginate, sortCards } from './dashboard-list.js';

describe('matchesQuery', () => {
  it('RG-AFF-08 trouve par marque et modèle, sans tenir compte de la casse', () => {
    expect(matchesQuery('Seiko', '6119-8100', 'seiko 6119')).toBe(true);
    expect(matchesQuery('Seiko', '6119-8100', 'SEIKO')).toBe(true);
  });

  it('RG-AFF-08 ignore les accents, dans la montre comme dans la recherche', () => {
    expect(matchesQuery('Séiko', '6119', 'seiko')).toBe(true);
    expect(matchesQuery('Seiko', '6119', 'séiko')).toBe(true);
  });

  it('RG-AFF-08 exige tous les mots, dans n’importe quel ordre', () => {
    expect(matchesQuery('Seiko', '6119', '6119 seiko')).toBe(true);
    expect(matchesQuery('Seiko', '6119', 'seiko omega')).toBe(false);
    expect(matchesQuery('Seiko', '6119', 'omega')).toBe(false);
  });

  it('RG-AFF-08 ignore les espaces multiples', () => {
    expect(matchesQuery('Seiko', '6119', '  seiko    6119  ')).toBe(true);
  });

  it('RG-AFF-08 traite la recherche comme du texte, jamais comme un motif', () => {
    expect(matchesQuery('Seiko', '(6119)', '(')).toBe(true);
    expect(matchesQuery('Seiko', '6119', '.*')).toBe(false);
    expect(matchesQuery('Seiko', '6119', '%')).toBe(false);
    expect(matchesQuery('Seiko', '100%', '%')).toBe(true);
    expect(matchesQuery('Seiko', '6119', '\\')).toBe(false);
  });
});

describe('sortCards', () => {
  const cards = [
    { id: 3, purchaseDate: '2024-01-01' },
    { id: 2, purchaseDate: null },
    { id: 1, purchaseDate: '2025-01-01' },
  ];

  it('RG-AFF-09 trie par date d’achat décroissante, sans date en dernier', () => {
    expect(sortCards(cards, 'purchase_date', 'desc').map((c) => c.id)).toEqual([
      1, 3, 2,
    ]);
  });

  it('RG-AFF-09 trie par date d’achat croissante, sans date toujours en dernier', () => {
    expect(sortCards(cards, 'purchase_date', 'asc').map((c) => c.id)).toEqual([
      3, 1, 2,
    ]);
  });

  it('RG-AFF-09 départage les dates égales par id décroissant, dans les deux sens', () => {
    const ties = [
      { id: 1, purchaseDate: '2025-01-01' },
      { id: 5, purchaseDate: '2025-01-01' },
      { id: 3, purchaseDate: '2025-01-01' },
    ];
    expect(sortCards(ties, 'purchase_date', 'asc').map((c) => c.id)).toEqual([
      5, 3, 1,
    ]);
    expect(sortCards(ties, 'purchase_date', 'desc').map((c) => c.id)).toEqual([
      5, 3, 1,
    ]);
  });

  it('RG-AFF-09 sans tri, garde l’ordre reçu et ne modifie pas l’entrée', () => {
    const before = [...cards];
    expect(sortCards(cards, undefined, 'desc')).toEqual(before);
    sortCards(cards, 'purchase_date', 'asc');
    expect(cards).toEqual(before);
  });
});

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('RG-AFF-11 renvoie la tranche de la page demandée', () => {
    expect(paginate(items, 2, 4)).toEqual([5, 6, 7, 8]);
    expect(paginate(items, 3, 4)).toEqual([9, 10]);
  });

  it('RG-AFF-11 une page hors limites est vide', () => {
    expect(paginate(items, 99, 4)).toEqual([]);
  });
});
