import type { HttpException } from '@nestjs/common';
import { parseWatchListQuery } from './list-query.js';

/** Code d'erreur 400 levé par `parseWatchListQuery`, ou null s'il n'a rien levé. */
function errorCode(raw: Record<string, unknown>): string | null {
  try {
    parseWatchListQuery(raw);
    return null;
  } catch (error) {
    const response = (error as HttpException).getResponse() as {
      statusCode: number;
      code: string;
    };
    expect(response.statusCode).toBe(400);
    return response.code;
  }
}

describe('parseWatchListQuery', () => {
  it('applique les valeurs par défaut', () => {
    expect(parseWatchListQuery({})).toEqual({
      order: 'desc',
      page: 1,
      pageSize: 8,
    });
  });

  it('reprend chaque valeur valide, avec la recherche rognée', () => {
    expect(
      parseWatchListQuery({
        status: 'sold',
        q: '  seiko ',
        sort: 'purchase_date',
        order: 'asc',
        page: '3',
        pageSize: '50',
      }),
    ).toEqual({
      status: 'sold',
      q: 'seiko',
      sort: 'purchase_date',
      order: 'asc',
      page: 3,
      pageSize: 50,
    });
  });

  it('S40 refuse un statut inconnu, vide ou répété', () => {
    expect(errorCode({ status: 'nope' })).toBe('INVALID_STATUS');
    expect(errorCode({ status: '' })).toBe('INVALID_STATUS');
    expect(errorCode({ status: ['sold', 'completed'] })).toBe('INVALID_STATUS');
  });

  it('RG-AFF-08 refuse une recherche vide, blanche, trop longue ou répétée', () => {
    expect(errorCode({ q: '' })).toBe('INVALID_QUERY');
    expect(errorCode({ q: '   ' })).toBe('INVALID_QUERY');
    expect(errorCode({ q: 'a'.repeat(101) })).toBe('INVALID_QUERY');
    expect(errorCode({ q: ['a', 'b'] })).toBe('INVALID_QUERY');
    expect(parseWatchListQuery({ q: 'a'.repeat(100) }).q).toHaveLength(100);
  });

  it('RG-AFF-09 refuse un tri inconnu', () => {
    expect(errorCode({ sort: 'brand' })).toBe('INVALID_SORT');
  });

  it('RG-AFF-09 refuse un ordre inconnu ou donné sans tri', () => {
    expect(errorCode({ sort: 'purchase_date', order: 'up' })).toBe(
      'INVALID_ORDER',
    );
    expect(errorCode({ order: 'asc' })).toBe('INVALID_ORDER');
  });

  it('RG-AFF-11 refuse une page qui n’est pas un entier positif', () => {
    for (const page of ['0', '-1', '1.5', 'abc', ''])
      expect(errorCode({ page })).toBe('INVALID_PAGE');
  });

  it('RG-AFF-11 refuse une taille de page hors de 1 à 50', () => {
    for (const pageSize of ['0', '51', 'x', ''])
      expect(errorCode({ pageSize })).toBe('INVALID_PAGE_SIZE');
  });
});
