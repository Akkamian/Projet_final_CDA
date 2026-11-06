import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { apiError } from './api-error.js';
import { NotFoundExceptionFilter } from './not-found.filter.js';

describe('NotFoundExceptionFilter', () => {
  function run(error: NotFoundException) {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    new NotFoundExceptionFilter().catch(error, host);
    return { status, json };
  }

  const expected = {
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'Ressource introuvable',
  };

  it('un 404 de Nest répond au format commun, en français', () => {
    const { status, json } = run(new NotFoundException());

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expected);
  });

  it('une route inconnue ne révèle pas son chemin dans le message', () => {
    const { json } = run(new NotFoundException('Cannot GET /secret'));

    expect(json).toHaveBeenCalledWith(expected);
  });

  it('une erreur déjà au format commun (apiError) n’est pas concernée par le filtre', () => {
    expect(apiError(404, 'NOT_FOUND', 'Photo introuvable')).not.toBeInstanceOf(
      NotFoundException,
    );
  });
});
