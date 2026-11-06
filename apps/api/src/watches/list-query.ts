import { apiError } from '../common/api-error.js';
import { DASHBOARD_STATUSES, type DashboardStatus } from './status.js';

export const DEFAULT_PAGE_SIZE = 8;
export const MAX_PAGE_SIZE = 50;
const MAX_QUERY_LENGTH = 100;

export interface WatchListQuery {
  status?: DashboardStatus;
  q?: string;
  sort?: 'purchase_date';
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

const POSITIVE_INTEGER = /^[1-9]\d{0,5}$/;

/** Lit les paramètres de GET /watches (S40, RG-AFF-08, 09, 11) ; toute valeur invalide, répétée comprise, répond 400. */
export function parseWatchListQuery(
  raw: Record<string, unknown>,
): WatchListQuery {
  const { status, q, sort, order, page, pageSize } = raw;

  if (
    status !== undefined &&
    !DASHBOARD_STATUSES.includes(status as DashboardStatus)
  ) {
    throw apiError(
      400,
      'INVALID_STATUS',
      `Statut inconnu : attendu ${DASHBOARD_STATUSES.join(', ')}`,
    );
  }

  let search: string | undefined;
  if (q !== undefined) {
    search = typeof q === 'string' ? q.trim() : '';
    if (search.length < 1 || search.length > MAX_QUERY_LENGTH) {
      throw apiError(
        400,
        'INVALID_QUERY',
        `La recherche doit compter de 1 à ${MAX_QUERY_LENGTH} caractères`,
      );
    }
  }

  if (sort !== undefined && sort !== 'purchase_date') {
    throw apiError(400, 'INVALID_SORT', 'Tri inconnu : attendu purchase_date');
  }
  if (
    order !== undefined &&
    (sort === undefined || (order !== 'asc' && order !== 'desc'))
  ) {
    throw apiError(
      400,
      'INVALID_ORDER',
      'Ordre inconnu : attendu asc ou desc, avec un tri',
    );
  }

  if (
    page !== undefined &&
    !(typeof page === 'string' && POSITIVE_INTEGER.test(page))
  ) {
    throw apiError(
      400,
      'INVALID_PAGE',
      'La page doit être un entier supérieur ou égal à 1',
    );
  }
  if (
    pageSize !== undefined &&
    !(
      typeof pageSize === 'string' &&
      POSITIVE_INTEGER.test(pageSize) &&
      Number(pageSize) <= MAX_PAGE_SIZE
    )
  ) {
    throw apiError(
      400,
      'INVALID_PAGE_SIZE',
      `La taille de page doit être un entier de 1 à ${MAX_PAGE_SIZE}`,
    );
  }

  return {
    ...(status !== undefined && { status: status as DashboardStatus }),
    ...(search !== undefined && { q: search }),
    ...(sort !== undefined && { sort }),
    order: order === 'asc' ? 'asc' : 'desc',
    page: page === undefined ? 1 : Number(page),
    pageSize: pageSize === undefined ? DEFAULT_PAGE_SIZE : Number(pageSize),
  };
}
