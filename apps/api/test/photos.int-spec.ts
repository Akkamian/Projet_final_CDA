import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokensService } from '../src/auth/tokens.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { createProject, createUser, createWatch, resetUserData } from './helpers/factories.js';
import { createTestApp } from './helpers/test-app.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('pixels')]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('pixels')]);
const TEN_MB = 10 * 1024 * 1024;

describe('Photos : étapes, état initial et état final', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let uploadDir: string;
  let authorization: string;
  let projectId: number;
  let stepId: number;

  const http = () => request(app.getHttpServer());
  const upload = (path: string, buffer: Buffer, method: 'post' | 'put' = 'post', auth = authorization) =>
    http()[method](path).set('Authorization', auth).attach('file', buffer, { filename: 'IMG_0001.jpg', contentType: 'image/jpeg' });
  const del = (path: string, auth = authorization) => http().delete(path).set('Authorization', auth);
  const files = () => readdir(uploadDir);
  const fileOf = (url: string) => join(uploadDir, url.slice(url.lastIndexOf('/') + 1));
  const stepPath = (suffix = '') => `/projects/${projectId}/steps/${stepId}/photos${suffix}`;
  const projectPath = (kind: string) => `/projects/${projectId}/photos/${kind}`;
  const tokenFor = (userId: number) => `Bearer ${app.get(TokensService).signSession('access', userId)}`;

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'wrt-photos-'));
    vi.stubEnv('UPLOAD_DIR', uploadDir);
    ({ app, prisma } = await createTestApp());
    storage = app.get(StorageService);
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetUserData(prisma);
    for (const file of await files()) await rm(join(uploadDir, file));
    const userId = (await createUser(prisma)).id;
    authorization = tokenFor(userId);
    const watch = await createWatch(prisma, userId);
    projectId = (await createProject(prisma, watch.id)).id;
    stepId = (await prisma.restoration_steps.create({ data: { project_id: projectId, step_order: 1, label: 'Désarmer' } })).id;
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('RG-SEC-03 sans jeton la réponse est 401', async () => {
    expect((await http().post(stepPath()).attach('file', PNG, 'a.png')).status).toBe(401);
  });

  describe('photos d’une étape', () => {
    it('S17 ajoute plusieurs photos à la même étape', async () => {
      const first = await upload(stepPath(), PNG);
      const second = await upload(stepPath(), JPEG);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body).toEqual({ id: expect.any(Number), url: expect.stringMatching(/^\/uploads\/[0-9a-f-]{36}\.png$/) });
      expect(second.body.url).toMatch(/\.jpg$/);
      const rows = await prisma.step_pics.findMany({ where: { restoration_step_id: stepId }, orderBy: { id: 'asc' } });
      expect(rows.map((r) => r.url)).toEqual([first.body.url, second.body.url]);
      expect(await files()).toHaveLength(2);
      // Le nom d'origine n'est jamais conservé (RG-PHO-03) et l'URL est servie.
      expect((await files()).join()).not.toContain('IMG_0001');
      expect((await http().get(first.body.url)).status).toBe(200);
    });

    it('RG-PHO-01 refuse un fichier texte déclaré image/jpeg : 400, ni fichier ni ligne', async () => {
      const res = await upload(stepPath(), Buffer.from('<?php echo 1; ?>'));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_IMAGE_TYPE');
      expect(await files()).toEqual([]);
      expect(await prisma.step_pics.count()).toBe(0);
    });

    it('refuse une requête sans fichier (champ file absent) : 400', async () => {
      const res = await http().post(stepPath()).set('Authorization', authorization);

      expect(res.status).toBe(400);
      expect(await files()).toEqual([]);
    });

    it('RG-PHO-02 accepte 10 Mo exactement et refuse 10 Mo + 1 octet sans rien écrire', async () => {
      const pad = (size: number) => Buffer.concat([PNG, Buffer.alloc(size - PNG.length)]);

      expect((await upload(stepPath(), pad(TEN_MB))).status).toBe(201);
      const tooBig = await upload(stepPath(), pad(TEN_MB + 1));

      expect(tooBig.status).toBe(413);
      expect(await files()).toHaveLength(1);
      expect(await prisma.step_pics.count()).toBe(1);
    });

    it('si l’écriture en base échoue, le fichier enregistré est supprimé', async () => {
      vi.spyOn(prisma.step_pics, 'create').mockRejectedValueOnce(new Error('base indisponible'));

      const res = await upload(stepPath(), PNG);

      expect(res.status).toBe(500);
      expect(await files()).toEqual([]);
    });

    it('RG-PHO-06 supprimer une photo efface la ligne et le fichier', async () => {
      const { body } = await upload(stepPath(), PNG);
      const keep = await upload(stepPath(), JPEG);

      const res = await del(stepPath(`/${body.id}`));

      expect(res.status).toBe(204);
      expect(await prisma.step_pics.findMany({ select: { id: true } })).toEqual([{ id: keep.body.id }]);
      expect(existsSync(fileOf(body.url))).toBe(false);
      expect(existsSync(fileOf(keep.body.url))).toBe(true);
    });

    it('supprimer une photo inexistante, ou d’une autre étape, répond 404', async () => {
      const other = await prisma.restoration_steps.create({ data: { project_id: projectId, step_order: 2, label: 'Autre' } });
      const { body } = await upload(stepPath(), PNG);

      expect((await del(stepPath('/999999'))).status).toBe(404);
      expect((await del(`/projects/${projectId}/steps/${other.id}/photos/${body.id}`)).status).toBe(404);
      expect(await prisma.step_pics.count()).toBe(1);
    });

    it('RG-PHO-06 si l’effacement du fichier échoue, la suppression réussit quand même', async () => {
      const { body } = await upload(stepPath(), PNG);
      vi.spyOn(storage, 'delete').mockRejectedValueOnce(new Error('disque en lecture seule'));

      expect((await del(stepPath(`/${body.id}`))).status).toBe(204);
      expect(await prisma.step_pics.count()).toBe(0);
    });

    it('RG-SEC-01 la photo d’une étape d’un autre utilisateur répond 404 (ajout et suppression)', async () => {
      const { body } = await upload(stepPath(), PNG);
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await upload(stepPath(), PNG, 'post', stranger)).status).toBe(404);
      expect((await del(stepPath(`/${body.id}`), stranger)).status).toBe(404);
      expect(await prisma.step_pics.count()).toBe(1);
      expect(await files()).toHaveLength(1);
    });
  });

  describe('suppression d’une étape (RG-ETP-15)', () => {
    it('RG-ETP-15 supprimer une étape efface les fichiers de ses photos, pas ceux des autres étapes', async () => {
      const other = await prisma.restoration_steps.create({ data: { project_id: projectId, step_order: 2, label: 'Autre' } });
      const a = await upload(stepPath(), PNG);
      const b = await upload(stepPath(), JPEG);
      const kept = await upload(`/projects/${projectId}/steps/${other.id}/photos`, PNG);

      expect((await del(`/projects/${projectId}/steps/${stepId}`)).status).toBe(204);

      expect(existsSync(fileOf(a.body.url))).toBe(false);
      expect(existsSync(fileOf(b.body.url))).toBe(false);
      expect(existsSync(fileOf(kept.body.url))).toBe(true);
      expect(await prisma.step_pics.count()).toBe(1);
    });

    it('RG-ETP-15 si un fichier ne s’efface pas, la suppression de l’étape réussit quand même', async () => {
      await upload(stepPath(), PNG);
      vi.spyOn(storage, 'delete').mockRejectedValueOnce(new Error('disque en lecture seule'));

      expect((await del(`/projects/${projectId}/steps/${stepId}`)).status).toBe(204);

      expect(await prisma.restoration_steps.count()).toBe(0);
    });

    it('une étape sans photo se supprime toujours', async () => {
      expect((await del(`/projects/${projectId}/steps/${stepId}`)).status).toBe(204);
      expect(await files()).toEqual([]);
    });
  });

  describe.each([
    ['before', 'photo_before'],
    ['after', 'photo_after'],
  ] as const)('photo %s du projet', (kind, column) => {
    const stored = async () => (await prisma.restoration_projects.findUniqueOrThrow({ where: { id: projectId } }))[column];

    it('RG-PHO-07 enregistre la photo, puis la remplace en effaçant l’ancien fichier', async () => {
      const first = await upload(projectPath(kind), PNG, 'put');
      expect(first.status).toBe(200);
      expect(first.body).toEqual({ url: expect.stringMatching(/^\/uploads\//) });
      expect(await stored()).toBe(first.body.url);

      const second = await upload(projectPath(kind), JPEG, 'put');

      expect(second.status).toBe(200);
      expect(await stored()).toBe(second.body.url);
      expect(existsSync(fileOf(first.body.url))).toBe(false);
      expect(await files()).toHaveLength(1);
    });

    it('RG-PHO-07 retirer la photo efface le fichier et met la colonne à null', async () => {
      const { body } = await upload(projectPath(kind), PNG, 'put');

      expect((await del(projectPath(kind))).status).toBe(204);

      expect(await stored()).toBeNull();
      expect(existsSync(fileOf(body.url))).toBe(false);
      // Retirer ce qui n'existe pas n'est pas une erreur.
      expect((await del(projectPath(kind))).status).toBe(204);
    });

    it('RG-PHO-07 si l’effacement de l’ancien fichier échoue, la requête réussit quand même', async () => {
      await upload(projectPath(kind), PNG, 'put');
      vi.spyOn(storage, 'delete').mockRejectedValueOnce(new Error('disque en lecture seule'));

      const res = await upload(projectPath(kind), JPEG, 'put');

      expect(res.status).toBe(200);
      expect(await stored()).toBe(res.body.url);
    });

    it('un contenu invalide laisse l’ancienne photo en place', async () => {
      const { body } = await upload(projectPath(kind), PNG, 'put');

      expect((await upload(projectPath(kind), Buffer.from('texte'), 'put')).status).toBe(400);

      expect(await stored()).toBe(body.url);
      expect(existsSync(fileOf(body.url))).toBe(true);
    });

    it('RG-SEC-01 la photo d’un projet d’un autre utilisateur répond 404 (envoi et retrait)', async () => {
      const { body } = await upload(projectPath(kind), PNG, 'put');
      const stranger = tokenFor((await createUser(prisma)).id);

      expect((await upload(projectPath(kind), JPEG, 'put', stranger)).status).toBe(404);
      expect((await del(projectPath(kind), stranger)).status).toBe(404);
      expect(await stored()).toBe(body.url);
    });
  });

  it('une valeur autre que before ou after répond 404', async () => {
    expect((await upload(projectPath('during'), PNG, 'put')).status).toBe(404);
    expect((await del(projectPath('during'))).status).toBe(404);
    expect(await files()).toEqual([]);
  });
});
