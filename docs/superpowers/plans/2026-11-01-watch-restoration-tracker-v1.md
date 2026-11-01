# Watch Restoration Tracker v1 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire l'application web de la v1 : comptes privés, montres, projets de restauration à checklist générée, photos, mesures, coûts, revente et marge.

**Architecture:** Monorepo npm workspaces. `apps/api` : API REST NestJS + Prisma sur PostgreSQL 16, sans préfixe de route, servie sur un sous-domaine `api.` en production. `apps/web` : SPA Vue 3 (Vite, Router, Pinia) en CSS maison. Les règles qui vivent dans la base (XOR, index partiel, CHECK, cascades) sont testées sur un vrai PostgreSQL.

**Tech Stack:** TypeScript, NestJS, Prisma, PostgreSQL 16, Vue 3, Vite, Pinia, Chart.js, Jest, Vitest, Playwright, nodemailer, MailDev, Docker, GitHub Actions.

**Spec :** `docs/CONCEPTION-TECHNIQUE.md` (décisions D1 à D10, contrat d'API), `docs/SPECS.md` (scénarios S1 à S40), `docs/REGLES-GESTION.md` (règles `RG-xx`), `db/script_db.sql`, `db/seed_reference_data.sql`. Les maquettes sont dans `design/`.

## Global Constraints

- Routes **sans préfixe** (`POST /auth/login`, `GET /watches/:id`), JSON, validation par DTO.
- Identifiants des données : entiers auto-générés. Une ressource d'un autre utilisateur répond **404**, comme une ressource inexistante (RG-SEC-01, RG-SEC-02).
- Toute route exige un utilisateur connecté, sauf inscription, vérification, renvoi du lien, connexion, renouvellement, mot de passe oublié et réinitialisation (RG-SEC-03).
- Mot de passe : 8 caractères minimum (RG-CPT-03), haché avec bcrypt. Email : minuscules, sans espace superflu, à l'inscription **et** à toute recherche (RG-CPT-13).
- Jeton d'accès 15 min ; jeton de renouvellement 7 jours en cookie `refresh_token` (`httpOnly`, `Secure` en production, `SameSite=Lax`, chemin `/auth`) ; lien de vérification 24 h ; lien de réinitialisation 1 h (RG-CPT-08, 09, 12).
- Champs texte courts : 255 caractères maximum ; notes sans limite (RG-GEN-02). Aucune date saisie dans le futur, aujourd'hui accepté (RG-GEN-01).
- Photos : JPEG, PNG ou WebP, 10 Mo maximum, fichier renommé `uuid.ext`, type vérifié sur le contenu (RG-PHO-01, 02, 03).
- Montants : `Prisma.Decimal` côté service, sérialisés en chaîne à 2 décimales (`"80.00"`). Jamais de `number` pour un calcul d'argent.
- Contraintes de colonnes à respecter dans les DTO (réponse 400, jamais 500) : prix et coûts `NUMERIC(10,2)` (≤ 99999999.99) ; marche, beat error, amplitude `NUMERIC(5,2)` (≤ 999.99 en valeur absolue).
- Ordre de la checklist : `step_order` croissant ; à égalité, étapes de base avant celles des complications, puis code de la complication (RG-ETP-04).
- Interface en français ; identifiants de code, routes et colonnes en anglais, comme dans `db/script_db.sql`.
- Chaque test cite la règle ou le scénario qu'il couvre dans son nom (`RG-PRJ-09`, `S28`…).
- Commits sur la branche `dev`, au format `type : description` en français minuscule (`feat :`, `test :`, `chore :`, `docs :`), **sans ligne d'attribution ni mention d'outil**.
- Les secrets ne sont jamais commités : seul `.env.example` est versionné.

## Review Focus

Entrées que la spec laisse implicites et qui risquent de casser, les plus probables d'abord. Chacune est épinglée par un test dans la tâche indiquée.

1. **Fichier d'image truqué ou trop gros** : un fichier déclaré `image/jpeg` dont le contenu n'est pas une image, ou de plus de 10 Mo, est refusé (400 / 413) et ne laisse aucun fichier sur le disque. → Tâche 22.
2. **Deux créations de projet simultanées sur la même montre** : une seule réussit (201), l'autre reçoit 409 explicite, jamais 500. → Tâche 28.
3. **Réordonnancement avec une liste invalide** (identifiant en double, manquant ou appartenant à un autre projet) : 400 et ordre inchangé. → Tâche 19.
4. **Email avec majuscules ou espaces** à la connexion, au renvoi et au mot de passe oublié : le même compte est retrouvé ; une adresse inconnue donne la même réponse qu'une adresse connue là où RG-CPT-10 l'exige. → Tâches 8, 9, 10.
5. **Nombres hors bornes ou mal formés** (prix `100000000`, marche `1000`, montant à 3 décimales, texte à la place d'un nombre) : 400 avec message, jamais 500 sur une violation de `NUMERIC`. → Tâches 14, 24, 25, 26.

---

## Tranche 1 — Socle

### Task 1: Monorepo, Docker et configuration

**Files:**
- Create: `package.json` (workspaces `apps/*`, scripts `dev:api`, `dev:web`, `test:api`, `test:web`, `lint`), `docker-compose.yml`, `docker/postgres/init-test-db.sql`, `.env.example`, `apps/.gitkeep` retiré
- Modify: `.gitignore` (garder `.env`, `node_modules/`, ajouter `uploads/`)

**Interfaces:**
- Produces: variables d'environnement documentées dans `.env.example` : `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SESSION_SECRET`, `JWT_LINK_SECRET`, `WEB_ORIGIN`, `COOKIE_SECURE`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, `STORAGE_DRIVER` (`local`|`s3`), `UPLOAD_DIR`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `THROTTLE_LIMIT`, `THROTTLE_TTL_SECONDS`.

- [ ] **Step 1: Écrire `docker-compose.yml`** avec `postgres:16` (port 5432, base `watch_tracker`, volume nommé) et `maildev/maildev` (SMTP 1025, interface 1080). `init-test-db.sql` crée la base `watch_tracker_test`.
- [ ] **Step 2: Écrire `package.json` racine et `.env.example`** avec les variables ci-dessus et des valeurs de dev (hôte PostgreSQL `127.0.0.1`).
- [ ] **Step 3: Vérifier.** Run: `docker compose up -d && psql postgresql://postgres:postgres@127.0.0.1:5432/watch_tracker_test -c "select 1"`. Expected : une ligne `1`. L'interface MailDev répond sur `http://localhost:1080`.
- [ ] **Step 4: Commit** `chore : ajoute le monorepo npm, docker-compose (postgres 16, maildev) et .env.example`

### Task 2: Squelette API, Prisma, migration 0 et seed

**Files:**
- Create: `apps/api/` (projet NestJS, `src/main.ts`, `src/app.module.ts`, `src/health.controller.ts`), `apps/api/src/prisma/prisma.module.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/0_init/migration.sql`, `apps/api/prisma/seed.ts`
- Test: `apps/api/test/seed.int-spec.ts`

**Interfaces:**
- Produces: `PrismaService extends PrismaClient` (module global) ; `GET /health` → `{ status: 'ok' }` (public) ; `npm run db:reset -w apps/api` (migrate reset + seed).

- [ ] **Step 1: Générer le projet NestJS dans `apps/api`**, Prisma en dépendance, `prisma.seed` configuré dans son `package.json`.
- [ ] **Step 2: Migration 0.** Copier `db/script_db.sql` tel quel dans `prisma/migrations/0_init/migration.sql`, appliquer, puis `prisma db pull` et `prisma generate`.
- [ ] **Step 3: Écrire `seed.ts`** : lit `db/seed_reference_data.sql` et l'exécute avec le client `pg` (protocole simple, plusieurs instructions).
- [ ] **Step 4: Écrire le test** `seed.int-spec.ts` :
  - `seed charge 2 types de mouvement et 5 complications`
  - `seed charge 22 étapes de base manuelles et 24 automatiques`
  - `seed charge 15 étapes de complications` (chronographe 5, date 3, jour/date 3, petite seconde 2, réserve de marche 2)
- [ ] **Step 5: Run** `npm run db:reset -w apps/api && npm run test:int -w apps/api -- seed`. Expected : FAIL avant le seed (comptes à 0), PASS après.
- [ ] **Step 6: Commit** `feat : ajoute le squelette api, la migration initiale prisma et le seed du référentiel`

### Task 3: Harnais de tests d'intégration et contraintes de la base

**Files:**
- Create: `apps/api/test/helpers/test-app.ts`, `apps/api/test/helpers/factories.ts`, `apps/api/test/global-setup.ts`, `apps/api/jest.int.config.ts`
- Test: `apps/api/test/db-constraints.int-spec.ts`

**Interfaces:**
- Produces :
  - `createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService; mail: FakeMail }>` ;
  - `resetUserData(prisma): Promise<void>` (tronque `users` en cascade, laisse le référentiel) ;
  - `createUser(prisma, opts?: { email?: string; password?: string; verified?: boolean }): Promise<{ id: number; email: string; password: string }>` ;
  - `createWatch(prisma, userId, opts?): Promise<{ id: number }>` ;
  - `createProject(prisma, watchId, opts?: { status?: 'in_progress'|'completed' }): Promise<{ id: number }>`.
- `global-setup.ts` : `prisma migrate reset --force` sur `TEST_DATABASE_URL` (migration + seed).

- [ ] **Step 1: Écrire `db-constraints.int-spec.ts`** (SQL brut via `prisma.$executeRaw`, chaque cas attend un rejet) :
  - `RG-ETP-01 refuse une étape type avec mouvement et complication`, `…sans aucun des deux`
  - `RG-ETP-02 refuse deux étapes de même rang ou de même libellé dans une liste`
  - `RG-PRJ-09 refuse un second projet en cours sur la même montre`
  - `RG-PER-03 refuse un beat error négatif`, `…une amplitude négative`, `accepte une marche négative`
  - `RG-FIN-10 refuse une revente antérieure à l'achat`, `accepte si l'achat est inconnu`
  - `RG-FIN-03 refuse un prix de revente sans date`
  - `RG-SEC-05 supprimer un projet efface étapes, photos, mesures et coûts mais garde la montre`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- db-constraints`. Expected : FAIL (helpers absents).
- [ ] **Step 3: Implémenter** les helpers listés dans Interfaces.
- [ ] **Step 4: Run** même commande. Expected : PASS.
- [ ] **Step 5: Commit** `test : ajoute le harnais d'intégration et les tests des contraintes de la base`

### Task 4: Squelette web

**Files:**
- Create: `apps/web/` (Vite + Vue 3 + TypeScript), `src/main.ts`, `src/App.vue`, `src/router/index.ts`, `src/styles/tokens.css`, `src/styles/base.css`
- Test: `apps/web/src/App.spec.ts`

**Interfaces:**
- Produces : variables CSS de `design/2026-07-09-design-system-style-guide-technique-luminova-green.html` (`--bg`, `--surface`, `--border`, `--text`, `--text-secondary`, `--accent`, `--danger`, `--success`, `--radius`, `--space-1` à `--space-8`, `--touch-min`, `--font-sans`) dans `tokens.css` ; routeur vide ; Pinia installé ; `VITE_API_URL` lue par `src/api/client.ts` (tâche 12).

- [ ] **Step 1: Écrire `App.spec.ts`** : `monte l'application et affiche le routeur`.
- [ ] **Step 2: Run** `npm run test:web`. Expected : FAIL.
- [ ] **Step 3: Générer le projet Vite**, ajouter Vue Router, Pinia, Vitest, `@vue/test-utils`, jsdom ; copier les variables CSS depuis le design system.
- [ ] **Step 4: Run** `npm run test:web`. Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute le squelette web (vite, vue 3, pinia, variables du design system)`

### Task 5: Intégration continue

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Écrire le workflow** : déclenché sur push `dev` et PR vers `staging` et `main` ; service `postgres:16` ; étapes `npm ci`, lint, `npm run test:api`, `npm run test:web`. Les tests E2E n'y figurent pas (lancement manuel).
- [ ] **Step 2: Vérifier.** Pousser la branche et constater que le workflow passe au vert (Run : `gh run watch`). Expected : succès.
- [ ] **Step 3: Commit** `chore : ajoute le workflow github actions (lint et tests)`

---

## Tranche 2 — Compte

### Task 6: Briques communes de l'API

**Files:**
- Create: `apps/api/src/common/public.decorator.ts`, `current-user.decorator.ts`, `is-not-future-date.validator.ts`, `normalized-email.decorator.ts`, `prisma-exception.filter.ts`, `apps/api/src/config/configuration.ts`
- Modify: `apps/api/src/main.ts` (ValidationPipe `whitelist`, `forbidNonWhitelisted`, `transform` ; CORS limité à `WEB_ORIGIN` avec `credentials: true` ; `cookie-parser`), `app.module.ts`
- Test: `apps/api/src/common/common.spec.ts`

**Interfaces:**
- Produces :
  - `@Public()` ; `@CurrentUser(): { id: number }` ;
  - `@IsNotFutureDate()` : valide une date ISO ≤ maintenant ;
  - `@NormalizedEmail()` : `trim`, minuscules, `IsEmail` ;
  - `PrismaExceptionFilter` : `P2002` → 409, `P2025` → 404 ;
  - corps d'erreur `{ statusCode, code?, message }` ;
  - `configuration()` lit l'environnement et échoue au démarrage si un secret manque.

- [ ] **Step 1: Écrire `common.spec.ts`** :
  - `RG-GEN-01 accepte aujourd'hui, refuse demain`
  - `RG-CPT-13 normalise " Foo@Bar.FR " en "foo@bar.fr"`
  - `RG-CPT-02 refuse un format d'email invalide`
  - `la configuration échoue sans JWT_SESSION_SECRET`
- [ ] **Step 2: Run** `npm run test -w apps/api -- common`. Expected : FAIL.
- [ ] **Step 3: Implémenter** les briques ci-dessus.
- [ ] **Step 4: Run** même commande. Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute les briques communes de l'api (validation, config, filtre prisma, cors)`

### Task 7: Service d'envoi d'emails

**Files:**
- Create: `apps/api/src/mail/mail.module.ts`, `mail.service.ts`, `mail.constants.ts`
- Modify: `apps/api/test/helpers/test-app.ts` (transport factice `FakeMail`)
- Test: `apps/api/src/mail/mail.service.spec.ts`

**Interfaces:**
- Produces :
  - `MailService.sendVerificationEmail(to: string, link: string): Promise<void>` ;
  - `MailService.sendPasswordResetEmail(to: string, link: string): Promise<void>` ;
  - jeton d'injection `MAIL_TRANSPORT` (nodemailer `Transporter`), remplacé par un transport `jsonTransport` en test ;
  - `FakeMail.sent: { to: string; subject: string; text: string }[]`.

- [ ] **Step 1: Écrire le test** : `envoie un email de vérification en français contenant le lien` ; `envoie un email de réinitialisation contenant le lien`.
- [ ] **Step 2: Run** `npm run test -w apps/api -- mail`. Expected : FAIL.
- [ ] **Step 3: Implémenter** `MailService` sur `nodemailer` (hôte et port lus en configuration, expéditeur `MAIL_FROM`).
- [ ] **Step 4: Run.** Expected : PASS. Contrôle manuel facultatif : un envoi réel apparaît dans MailDev (`http://localhost:1080`).
- [ ] **Step 5: Commit** `feat : ajoute le service d'envoi d'emails (nodemailer, maildev en dev)`

### Task 8: Inscription, vérification d'adresse et renvoi du lien

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `tokens.service.ts`, `dto/register.dto.ts`, `dto/email.dto.ts`, `dto/token.dto.ts`
- Test: `apps/api/test/auth-register.int-spec.ts`

**Interfaces:**
- Produces :
  - `TokensService.signLink(kind: 'verify'|'reset', userId: number): string` et `verifyLink(kind, token): { sub: number; iat: number }` (secret `JWT_LINK_SECRET`, claim `typ` pour interdire l'usage croisé, durées 24 h et 1 h) ;
  - `AuthService.register(dto: RegisterDto): Promise<void>` ; `verifyEmail(token: string): Promise<void>` ; `resendVerification(email: string): Promise<void>` ;
  - `POST /auth/register` `{ email, password, acceptTerms }` → 201, aucune session ; 409 `EMAIL_ALREADY_USED` ;
  - `POST /auth/verify-email` `{ token }` → 204 ; lien invalide, expiré ou adresse déjà vérifiée → 400 `INVALID_LINK` ;
  - `POST /auth/resend-verification` `{ email }` → 204 dans tous les cas.

- [ ] **Step 1: Écrire les tests :**
  - `S1 crée le compte sans session et envoie l'email de vérification` (hash bcrypt en base, `email_verified_at` vide)
  - `RG-CPT-13 enregistre " Foo@Bar.fr " en minuscules` ; `S1 refuse une adresse déjà utilisée avec 409`
  - `RG-CPT-03 refuse un mot de passe de 7 caractères` ; `RG-CPT-17 refuse sans acceptTerms`
  - `S1 le lien confirme l'adresse` ; `RG-CPT-08 refuse un lien déjà utilisé`, `…un lien expiré`, `…un jeton de réinitialisation`
  - `S39 renvoie un lien si le compte existe et n'est pas vérifié` ; `S39 n'envoie rien si déjà vérifié mais répond pareil` ; `S39 répond pareil pour une adresse inconnue` ; `renvoi avec " FOO@bar.fr " retrouve le compte`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- auth-register`. Expected : FAIL.
- [ ] **Step 3: Implémenter** les signatures ci-dessus : bcrypt pour le hachage ; lien `${WEB_ORIGIN}/verify-email?token=…` ; « déjà vérifié » se décide par `email_verified_at`.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute l'inscription, la vérification d'adresse et le renvoi du lien`

### Task 9: Connexion, renouvellement, déconnexion et garde globale

**Files:**
- Create: `apps/api/src/auth/jwt-auth.guard.ts`, `dto/login.dto.ts`
- Modify: `auth.controller.ts`, `auth.service.ts`, `tokens.service.ts`, `app.module.ts` (garde globale)
- Test: `apps/api/test/auth-session.int-spec.ts`

**Interfaces:**
- Consumes : `@Public()`, `@CurrentUser()` (tâche 6), `TokensService` (tâche 8).
- Produces :
  - `TokensService.signSession(kind: 'access'|'refresh', userId: number): string` et `verifySession(kind, token): { sub: number; iat: number }` (secret `JWT_SESSION_SECRET`) ;
  - `AuthService.login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }>` ; `refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>` ;
  - `POST /auth/login` → 200 `{ accessToken }` + cookie `refresh_token` ; 401 `INVALID_CREDENTIALS` ; 403 `EMAIL_NOT_VERIFIED` ;
  - `POST /auth/refresh` (cookie) → 200 `{ accessToken }` + cookie renouvelé ; 401 sans cookie valide ;
  - `POST /auth/logout` → 204, efface le cookie ;
  - `JwtAuthGuard` global.

- [ ] **Step 1: Écrire les tests :**
  - `S2 refuse un compte non vérifié avec EMAIL_NOT_VERIFIED, distinct d'identifiants invalides`
  - `RG-CPT-07 email inconnu et mauvais mot de passe donnent la même réponse`
  - `S2 un compte non vérifié avec mauvais mot de passe reçoit INVALID_CREDENTIALS`
  - `login accepte " FOO@Bar.fr "` (email normalisé)
  - `RG-CPT-12 le cookie refresh_token est httpOnly, SameSite=Lax, chemin /auth`
  - `refresh renvoie un nouveau jeton d'accès` ; `refresh refuse un jeton d'accès à la place du jeton de renouvellement`
  - `RG-SEC-03 GET /watches sans jeton donne 401` ; `GET /health reste public`
  - `session : un jeton de renouvellement émis avant password_changed_at est refusé` (**proposé, §5 de la note, à confirmer**)
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- auth-session`. Expected : FAIL.
- [ ] **Step 3: Implémenter.** Contrôler le mot de passe **avant** l'état de vérification. Refuser un jeton de renouvellement dont `iat` est antérieur à `floor(password_changed_at / 1000)`.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la connexion, le renouvellement de session et la garde d'authentification`

### Task 10: Mot de passe oublié, réinitialisation et changement

**Files:**
- Create: `apps/api/src/account/account.module.ts`, `account.controller.ts`, `account.service.ts`, `dto/reset-password.dto.ts`, `dto/change-password.dto.ts`
- Modify: `auth.controller.ts`, `auth.service.ts`
- Test: `apps/api/test/auth-password.int-spec.ts`

**Interfaces:**
- Produces :
  - `AuthService.forgotPassword(email: string): Promise<void>` ; `resetPassword(token: string, password: string): Promise<void>` ;
  - `AccountService.changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>` ;
  - `POST /auth/forgot-password` `{ email }` → 204 toujours ; `POST /auth/reset-password` `{ token, password }` → 204 ou 400 `INVALID_LINK` ; `PATCH /account/password` `{ currentPassword, newPassword }` → 204 ou 400 `WRONG_PASSWORD`.

- [ ] **Step 1: Écrire les tests :**
  - `S3 répond pareil pour une adresse connue et inconnue` ; `forgot-password avec " FOO@Bar.fr " retrouve le compte`
  - `S3 envoie un lien si le compte existe`
  - `RG-CPT-09 le lien change le mot de passe puis ne peut plus servir` ; `…un lien de plus d'une heure est refusé` ; `…un jeton de vérification est refusé`
  - `RG-CPT-03 refuse un nouveau mot de passe de 7 caractères`
  - `S4 change le mot de passe avec le bon mot de passe actuel et met à jour password_changed_at`
  - `S4 refuse un mot de passe actuel incorrect`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- auth-password`. Expected : FAIL.
- [ ] **Step 3: Implémenter.** Le lien de réinitialisation est refusé si son `iat` précède `password_changed_at` (usage unique sans table de jetons).
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la réinitialisation et le changement de mot de passe`

### Task 11: Limitation des tentatives

**Files:**
- Modify: `apps/api/src/app.module.ts` (`ThrottlerModule`), `auth.controller.ts` (`@Throttle` sur `login`, `forgot-password`, `resend-verification`)
- Test: `apps/api/test/auth-throttle.int-spec.ts`

**Interfaces:**
- Consumes : `THROTTLE_LIMIT`, `THROTTLE_TTL_SECONDS` (défaut proposé : 5 par 60 s et par IP).
- Produces : réponse 429 `{ code: 'TOO_MANY_REQUESTS', message }` en français.

- [ ] **Step 1: Écrire les tests** (application créée avec une limite de 3) :
  - `S36 la 4e tentative de connexion depuis la même IP reçoit 429`
  - `S36 la demande de réinitialisation est limitée` ; `S39 le renvoi du lien est limité`
  - `les autres routes ne sont pas limitées`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- auth-throttle`. Expected : FAIL.
- [ ] **Step 3: Implémenter** avec `@nestjs/throttler`, désactivé hors de ces trois routes.
- [ ] **Step 4: Run.** Expected : PASS. Dans les autres tests d'intégration, la limite est élevée par la configuration de test.
- [ ] **Step 5: Commit** `feat : limite les tentatives de connexion, de réinitialisation et de renvoi`

### Task 12: Écrans d'authentification (web)

**Files:**
- Create: `apps/web/src/api/client.ts`, `src/stores/auth.ts`, `src/views/auth/LoginView.vue`, `RegisterView.vue`, `ForgotPasswordView.vue`, `ResetPasswordView.vue`, `VerifyEmailView.vue`, `src/router/guards.ts`
- Test: `apps/web/src/api/client.spec.ts`, `apps/web/src/stores/auth.spec.ts`, `apps/web/src/views/auth/RegisterView.spec.ts`

**Interfaces:**
- Produces :
  - `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` : ajoute `Authorization: Bearer`, `credentials: 'include'`, tente **un** `POST /auth/refresh` sur 401 puis rejoue ; lève `ApiError { status: number; code?: string; message: string }` ;
  - `useAuthStore()` : `accessToken: string | null`, `isAuthenticated`, `bootstrap(): Promise<void>` (appelle `/auth/refresh` au démarrage), `login(email, password)`, `logout()` ;
  - garde de route : routes publiques `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` ; le reste redirige vers `/login`.
- Maquettes : `design/2026-10-09-screen-auth-*.html`.

- [ ] **Step 1: Écrire les tests :**
  - `apiFetch rejoue la requête après un refresh réussi sur 401` ; `apiFetch ne boucle pas si le refresh échoue`
  - `bootstrap ouvre la session si le cookie est valide`
  - `RG-CPT-16 l'inscription est bloquée si la confirmation diffère` ; `RG-CPT-17 …sans acceptation des CGV`
  - `S2 affiche un message distinct pour EMAIL_NOT_VERIFIED`
- [ ] **Step 2: Run** `npm run test:web -- auth client`. Expected : FAIL.
- [ ] **Step 3: Implémenter** le client, le store, les cinq vues (textes d'après les maquettes) et la garde. Le lien d'un email est lu dans `?token=`.
- [ ] **Step 4: Run.** Expected : PASS. Vérification manuelle : inscription puis lien dans MailDev puis connexion.
- [ ] **Step 5: Commit** `feat : ajoute les écrans d'authentification et le client api (refresh automatique)`

---

## Tranche 3 — Référentiel et aperçu

### Task 13: Référentiel et génération des étapes

**Files:**
- Create: `apps/api/src/reference-data/reference-data.module.ts`, `reference-data.controller.ts`, `apps/api/src/step-generation/step-generation.service.ts`, `step-previews.controller.ts`
- Test: `apps/api/test/step-generation.int-spec.ts`

**Interfaces:**
- Produces :
  - `GET /movement-types` → `{ movementCode: 'manual'|'automatic'; label: string }[]` ;
  - `GET /complications` → `{ complicationCode: string; label: string }[]` ;
  - `StepGenerationService.generate(movementCode: 'manual'|'automatic', complicationCodes: string[]): Promise<GeneratedStep[]>` avec `GeneratedStep = { label: string; stepOrder: number; complicationCode: string | null; complicationLabel: string | null }` ;
  - `GET /step-previews?movementCode=&complicationCodes=` (liste séparée par virgules) → `GeneratedStep[]` ; 400 si un code est inconnu.

- [ ] **Step 1: Écrire les tests :**
  - `S6 manuel sans complication donne les 22 étapes de base dans l'ordre`
  - `S6 automatique ajoute la dépose et la pose du rotor (24 étapes)`
  - `S7 manuel + chronographe + date donne 30 étapes`
  - `S7 « Déposer les aiguilles chrono » (350) est entre « Déposer les aiguilles » (300) et « Déposer le cadran » (400)`
  - `RG-ETP-05 chaque étape de complication porte le nom de la complication, celles de base portent null`
  - `RG-ETP-04 à rang égal, l'étape de base précède celle de la complication, puis ordre du code` (cas date + jour/date au rang 420 : `date` avant `day_date`)
  - `RG-ETP-05 une complication donne les mêmes étapes pour manuel et automatique`
  - `l'aperçu ne persiste rien` (comptage de `restoration_steps` inchangé)
  - `RG-ETP-03 aucune route d'écriture sur le référentiel` (`POST /complications` donne 404)
  - `RG-SEC-03 l'aperçu exige une session`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- step-generation`. Expected : FAIL.
- [ ] **Step 3: Implémenter** `generate` : lecture des `template_steps` du mouvement et des complications, tri `(stepOrder, origine base d'abord, complicationCode)`.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute le référentiel et la génération de l'aperçu des étapes`

---

## Tranche 4 — Création montre et projet

### Task 14: Créer une montre et son premier projet (atomique)

**Files:**
- Create: `apps/api/src/watches/watches.module.ts`, `watches.controller.ts`, `watches.service.ts`, `dto/create-watch.dto.ts`
- Test: `apps/api/test/watches-create.int-spec.ts`

**Interfaces:**
- Consumes : `@CurrentUser()`, `IsNotFutureDate` (tâche 6).
- Produces :
  - `CreateWatchDto { brand: string; model: string; movementCode: 'manual'|'automatic'; complicationCodes?: string[]; purchasePrice?: string | number; purchaseDate?: string; steps: { label: string }[] }` (`steps` non vide, libellé ≤ 255) ;
  - `WatchesService.create(userId: number, dto: CreateWatchDto): Promise<WatchDetail>` : une seule écriture imbriquée ; les étapes sont renumérotées 1, 2, 3… avec note vide et statut « à faire » ;
  - `POST /watches` → 201 `WatchDetail` (défini en tâche 15).

- [ ] **Step 1: Écrire les tests :**
  - `S5 crée la montre, ses complications, son projet en cours et ses étapes`
  - `RG-ETP-07 les étapes sont renumérotées 1..n, note vide, non terminées`
  - `S8 le projet contient exactement la liste ajustée` ; `S8 le référentiel et les autres projets ne changent pas`
  - `RG-PRJ-03 si la création des étapes échoue, ni montre ni projet ne sont enregistrés` (étape de 256 caractères détectée par la base, ou transaction forcée en erreur)
  - `RG-MON-06 prix et date d'achat facultatifs` ; `S5 refuse une date d'achat future`
  - `RG-MON-07 refuse un prix négatif` ; `refuse un prix de 100000000` ; `refuse 12.345` ; `refuse "abc"` (400, jamais 500)
  - `RG-MON-01 refuse sans marque` ; `RG-GEN-02 refuse une marque de 256 caractères`
  - `RG-MON-04 refuse une complication inconnue`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- watches-create`. Expected : FAIL.
- [ ] **Step 3: Implémenter** `create` avec `prisma.watch.create({ data: { …, complications: { create }, projects: { create: { steps: { create } } } } })` ; DTO : `@IsNumber({ maxDecimalPlaces: 2 })`, `@Min(0)`, `@Max(99999999.99)`.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la création atomique d'une montre et de son premier projet`

### Task 15: Propriété, détail d'une montre et marge

**Files:**
- Create: `apps/api/src/common/ownership.service.ts`, `apps/api/src/watches/margin.ts`, `apps/api/src/watches/watch-detail.ts`
- Modify: `watches.controller.ts`, `watches.service.ts`
- Test: `apps/api/src/watches/margin.spec.ts`, `apps/api/test/watches-detail.int-spec.ts`

**Interfaces:**
- Produces :
  - `OwnershipService.findOwnedWatch(userId, watchId)`, `findOwnedProject(userId, projectId)`, `findOwnedStep(userId, projectId, stepId)` : renvoient l'entité ou lèvent `NotFoundException` ; la propriété est vérifiée **dans la requête** en remontant jusqu'à `users` ;
  - `computeMargin(input: { resalePrice: Decimal | null; purchasePrice: Decimal | null; expenses: Decimal[] }): Decimal | null` ;
  - `WatchDetail = { id; brand; model; movementCode; complications: { code; label }[]; purchasePrice: string|null; purchaseDate: string|null; resalePrice: string|null; resaleDate: string|null; margin: string|null; projects: ProjectDetail[] }`, projets du plus récent au plus ancien ;
  - `ProjectDetail = { id; status: 'in_progress'|'completed'; createdAt; completedAt: string|null; photoBefore: string|null; photoAfter: string|null; steps: StepDetail[]; measurements: MeasurementDetail[]; expenses: ExpenseDetail[] }` (étapes par `stepOrder`, mesures par `measuredAt`) ;
  - `StepDetail = { id; stepOrder; label; notes: string|null; isCompleted; completedAt: string|null; photos: { id; url }[] }` ;
  - `GET /watches/:id` → `WatchDetail`.

- [ ] **Step 1: Écrire les tests :**
  - unitaires `margin.spec.ts` : `S23 200 − 80 − (25 + 15) = 80.00` ; `S24 pas de marge si non vendue` ; `S24 pas de marge si prix d'achat inconnu` ; `RG-FIN-06 aucune erreur d'arrondi : 0.10 + 0.20 de coûts donne 0.30`
  - intégration : `S23 la marge additionne les coûts de tous les projets de la montre`
  - `RG-FIN-09 les coûts sont renvoyés par projet`
  - `S26 les projets sont triés du plus récent au plus ancien`
  - `RG-SEC-01 / S27 la montre d'un autre utilisateur répond 404, comme une montre inexistante` (même corps de réponse)
  - `RG-SEC-04 un identifiant deviné ne révèle rien`
- [ ] **Step 2: Run** `npm run test -w apps/api -- margin && npm run test:int -w apps/api -- watches-detail`. Expected : FAIL.
- [ ] **Step 3: Implémenter** les trois éléments. `margin` en `Decimal`, sérialisée avec `toFixed(2)`.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute le détail d'une montre, le calcul de la marge et le contrôle de propriété`

### Task 16: Tableau de bord (liste et filtre par statut)

**Files:**
- Create: `apps/api/src/watches/status.ts`
- Modify: `watches.controller.ts`, `watches.service.ts`
- Test: `apps/api/src/watches/status.spec.ts`, `apps/api/test/watches-list.int-spec.ts`

**Interfaces:**
- Produces :
  - `type DashboardStatus = 'in_progress' | 'completed' | 'sold' | 'no_project'` ;
  - `computeStatus(watch: { resaleDate: string | null; latestProjectStatus: 'in_progress'|'completed'|null }): DashboardStatus` (vendue prime sur le projet) ;
  - `WatchCard = { id; brand; model; movementCode; complicationLabels: string[]; status: DashboardStatus; thumbnailUrl: string | null; margin: string | null }` ;
  - `GET /watches?status=` → `{ items: WatchCard[]; counts: { all: number; in_progress: number; completed: number; sold: number; no_project: number } }` ; `counts` ignore le filtre ; `status` inconnu → 400.

- [ ] **Step 1: Écrire les tests :**
  - `RG-AFF-02 une montre vendue affiche « sold » même si son dernier projet est terminé`
  - `RG-AFF-05 une montre sans projet a le statut no_project et pas de miniature`
  - `RG-AFF-01 la miniature est photo_after du projet le plus récent, sinon photo_before`
  - `RG-PRJ-08 le projet le plus récent est celui de created_at le plus récent`
  - `S40 le filtre ne renvoie que les montres du statut, counts reste global`
  - `S40 un statut sans montre renvoie items vide`
  - `RG-SEC-01 la liste ne contient que mes montres`
  - `RG-AFF-02 la marge n'apparaît que si la montre est vendue et calculable`
- [ ] **Step 2: Run** `npm run test -w apps/api -- status && npm run test:int -w apps/api -- watches-list`. Expected : FAIL.
- [ ] **Step 3: Implémenter** avec une seule requête chargeant montres, complications, dernier projet et coûts (pas de N+1).
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la liste des montres avec statut, marge et filtre`

### Task 17: Modifier une montre

**Files:**
- Create: `apps/api/src/watches/dto/update-watch.dto.ts`
- Modify: `watches.controller.ts`, `watches.service.ts`
- Test: `apps/api/test/watches-update.int-spec.ts`

**Interfaces:**
- Produces : `UpdateWatchDto` (champs de `CreateWatchDto` sauf `steps`, tous facultatifs) ; `WatchesService.update(userId, watchId, dto): Promise<WatchDetail>` ; `PATCH /watches/:id`.

- [ ] **Step 1: Écrire les tests :**
  - `S10 modifier les complications n'affecte pas les étapes des projets existants`
  - `RG-MON-08 le prochain aperçu utilise les complications modifiées`
  - `S10 remplace l'ensemble des complications de la montre`
  - `RG-SEC-01 la montre d'un autre utilisateur répond 404`
  - `RG-FIN-10 refuse une date d'achat postérieure à la revente`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- watches-update`. Expected : FAIL.
- [ ] **Step 3: Implémenter** `update` (remplacement des lignes `comporte` dans une transaction).
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la modification d'une montre et de ses complications`

### Task 18: Tableau de bord, nouveau projet et détail d'une montre (web)

**Files:**
- Create: `apps/web/src/stores/watches.ts`, `src/views/DashboardView.vue`, `NewProjectView.vue`, `WatchDetailView.vue`, `src/components/WatchCard.vue`, `StatusFilter.vue`, `StepPreview.vue`, `ProjectSelector.vue`
- Test: `apps/web/src/stores/watches.spec.ts`, `src/views/DashboardView.spec.ts`, `src/views/NewProjectView.spec.ts`
- Maquettes : `design/2026-09-23-screen-dashboard-*.html`, `2026-09-25-screen-new-project-*.html`, `2026-09-25-screen-project-detail-*.html`.

**Interfaces:**
- Consumes : `apiFetch`, `WatchCard`, `WatchDetail`, `GeneratedStep`.
- Produces : routes `/` (tableau de bord), `/projects/new`, `/watches/:id` ; `useWatchesStore()` : `list(status?)`, `get(id)`, `create(payload)`, `fetchPreview(movementCode, complicationCodes)`.

- [ ] **Step 1: Écrire les tests :**
  - `S25 affiche une carte par montre avec statut et marge` ; `S40 le filtre affiche les montres du statut et met à jour le compteur` ; `S40 message quand aucun statut ne correspond`
  - `S5 la création envoie la liste d'étapes ajustée` ; `S8 supprimer ou déplacer une étape de l'aperçu modifie l'envoi`
  - `S26 le sélecteur de projet n'apparaît qu'avec 2 projets ou plus`
- [ ] **Step 2: Run** `npm run test:web -- watches Dashboard NewProject`. Expected : FAIL.
- [ ] **Step 3: Implémenter** les trois écrans d'après les maquettes (mobile d'abord, desktop ensuite). Formulaire « Nouvelle montre » avec complications à cocher et aperçu ajustable (ajout, suppression, déplacement par boutons).
- [ ] **Step 4: Run.** Expected : PASS. Vérification manuelle : créer une montre manuelle + chronographe + date et voir 30 étapes.
- [ ] **Step 5: Commit** `feat : ajoute le tableau de bord, le nouveau projet et le détail d'une montre`

---

## Tranche 5 — Étapes

### Task 19: API des étapes

**Files:**
- Create: `apps/api/src/steps/steps.module.ts`, `steps.controller.ts`, `steps.service.ts`, `dto/create-step.dto.ts`, `dto/update-step.dto.ts`, `dto/reorder-steps.dto.ts`
- Test: `apps/api/test/steps.int-spec.ts`

**Interfaces:**
- Consumes : `OwnershipService.findOwnedProject`, `findOwnedStep` (tâche 15).
- Produces :
  - `StepsService.add(userId, projectId, label): Promise<StepDetail>` ; `update(userId, projectId, stepId, dto: { label?: string; notes?: string | null; isCompleted?: boolean }): Promise<StepDetail>` ; `remove(userId, projectId, stepId): Promise<void>` ; `reorder(userId, projectId, stepIds: number[]): Promise<StepDetail[]>` ;
  - `POST /projects/:id/steps`, `PATCH /projects/:id/steps/:stepId`, `DELETE /projects/:id/steps/:stepId`, `PUT /projects/:id/steps/order` `{ stepIds }`.

- [ ] **Step 1: Écrire les tests :**
  - `S13 l'étape ajoutée prend le rang suivant` ; `RG-ETP-08 refuse un libellé vide` ; `RG-GEN-02 refuse 256 caractères`
  - `S12 valider une étape renseigne completedAt, dans n'importe quel ordre`
  - `S29 décocher efface completedAt`
  - `S14 / S16 modifier libellé et note garde les photos et le statut`
  - `S30 supprimer une étape renumérote 1..n sans trou` ; `S30 ses photos disparaissent`
  - `S15 réordonner renumérote sans trou ni doublon et chaque étape garde note, photos et statut`
  - `RG-ETP-12 la liste doit contenir exactement les étapes du projet` : cas `identifiant en double`, `identifiant manquant`, `identifiant d'un autre projet` → 400 et ordre inchangé
  - `S15 un échec en cours d'écriture conserve l'ordre précédent`
  - `RG-SEC-01 étape ou projet d'un autre utilisateur répond 404` pour les quatre routes
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- steps`. Expected : FAIL.
- [ ] **Step 3: Implémenter** dans des `prisma.$transaction` ; `reorder` renumérote 1..n en un lot.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute l'ajout, la modification, la suppression et le réordonnancement des étapes`

### Task 20: Checklist (web)

**Files:**
- Create: `apps/web/src/components/StepList.vue`, `StepItem.vue`, `StepEditor.vue`, `ConfirmDialog.vue`
- Modify: `WatchDetailView.vue`, `src/stores/watches.ts`
- Test: `apps/web/src/components/StepList.spec.ts`

**Interfaces:**
- Produces : `ConfirmDialog` (élément natif `<dialog>`, props `title`, `message`, `confirmLabel`, événements `confirm` et `cancel`) réutilisé aux tâches 29, 30 et 31 ; méthodes du store `addStep`, `updateStep`, `removeStep`, `reorderSteps(projectId, stepIds)`.

- [ ] **Step 1: Écrire les tests :** `S12 cocher une étape envoie isCompleted` ; `S29 décocher` ; `S15 « monter » échange une étape avec la précédente et envoie la liste complète` ; `le premier élément n'a pas de bouton « monter », le dernier pas de « descendre »` ; `S30 la suppression demande confirmation`.
- [ ] **Step 2: Run** `npm run test:web -- StepList`. Expected : FAIL.
- [ ] **Step 3: Implémenter** la liste (réalisées / à faire), l'édition du libellé et de la note, l'ajout, les boutons monter / descendre.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la checklist interactive (validation, note, ajout, réordonnancement)`

---

## Tranche 6 — Photos

### Task 21: Service de stockage

**Files:**
- Create: `apps/api/src/storage/storage.module.ts`, `storage.service.ts`, `local-storage.driver.ts`, `s3-storage.driver.ts`, `image-type.ts`
- Test: `apps/api/src/storage/image-type.spec.ts`, `local-storage.driver.spec.ts`

**Interfaces:**
- Produces :
  - `abstract class StorageService { abstract save(file: { buffer: Buffer }): Promise<{ url: string; key: string }>; abstract delete(url: string): Promise<void> }` ;
  - `detectImageType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null` (octets d'en-tête) ;
  - `LocalStorageDriver` écrit dans `UPLOAD_DIR` et sert `GET /uploads/:key` en statique ; `S3StorageDriver` (compatible S3, `S3_*`) ; sélection par `STORAGE_DRIVER`.

- [ ] **Step 1: Écrire les tests :**
  - `RG-PHO-01 reconnaît JPEG, PNG et WebP`, `renvoie null pour un exécutable ou du texte`
  - `RG-PHO-03 le fichier enregistré s'appelle uuid.ext et jamais le nom d'origine` ; `RG-SEC-06 l'URL contient un identifiant aléatoire`
  - `delete efface le fichier` ; `delete d'un fichier absent ne lève pas d'erreur`
- [ ] **Step 2: Run** `npm run test -w apps/api -- storage image-type`. Expected : FAIL.
- [ ] **Step 3: Implémenter** les deux drivers ; le driver S3 n'est testé qu'à la construction (pas de réseau en CI).
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute le service de stockage des photos (disque local et s3)`

### Task 22: API des photos

**Files:**
- Create: `apps/api/src/photos/photos.module.ts`, `photos.controller.ts`, `photos.service.ts`
- Test: `apps/api/test/photos.int-spec.ts`

**Interfaces:**
- Consumes : `StorageService`, `detectImageType` (tâche 21), `OwnershipService`.
- Produces :
  - `PhotosService.addStepPhoto(userId, projectId, stepId, file: { buffer: Buffer }): Promise<{ id: number; url: string }>` ; `removeStepPhoto(userId, projectId, stepId, photoId): Promise<void>` ; `setProjectPhoto(userId, projectId, kind: 'before'|'after', file): Promise<{ url: string }>` ; `removeProjectPhoto(userId, projectId, kind): Promise<void>` ;
  - `POST /projects/:id/steps/:stepId/photos` (multipart, champ `file`, 10 Mo) → 201 `{ id, url }` ; `DELETE …/photos/:photoId` → 204 ; `PUT /projects/:id/photos/before|after` ; `DELETE /projects/:id/photos/before|after`.

- [ ] **Step 1: Écrire les tests :**
  - `S17 ajoute plusieurs photos à la même étape`
  - `RG-PHO-01 refuse un fichier texte déclaré image/jpeg` : 400, aucun fichier dans `UPLOAD_DIR`, aucune ligne `step_pics`
  - `RG-PHO-02 refuse 10 Mo + 1 octet` : 413 ou 400, aucun fichier écrit
  - `RG-PHO-06 supprimer une photo efface la ligne et le fichier`
  - `RG-PHO-07 remplacer la photo avant efface l'ancien fichier` ; `retirer la photo après efface le fichier et met la colonne à null`
  - `RG-PHO-07 si l'effacement de l'ancien fichier échoue, la requête réussit quand même`
  - `RG-SEC-01 la photo d'une étape d'un autre utilisateur répond 404` (ajout et suppression)
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- photos`. Expected : FAIL.
- [ ] **Step 3: Implémenter.** Ordre : valider le contenu, enregistrer le fichier, écrire la ligne ; si l'écriture en base échoue, supprimer le fichier. Remplacement : mettre à jour la ligne, puis effacer l'ancien fichier sans faire échouer la requête.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute les photos d'étape et les photos avant/après d'un projet`

### Task 23: Photos (web)

**Files:**
- Create: `apps/web/src/utils/compress-image.ts`, `src/components/PhotoGallery.vue`, `BeforeAfter.vue`
- Modify: `StepItem.vue`, `WatchDetailView.vue`
- Test: `apps/web/src/utils/compress-image.spec.ts`, `src/components/BeforeAfter.spec.ts`

**Interfaces:**
- Produces : `compressImage(file: File, maxSide = 1600): Promise<Blob>` (WebP redimensionné, repli sur le fichier d'origine si l'encodage échoue) ; méthodes du store `addStepPhoto`, `removeStepPhoto`, `setProjectPhoto`, `removeProjectPhoto`.

- [ ] **Step 1: Écrire les tests :** `compressImage réduit le plus grand côté à 1600 px` ; `compressImage renvoie le fichier d'origine si le canvas échoue` ; `S18 affiche l'avant et l'après côte à côte quand les deux existent` ; `S17 un fichier de plus de 10 Mo est refusé avant envoi avec un message`.
- [ ] **Step 2: Run** `npm run test:web -- compress BeforeAfter`. Expected : FAIL.
- [ ] **Step 3: Implémenter** la compression, la galerie par étape (ajout multiple, suppression avec confirmation) et le bloc avant/après (ajout, remplacement, retrait).
- [ ] **Step 4: Run.** Expected : PASS. Vérification manuelle : une photo prise au téléphone apparaît dans l'étape.
- [ ] **Step 5: Commit** `feat : ajoute les photos dans l'interface (compression, galerie, avant/après)`

---

## Tranche 7 — Mesures et finances

### Task 24: Mesures de performance

**Files:**
- Create: `apps/api/src/measurements/measurements.module.ts`, `measurements.controller.ts`, `measurements.service.ts`, `dto/measurement.dto.ts`
- Test: `apps/api/test/measurements.int-spec.ts`

**Interfaces:**
- Produces : `MeasurementDto { measuredAt: string; rateSecondsPerDay: number; beatErrorMs: number; amplitudeDegrees: number; watchPosition?: string }` ; `POST /projects/:id/measurements` → 201 `MeasurementDetail` ; `PATCH` et `DELETE /projects/:id/measurements/:measurementId` ; `MeasurementDetail = { id; measuredAt; rateSecondsPerDay: string; beatErrorMs: string; amplitudeDegrees: string; watchPosition: string | null }`.

- [ ] **Step 1: Écrire les tests :**
  - `S19 enregistre une mesure avec position facultative` ; `RG-PER-02 refuse sans beat error`
  - `RG-PER-03 refuse un beat error négatif`, `…une amplitude négative`, `S19 accepte une marche négative`
  - `refuse une marche de 1000`, `…de 12.345`, `…"abc"` (400, jamais 500)
  - `S19 refuse une date de mesure future`
  - `RG-PER-04 les mesures sont renvoyées dans l'ordre chronologique`
  - `S33 modifier applique les mêmes contrôles` ; `S33 supprimer retire la mesure`
  - `RG-SEC-01 le projet d'un autre utilisateur répond 404`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- measurements`. Expected : FAIL.
- [ ] **Step 3: Implémenter** (`@IsNumber({ maxDecimalPlaces: 2 })`, `@Min(0)` et `@Max(999.99)` sauf la marche : `@Min(-999.99)`).
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute les mesures de performance`

### Task 25: Coûts

**Files:**
- Create: `apps/api/src/expenses/expenses.module.ts`, `expenses.controller.ts`, `expenses.service.ts`, `dto/expense.dto.ts`
- Test: `apps/api/test/expenses.int-spec.ts`

**Interfaces:**
- Produces : `ExpenseDto { label: string; amount: number; expenseDate: string }` ; `POST /projects/:id/expenses` → 201 `ExpenseDetail` ; `PATCH` et `DELETE /projects/:id/expenses/:expenseId` ; `ExpenseDetail = { id; label; amount: string; expenseDate: string }`.

- [ ] **Step 1: Écrire les tests :**
  - `S21 enregistre « Couronne », 12 €` ; `RG-FIN-02 refuse un montant négatif`, accepte 0
  - `refuse 100000000`, `…12.345`, `…"abc"` (400, jamais 500)
  - `S21 refuse une date future` ; `RG-GEN-02 refuse un libellé de 256 caractères`
  - `S32 modifier et supprimer, marge recalculée à la lecture` (via `GET /watches/:id`)
  - `RG-SEC-01 le coût d'un autre utilisateur répond 404`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- expenses`. Expected : FAIL.
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute les coûts d'un projet`

### Task 26: Revente

**Files:**
- Create: `apps/api/src/watches/dto/resale.dto.ts`
- Modify: `watches.controller.ts`, `watches.service.ts`
- Test: `apps/api/test/watches-resale.int-spec.ts`

**Interfaces:**
- Produces : `ResaleDto { price: number; date: string }` ; `WatchesService.setResale(userId, watchId, dto): Promise<WatchDetail>` ; `clearResale(userId, watchId): Promise<WatchDetail>` ; `PUT /watches/:id/resale` ; `DELETE /watches/:id/resale`.

- [ ] **Step 1: Écrire les tests :**
  - `S22 enregistre la revente et la montre est vendue` ; `S22 / RG-FIN-05 refusée tant qu'un projet est en cours` (409). Le refus « déjà vendue » de RG-FIN-05 ne s'applique pas à ce `PUT`, qui sert aussi à corriger (S31) : une seconde saisie sur une montre vendue est une correction
  - `RG-FIN-10 refuse une date antérieure à l'achat` ; `accepte si l'achat est inconnu` ; `S22 refuse une date future`
  - `RG-FIN-04 refuse un prix négatif`, `…100000000`, `…12.345`
  - `S31 corriger la revente d'une montre vendue enregistre prix et date ensemble`
  - `S31 annuler remet la montre en non vendue, sans marge` ; `S31 une montre dont la revente est annulée accepte un nouveau projet`
  - `RG-PRJ-05 aucun projet ne peut être ouvert sur une montre vendue` (vérifié en tâche 28)
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- watches-resale`. Expected : FAIL.
- [ ] **Step 3: Implémenter.** `PUT` sert à la saisie et à la correction : refus 409 si un projet est en cours, quelle que soit la montre.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la saisie, la correction et l'annulation de la revente`

### Task 27: Performances et finances (web)

**Files:**
- Create: `apps/web/src/components/PerformanceBlock.vue`, `PerformanceChart.vue`, `MeasurementForm.vue`, `FinanceBlock.vue`, `ExpenseForm.vue`, `ResaleForm.vue`
- Modify: `WatchDetailView.vue`, `src/stores/watches.ts`
- Test: `apps/web/src/components/PerformanceChart.spec.ts`, `FinanceBlock.spec.ts`
- Maquettes : `design/2026-10-07-screen-add-measurement-*.html`, `2026-09-25-screen-project-detail-*.html` (bloc Finances). **Le formulaire de coût n'a pas de maquette** : le construire avec les composants de formulaire de la mesure.

**Interfaces:**
- Produces : Chart.js en import ciblé (`LineController`, `LineElement`, `PointElement`, `LinearScale`, `TimeScale` ou `CategoryScale`, `Tooltip`) ; méthodes du store `addMeasurement`, `updateMeasurement`, `removeMeasurement`, `addExpense`, `updateExpense`, `removeExpense`, `setResale`, `clearResale`.

- [ ] **Step 1: Écrire les tests :** `S20 le graphique reçoit trois séries dans l'ordre chronologique` ; `S19 le formulaire refuse un beat error négatif` ; `S23 le bloc Finances affiche la marge de 80 €` ; `S24 pas de marge affichée si non vendue` ; `RG-FIN-09 les coûts sont regroupés par projet` ; `S22 le formulaire de revente est absent tant qu'un projet est en cours`.
- [ ] **Step 2: Run** `npm run test:web -- PerformanceChart FinanceBlock`. Expected : FAIL.
- [ ] **Step 3: Implémenter** les deux blocs, les formulaires et la liste des dernières mesures.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute les blocs performances et finances`

---

## Tranche 8 — Cycle de vie

### Task 28: Terminer, rouvrir et ouvrir une nouvelle révision

**Files:**
- Create: `apps/api/src/projects/projects.module.ts`, `projects.controller.ts`, `projects.service.ts`, `dto/create-project.dto.ts`
- Test: `apps/api/test/projects.int-spec.ts`

**Interfaces:**
- Produces :
  - `CreateProjectDto { steps: { label: string }[] }` ;
  - `ProjectsService.create(userId, watchId, dto): Promise<ProjectDetail>` ; `complete(userId, projectId): Promise<ProjectDetail>` ; `reopen(userId, projectId): Promise<ProjectDetail>` ;
  - `POST /watches/:id/projects` → 201 ; `POST /projects/:id/complete` → 200 ; `POST /projects/:id/reopen` → 200 ;
  - 409 avec `code` : `WATCH_SOLD`, `PROJECT_ALREADY_IN_PROGRESS`, `PROJECT_ALREADY_COMPLETED`.

- [ ] **Step 1: Écrire les tests :**
  - `S9 ouvre un nouveau projet sur une montre dont le dernier projet est terminé` ; `S9 aussi sur une montre sans projet`
  - `RG-PRJ-05 refuse sur une montre vendue (WATCH_SOLD)` ; `RG-PRJ-09 refuse si un projet est en cours`
  - `RG-PRJ-09 deux créations simultanées : une seule réussit, l'autre reçoit 409 PROJECT_ALREADY_IN_PROGRESS, jamais 500` (deux requêtes lancées en parallèle sur la même montre)
  - `S11 terminer renseigne completedAt` ; `RG-PRJ-06 terminer un projet déjà terminé est refusé`
  - `S28 rouvrir remet en cours et efface completedAt`
  - `S28 refusé si la montre est vendue` ; `S28 refusé si un autre projet est en cours`
  - `RG-SEC-01 le projet d'un autre utilisateur répond 404`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- projects`. Expected : FAIL.
- [ ] **Step 3: Implémenter** : vérifications dans le service pour des messages explicites ; en parallèle la violation de `uq_restoration_projects_one_in_progress` (code Prisma `P2002`) est traduite en 409 `PROJECT_ALREADY_IN_PROGRESS` pour couvrir la course.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la fin, la réouverture et la nouvelle révision d'un projet`

### Task 29: Supprimer un projet ou une montre

**Files:**
- Modify: `projects.controller.ts`, `projects.service.ts`, `watches.controller.ts`, `watches.service.ts`
- Test: `apps/api/test/deletions.int-spec.ts`

**Interfaces:**
- Consumes : `StorageService.delete`.
- Produces : `ProjectsService.remove(userId, projectId): Promise<void>` ; `WatchesService.remove(userId, watchId): Promise<void>` ; `DELETE /projects/:id` → 204 ; `DELETE /watches/:id` → 204. Séquence : lire les URL de photos, supprimer les lignes en transaction, effacer les fichiers après le commit sans faire échouer la requête.

- [ ] **Step 1: Écrire les tests :**
  - `S37 supprimer un projet efface étapes, photos, mesures, coûts et fichiers, mais garde la montre`
  - `S37 la marge de la montre est recalculée sans les coûts du projet`
  - `RG-AFF-05 la montre sans projet reste visible avec le statut no_project`
  - `S38 supprimer une montre efface complications, projets, données et fichiers` ; `S38 vendue ou avec projet en cours, elle se supprime`
  - `si l'effacement d'un fichier échoue, la suppression en base est conservée et la réponse est 204`
  - `RG-SEC-01 projet et montre d'un autre utilisateur répondent 404 et rien n'est supprimé`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- deletions`. Expected : FAIL.
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la suppression d'un projet et d'une montre avec leurs fichiers`

### Task 30: Suppression du compte

**Files:**
- Modify: `account.controller.ts`, `account.service.ts`
- Create: `apps/api/src/account/dto/delete-account.dto.ts`
- Test: `apps/api/test/account-delete.int-spec.ts`

**Interfaces:**
- Produces : `AccountService.deleteAccount(userId: number, password: string): Promise<void>` ; `DELETE /account` `{ password }` → 204, efface le cookie ; 400 `WRONG_PASSWORD`.

- [ ] **Step 1: Écrire les tests :**
  - `S35 supprime l'utilisateur et toutes ses données (montres, projets, étapes, photos, mesures, coûts)`
  - `S35 efface les fichiers photos` ; `S35 ferme la session (cookie effacé)`
  - `S35 refuse un mot de passe incorrect, rien n'est supprimé`
  - `les données d'un autre utilisateur restent intactes`
  - `un jeton d'accès émis avant la suppression ne donne plus accès (401 ou 404)`
- [ ] **Step 2: Run** `npm run test:int -w apps/api -- account-delete`. Expected : FAIL.
- [ ] **Step 3: Implémenter** : même séquence que la tâche 29 (URL lues, transaction, fichiers effacés ensuite) ; la garde refuse un jeton dont l'utilisateur n'existe plus.
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute la suppression du compte et de ses données`

### Task 31: Cycle de vie et compte (web)

**Files:**
- Create: `apps/web/src/views/AccountView.vue`
- Modify: `WatchDetailView.vue`, `NewProjectView.vue`, `src/stores/watches.ts`
- Test: `apps/web/src/views/WatchLifecycle.spec.ts`, `AccountView.spec.ts`
- Maquettes : `design/2026-10-07-screen-project-detail-etats-*.html`, `…-vendue-*.html`, `2026-09-17-screen-account-desktop-*.html`. **Le changement de mot de passe n'a pas de maquette repérée** : le construire dans l'écran compte avec les composants de formulaire existants.

**Interfaces:**
- Produces : routes `/account` ; méthodes du store `completeProject`, `reopenProject`, `createRevision(watchId, steps)`, `removeProject`, `removeWatch`.

- [ ] **Step 1: Écrire les tests :**
  - `S11 « Terminer le projet » apparaît sur un projet en cours` ; `S28 « Rouvrir » est absent si la montre est vendue ou a un projet en cours`
  - `RG-AFF-04 « Nouvelle révision » est absente si vendue ou projet en cours, mise en avant sinon`
  - `S9 la liste « Montre existante » ne contient que les montres non vendues sans projet en cours, désactivée si vide`
  - `S37 / S38 la suppression demande confirmation et redirige vers le tableau de bord`
  - `S35 la suppression du compte demande le mot de passe` ; `S4 le changement de mot de passe affiche l'erreur d'un mot de passe actuel incorrect`
- [ ] **Step 2: Run** `npm run test:web -- WatchLifecycle AccountView`. Expected : FAIL.
- [ ] **Step 3: Implémenter** (réutilise `ConfirmDialog` de la tâche 20).
- [ ] **Step 4: Run.** Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute le cycle de vie des projets, les suppressions et l'écran compte`

---

## Tranche 9 — Validation et déploiement

### Task 32: Tests de bout en bout

**Files:**
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/auth.spec.ts`, `e2e/restoration.spec.ts`, `e2e/resale.spec.ts`, `e2e/privacy.spec.ts`
- Modify: `package.json` (script `test:e2e`)

**Interfaces:**
- Consumes : API et web lancés en local, base de test, MailDev (API HTTP de MailDev pour lire le lien reçu).
- Produces : `readLastEmailLink(to: string): Promise<string>` dans `e2e/helpers.ts`.

- [ ] **Step 1: Écrire les parcours :**
  - `auth : S1 + S2 + connexion` (inscription, tentative refusée, lien lu dans MailDev, connexion)
  - `restoration : S5, S12, S17` (montre manuelle + chronographe + date → 30 étapes, valider une étape, ajouter une photo)
  - `resale : S21, S22, S23` (coût 40 €, projet terminé, revente 200 €, achat 80 € → marge 80 €)
  - `privacy : S27` (un second utilisateur reçoit 404 sur la montre du premier)
- [ ] **Step 2: Run** `npm run test:e2e`. Expected : FAIL tant que les parcours ne passent pas.
- [ ] **Step 3: Corriger** ce que les parcours révèlent (bugs, libellés), en ajoutant un test unitaire ou d'intégration pour chaque défaut trouvé.
- [ ] **Step 4: Run.** Expected : PASS sur les 4 parcours.
- [ ] **Step 5: Commit** `test : ajoute les parcours de bout en bout (compte, restauration, revente, confidentialité)`

### Task 33: Build de production et guide de déploiement

**Files:**
- Create: `docs/DEPLOIEMENT.md`, `apps/api/.env.production.example`, `apps/web/.env.production.example`
- Modify: `apps/api/package.json` (scripts `build`, `start:prod`), `apps/web/package.json`

**Interfaces:**
- Produces : `npm run build -w apps/api` → `dist/` ; `npm run build -w apps/web` → `dist/` statique ; `docs/DEPLOIEMENT.md` : version de Node de l'hébergement, création du sous-domaine `api.` et du certificat SSL, base PostgreSQL (`127.0.0.1`), `prisma migrate deploy` puis seed, variables d'environnement de production (`COOKIE_SECURE=true`, `WEB_ORIGIN`, `STORAGE_DRIVER=s3`, SMTP), démarrage par Passenger, publication du front dans `public_html`.

- [ ] **Step 1: Vérifier les builds.** Run : `npm run build -w apps/api && npm run build -w apps/web`. Expected : succès, sans erreur de type.
- [ ] **Step 2: Lancer l'API compilée en local** avec `NODE_ENV=production` et vérifier `GET /health` et un parcours de connexion.
- [ ] **Step 3: Écrire `docs/DEPLOIEMENT.md`** en renseignant les points à confirmer auprès de PlanetHoster : version de Node disponible (compatibilité NestJS et Prisma), moteur Prisma sur l'hébergement mutualisé, fournisseur SMTP de production (point ouvert de la note de conception).
- [ ] **Step 4: Commit** `docs : ajoute le guide de déploiement et les builds de production`

---

## Auto-relecture

- **Couverture des scénarios.** S1, S2, S39 → tâches 8 et 9 · S3, S4 → 10 · S36 → 11 · S35 → 30 · S5, S8 → 14 · S6, S7 → 13 · S9, S11, S28 → 28 · S10 → 17 · S12 à S16, S29, S30 → 19 · S17, S18, S34 → 22 · S19, S33 → 24 · S20 → 27 · S21, S32 → 25 · S22, S31 → 26 · S23, S24 → 15 · S25, S40 → 16 · S26 → 15 et 18 · S27 → 15 et chaque tâche d'API · S37, S38 → 29. Les 40 scénarios ont une tâche.
- **Cohérence des types.** `WatchDetail`, `ProjectDetail`, `StepDetail`, `MeasurementDetail`, `ExpenseDetail`, `WatchCard`, `GeneratedStep`, `DashboardStatus` sont définis aux tâches 13, 15, 16, 24 et 25 puis réutilisés tels quels. `OwnershipService` est défini en tâche 15 et consommé à partir de la tâche 19. `ConfirmDialog` est défini en tâche 20 et réutilisé en 23, 29 et 31.
- **Points qui restent à confirmer par l'auteur.** Refus des jetons de renouvellement antérieurs à `password_changed_at` (tâche 9) ; fournisseur SMTP de production (tâche 33) ; écrans sans maquette repérée : formulaire de coût, changement de mot de passe, réordonnancement, page de vérification d'adresse (tâches 12, 20, 27, 31).
- **Hors plan, volontairement.** Pages CGV et Politique de Confidentialité à rédiger (lien présent dans l'inscription, contenu à fournir par l'auteur) ; relecture du seed par un horloger ; tri du tableau de bord (reporté après la v1, arbitrage C6).
