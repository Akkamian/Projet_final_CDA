# Note de conception technique — Watch Restoration Tracker

**Date :** 2026-11-01
**Statut :** les décisions D1 à D10 ont été tranchées le 2026-11-01 (§1). Les valeurs marquées **Proposé** dans le reste de la note restent des défauts de travail, pas des décisions.
**Objet :** fixer les choix techniques que la conception fonctionnelle laisse ouverts, avant d'écrire le plan d'implémentation.

Cette note ne répète pas le fonctionnel. Elle s'appuie sur :

- `docs/SPECS.md` : scénarios S1 à S40 ;
- `docs/REGLES-GESTION.md` : règles `RG-xx` ;
- `db/script_db.sql` et `db/seed_reference_data.sql` : modèle physique et référentiel ;
- `docs/UML.md` et `docs/diagramme-deploiement.md` : séquences et déploiement.

Stack actée : Vue 3, NestJS, Prisma, PostgreSQL 16, TypeScript de bout en bout, cible PlanetHoster mutualisé (Node via Passenger, sans Docker en production).

## 1. Décisions (tranchées le 2026-11-01)

| # | Sujet | Décision | Écarté |
|---|---|---|---|
| D1 | Stockage des photos | Interface `StorageService` à deux drivers : disque local en dev et en tests, S3 (N0C Storage) en prod. Clé `uuid.ext`, URL non devinable (RG-SEC-06). | S3 partout avec MinIO ; disque local partout. |
| D2 | Session | Jeton d'accès (15 min) en mémoire côté front ; jeton de renouvellement (7 j) en cookie `httpOnly`, `Secure`, `SameSite=Lax`, limité au chemin `/auth`. | Les deux jetons dans `localStorage` (exposé au XSS). |
| D3 | Source de vérité du schéma | Prisma : migration 0 = `script_db.sql` tel quel, `schema.prisma` obtenu par `prisma db pull`, évolutions par `prisma migrate`. Le seed est rejoué par `prisma db seed`. | `script_db.sql` comme référence, Prisma en lecture seule. |
| D4 | Emails | `nodemailer` en SMTP configuré par `.env`. **MailDev** (Docker) en dev. Fournisseur de production **non choisi** (point ouvert, §10). | Mailpit. |
| D5 | Origine de l'API en prod | **Sous-domaine `api.`** : CORS avec credentials (origine du front en liste blanche) et cookie `SameSite=Lax`, valable car front et API partagent le même domaine. | Reverse proxy `/api/*` sur la même origine. |
| D6 | Réordonnancement des étapes (S15) | Boutons « monter / descendre ». Glisser-déposer reporté après la v1. | Glisser-déposer tactile ; les deux. |
| D7 | Front | Vue 3, Vite, Vue Router, Pinia, CSS maison à variables issues du design system Luminova green (les maquettes se transposent telles quelles). Boîtes de confirmation avec l'élément natif `<dialog>`. Graphique de performances : Chart.js en import ciblé. | shadcn-vue et Tailwind ; reka-ui ; graphique SVG maison. |
| D8 | Tests | API : Jest, avec intégration sur un vrai PostgreSQL 16 (Docker). Front : Vitest et Vue Test Utils. E2E : Playwright sur les parcours clés. | Pas d'E2E en v1. |
| D9 | Dépôt | Monorepo npm workspaces : `apps/api`, `apps/web`. `docker-compose.yml` (PostgreSQL 16 et MailDev) et `.env.example` à la racine. | pnpm. |
| D10 | Intégration continue | GitHub Actions (dépôt `Akkamian/Projet_final_CDA`) : lint et tests API (PostgreSQL en service du workflow) et front à chaque push sur `dev` et sur les PR vers `staging` ou `main`. E2E lancés à la main. Déploiement manuel (SSH + Git), la cible n'a pas de pipeline. | Pas de CI. |

## 2. Architecture de l'API

NestJS, JSON, validation par DTO (`class-validator`). Pas de préfixe de route : en production l'API est servie par `https://api.<domaine>/` (D5), en dev par `http://localhost:3000/`, et les routes ci-dessous sont celles de `docs/UML.md`.

**Modules :** `auth`, `users` (compte), `reference-data`, `watches`, `projects`, `steps`, `photos`, `measurements`, `expenses`, `storage`, `mail`. Les trois derniers sont des modules d'infrastructure.

**Règles transversales**

- **Authentification.** `JwtAuthGuard` global ; les routes publiques portent un décorateur `@Public()` (RG-SEC-03).
- **Propriété.** Aucun service ne charge une ressource par son seul identifiant. Chaque requête filtre sur `userId` en remontant la chaîne `step → project → watch → user`. Une ressource d'autrui répond 404, comme une ressource inexistante (RG-SEC-01, RG-SEC-02).
- **Limitation de débit.** `@nestjs/throttler` sur `login`, `forgot-password` et `resend-verification`, par IP. Le plafond est lu en configuration (RG-CPT-14). Valeur par défaut proposée : 5 requêtes par minute et par IP.
- **Montants.** Les colonnes `NUMERIC` restent `Decimal` dans le service (jamais de `float`). La marge est calculée en `Decimal` et sérialisée en chaîne (RG-FIN-06).
- **Dates futures.** Validateur commun (RG-GEN-01). Une date égale à aujourd'hui est acceptée.
- **CORS (D5).** L'API vit sur un sous-domaine : `Access-Control-Allow-Origin` limité à l'origine du front (variable d'environnement, jamais `*`) et `credentials: true`, pour que le cookie de renouvellement circule.
- **Transactions.** `prisma.$transaction` pour la création de montre et projet, le réordonnancement, la suppression d'étape et la revente.
- **Suppressions avec fichiers.** Le service lit les URL des photos concernées, supprime les lignes en une transaction, puis efface les fichiers après le commit, sans bloquer si l'effacement échoue. On préfère un fichier orphelin à une URL cassée (RG-MON-11, RG-PRJ-11, RG-CPT-15).

## 3. Contrat d'API (proposé)

Déduit des scénarios. Une route qui existe déjà dans `docs/UML.md` est reprise telle quelle. « Auth » signifie utilisateur connecté.

### Compte

| Méthode et route | Auth | Scénario |
|---|---|---|
| `POST /auth/register` | non | S1 |
| `POST /auth/verify-email` `{ token }` | non | S1, S2 |
| `POST /auth/resend-verification` `{ email }` | non | S39 |
| `POST /auth/login` | non | S2 |
| `POST /auth/refresh` | cookie | S2 |
| `POST /auth/logout` | oui | — |
| `POST /auth/forgot-password` `{ email }` | non | S3 |
| `POST /auth/reset-password` `{ token, password }` | non | S3 |
| `GET /account` : `{ email, createdAt, emailVerifiedAt, passwordChangedAt }` (avatar et email de l'écran ; chantier fidélité aux maquettes, sous-projet A) | oui | — |
| `PATCH /account/password` `{ currentPassword, newPassword }` | oui | S4 |
| `DELETE /account` `{ password }` | oui | S35 |

### Référentiel et aperçu

| Méthode et route | Scénario |
|---|---|
| `GET /movement-types` | S5 |
| `GET /complications` | S5 |
| `GET /step-previews?movementCode=&complicationCodes=` | S6, S7 |

### Montres

| Méthode et route | Scénario |
|---|---|
| `GET /watches` : une carte par montre avec statut calculé, miniature et marge ; réponse accompagnée du nombre de montres par statut ; filtre optionnel `?status=` | S25, S40 |
| `POST /watches` : montre, complications, premier projet et étapes, en une écriture | S5, S8 |
| `GET /watches/:id` : montre, projets, finances et marge | S18, S23, S24, S26 |
| `PATCH /watches/:id` | S10 |
| `DELETE /watches/:id` | S38 |
| `PUT /watches/:id/resale` `{ price, date }` : saisie ou correction | S22, S31 |
| `DELETE /watches/:id/resale` | S31 |

### Projets

| Méthode et route | Scénario |
|---|---|
| `POST /watches/:id/projects` : étapes ajustées incluses | S9 |
| `POST /projects/:id/complete` | S11 |
| `POST /projects/:id/reopen` | S28 |
| `DELETE /projects/:id` | S37 |
| `PUT /projects/:id/photos/before` et `.../after` (multipart) | S18, S34 |
| `DELETE /projects/:id/photos/before` et `.../after` | S34 |

### Étapes et photos d'étape

| Méthode et route | Scénario |
|---|---|
| `POST /projects/:id/steps` `{ label }` : ajoutée en fin de liste | S13 |
| `PATCH /projects/:id/steps/:stepId` `{ label?, notes?, isCompleted? }` | S12, S14, S16, S29 |
| `DELETE /projects/:id/steps/:stepId` : renumérote | S30 |
| `PUT /projects/:id/steps/order` `{ stepIds: number[] }` : liste complète | S15 |
| `POST /projects/:id/steps/:stepId/photos` (multipart) | S17 |
| `DELETE /projects/:id/steps/:stepId/photos/:photoId` | S34 |

Pour `PUT .../steps/order`, le service refuse toute liste qui n'est pas exactement l'ensemble des identifiants du projet (RG-ETP-12, RG-ETP-13), puis renumérote 1 à n dans une transaction.

### Mesures et coûts

| Méthode et route | Scénario |
|---|---|
| `POST /projects/:id/measurements` | S19 |
| `PATCH` et `DELETE /projects/:id/measurements/:measurementId` | S33 |
| `POST /projects/:id/expenses` | S21 |
| `PATCH` et `DELETE /projects/:id/expenses/:expenseId` | S32 |

Les listes de mesures et de coûts sont incluses dans `GET /watches/:id` : pas de route de lecture dédiée tant que l'écran n'en a pas besoin.

## 4. Photos

- `StorageService { save(file): Promise<{ url, key }>; delete(url): Promise<void> }` : un driver `local` (dossier servi en statique) et un driver `s3`.
- Validation côté serveur : taille maximale 10 Mo (RG-PHO-02) ; type vérifié sur le contenu du fichier (octets d'en-tête) et non sur l'en-tête déclaré ; extension déduite du type ; nom d'origine jamais conservé (RG-PHO-01, RG-PHO-03).
- Compression en WebP redimensionné côté client avant envoi (éco-conception, voir séquence 1 de `docs/UML.md`). Le serveur accepte quand même JPEG et PNG.
- `step_pics.url`, `photo_before` et `photo_after` sont des `VARCHAR(255)` : l'URL S3 de production doit tenir dans 255 caractères (clé courte).

## 5. Session et sécurité des comptes

- Mot de passe haché avec bcrypt (RG-CPT-04). Email normalisé (minuscules, espaces retirés) avant toute écriture ou recherche (RG-CPT-13).
- Jetons de vérification (24 h) et de réinitialisation (1 h) : JWT signés avec un secret distinct de celui de la session, sans table de jetons. Le jeton est refusé si `email_verified_at` est déjà renseigné, ou s'il a été émis avant `password_changed_at` (RG-CPT-08, RG-CPT-09).
- Jeton de renouvellement (D2) : cookie `httpOnly`, `Secure`, `SameSite=Lax`, chemin `/auth`. Le front garde le jeton d'accès en mémoire et appelle `POST /auth/refresh` à chaque ouverture de l'application. Comme le jeton est sans état, la déconnexion se limite à effacer le cookie. Pour qu'un changement de mot de passe coupe les sessions existantes, **Proposé** : refuser tout jeton émis avant `password_changed_at` (même mécanisme que les liens).
- Réponses identiques pour l'email inconnu, le mot de passe faux et le renvoi du lien (RG-CPT-07, RG-CPT-10). L'inscription, elle, signale l'adresse déjà prise (RG-CPT-01, exception assumée).
- Les secrets vivent dans `.env`, jamais commité. Seul `.env.example` est versionné.

## 6. Données et migrations

- Migration 0 : contenu de `db/script_db.sql`. Le seed (`db/seed_reference_data.sql`) est exécuté séparément, jamais dans une migration, car c'est du référentiel relisible.
- Les contraintes qui dépassent Prisma (XOR, index partiel, `CHECK`) restent dans le SQL de migration. Elles sont vérifiées par des tests d'intégration sur une vraie base, pas par un mock.
- Les erreurs de contrainte PostgreSQL sont traduites en erreurs HTTP lisibles : par exemple, la violation de `uq_restoration_projects_one_in_progress` donne un 409 explicite (RG-PRJ-09).

## 7. Front

- Écrans à construire d'après les maquettes `design/` : authentification (connexion, inscription, mot de passe oublié, réinitialisation), tableau de bord, nouveau projet en deux temps, détail montre (1 ou plusieurs projets, états vendue, terminé, sans projet), ajout de mesure, compte.
- Variables CSS tirées de `design/2026-07-09-design-system-style-guide-technique-luminova-green.html` (`--bg`, `--accent`, `--space-*`, `--radius`, `--touch-min`…), reprises telles quelles dans le CSS de l'application, sans Tailwind ni bibliothèque de composants (D7).
- Réordonnancement (D6) : un bouton « monter » et un bouton « descendre » par étape, qui envoient la liste complète à `PUT /projects/:id/steps/order`.
- Confirmations de suppression (S35, S37, S38) : élément natif `<dialog>`.
- **Écrans sans maquette repérée**, à confirmer (recherche par mots-clés dans les fichiers, pas une lecture écran par écran) : formulaire de coût, changement de mot de passe, réordonnancement des étapes, page de vérification d'adresse, pages CGV et confidentialité. Ce sont des formulaires simples qui réutilisent les composants du design system.

## 8. Tests

- Chaque test nomme la règle ou le scénario qu'il couvre (`RG-PRJ-09`, `S28`…), pour garder la traçabilité de `docs/REGLES-GESTION.md`.
- **Intégration API sur PostgreSQL 16.** Génération des étapes (mouvement seul, avec une ou plusieurs complications, départage à rang égal), XOR, transaction de création, marge, IDOR, projet en cours unique, cascades, contraintes de valeur. Ce sont les tests déjà prévus au design du MCD.
- **Unitaires.** Validateurs (dates futures, mot de passe, email), calcul de marge, réordonnancement.
- **E2E Playwright.** Parcours : inscription puis vérification puis connexion ; création montre et projet ; validation d'étape avec photo ; revente et marge ; suppression.

## 9. Environnement de développement

- `docker-compose.yml` : PostgreSQL 16 et MailDev (SMTP sur le port 1025, interface web sur le 1080). Le PostgreSQL 18 installé sur le poste ne sert pas, pour rester aligné sur la cible.
- Node : version à confirmer auprès de PlanetHoster avant de figer NestJS et Prisma (point de vigilance du diagramme de déploiement). Le poste est en Node 24.
- Branches : `dev` pour le courant, `staging` pour la validation, `main` pour le stable.

## 10. Points ouverts, non bloquants

- **Fournisseur d'emails en production** (D4) : SMTP de PlanetHoster ou service transactionnel, à choisir après vérification de ce que l'hébergement permet. Le code n'en dépend pas (hôte SMTP en `.env`).
- **Création du sous-domaine `api.` dans N0C** et certificat SSL associé (D5) : à vérifier avant le premier déploiement.
- Jetons de session émis avant `password_changed_at` refusés (§5) : proposé, à confirmer.
- Plafond de limitation de débit : valeur finale à fixer à l'implémentation (RG-CPT-14).
- Rédaction des CGV et de la Politique de Confidentialité ; conservation éventuelle de `terms_accepted_at` (arbitrage C5).
- Relecture du seed par un horloger.
- Documents à aligner : `docs/MCD/2026-09-23-mcd-montre-complications-design.md` (parcours « Nouvelle révision » avec A4), séquence 2 de `docs/UML.md` non re-rendue, slide 4 qui évoque une contrainte « deferrable » absente du SQL.
- Version de Node et compatibilité Prisma et NestJS sur le mutualisé, à vérifier avant le premier déploiement.

## 11. Découpage proposé de l'implémentation

Tranches verticales, chacune livrable et testable avant la suivante :

1. **Socle.** Monorepo, Docker, migration 0 et seed, harnais de tests, `/health`.
2. **Compte.** Inscription, vérification, connexion, renouvellement, réinitialisation, changement de mot de passe, suppression de compte, limitation de débit.
3. **Référentiel et aperçu.** `GET /movement-types`, `/complications`, `/step-previews`.
4. **Création montre et projet.** `POST /watches` atomique, tableau de bord, détail.
5. **Étapes.** Validation, ajout, modification, réordonnancement, suppression.
6. **Photos.** Stockage, étapes, avant et après.
7. **Mesures et finances.** Mesures, coûts, revente, marge.
8. **Cycle de vie.** Terminer, rouvrir, nouvelle révision, suppressions de projet et de montre, filtre du tableau de bord.
9. **Déploiement.** Build, configuration PlanetHoster, vérification de bout en bout.
