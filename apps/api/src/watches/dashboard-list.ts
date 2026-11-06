/** Minuscules et sans accents : « Séiko » et « SEIKO » se valent. */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** RG-AFF-08 : chaque mot de la recherche doit figurer dans « marque modèle » ; du texte, jamais un motif. */
export function matchesQuery(brand: string, model: string, q: string): boolean {
  const haystack = normalize(`${brand} ${model}`);
  return normalize(q)
    .split(/\s+/)
    .filter((word) => word !== '')
    .every((word) => haystack.includes(word));
}

/**
 * RG-AFF-09 : tri sur la date d'achat, les montres sans date toujours en dernier ; égalité par id décroissant.
 * Sans tri, l'ordre reçu est conservé (les plus récemment ajoutées d'abord).
 */
export function sortCards<
  T extends { id: number; purchaseDate: string | null },
>(cards: T[], sort: 'purchase_date' | undefined, order: 'asc' | 'desc'): T[] {
  if (sort === undefined) return [...cards];
  const direction = order === 'asc' ? 1 : -1;
  return [...cards].sort((a, b) => {
    if (a.purchaseDate === null || b.purchaseDate === null) {
      if (a.purchaseDate === b.purchaseDate) return b.id - a.id;
      return a.purchaseDate === null ? 1 : -1;
    }
    if (a.purchaseDate !== b.purchaseDate)
      return a.purchaseDate < b.purchaseDate ? -direction : direction;
    return b.id - a.id;
  });
}

/** RG-AFF-11 : page `page` (à partir de 1) ; une page hors limites est vide. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
