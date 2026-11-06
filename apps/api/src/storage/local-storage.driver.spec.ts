import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageDriver } from './local-storage.driver.js';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/;

describe('LocalStorageDriver', () => {
  let dir: string;
  let driver: LocalStorageDriver;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wrt-uploads-'));
    driver = new LocalStorageDriver(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('RG-PHO-03 le fichier enregistré s’appelle uuid.ext et jamais le nom d’origine', async () => {
    const { key } = await driver.save({ buffer: png });

    expect(key).toMatch(KEY);
    expect(await readdir(dir)).toEqual([key]);
    expect(await readFile(join(dir, key))).toEqual(png);
  });

  it('RG-SEC-06 l’URL contient un identifiant aléatoire, différent à chaque enregistrement', async () => {
    const a = await driver.save({ buffer: png });
    const b = await driver.save({ buffer: png });

    expect(a.url).toBe(`/uploads/${a.key}`);
    expect(a.key).not.toBe(b.key);
  });

  it('refuse un contenu qui n’est ni JPEG, ni PNG, ni WebP, et n’écrit rien', async () => {
    await expect(driver.save({ buffer: Buffer.from('<?php echo 1; ?>') })).rejects.toThrow(/type/i);
    expect(await readdir(dir)).toEqual([]);
  });

  it('delete efface le fichier', async () => {
    const { url, key } = await driver.save({ buffer: png });

    await driver.delete(url);

    expect(existsSync(join(dir, key))).toBe(false);
  });

  it('delete d’un fichier absent ne lève pas d’erreur', async () => {
    await expect(driver.delete('/uploads/00000000-0000-4000-8000-000000000000.png')).resolves.toBeUndefined();
  });

  it('delete ignore une URL qui ne désigne pas une clé générée (pas de sortie du dossier)', async () => {
    const { key } = await driver.save({ buffer: png });

    await driver.delete('/uploads/..');
    await driver.delete('..');
    await driver.delete('/uploads/../package.json');
    await driver.delete('/uploads/..%2F..%2Fetc%2Fpasswd');
    await driver.delete('');

    expect(existsSync(join(dir, key))).toBe(true);
  });
});
