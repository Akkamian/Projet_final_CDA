import { loadDevEnv } from './load-env.js';

describe('loadDevEnv', () => {
  it('en développement, charge le .env de la racine du monorepo', () => {
    const load = vi.fn();

    loadDevEnv({ NODE_ENV: 'development' }, load);

    expect(load).toHaveBeenCalledWith({ path: '../../.env', quiet: true });
  });

  it('sans NODE_ENV, charge aussi le .env', () => {
    const load = vi.fn();

    loadDevEnv({}, load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('en production, ne lit aucun fichier .env : seules les variables de l’hébergeur comptent', () => {
    const load = vi.fn();

    loadDevEnv({ NODE_ENV: 'production' }, load);

    expect(load).not.toHaveBeenCalled();
  });
});
