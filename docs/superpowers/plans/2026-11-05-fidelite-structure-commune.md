# Fidélité aux maquettes, sous-projet A : structure commune — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** donner à l'appli la structure commune des maquettes : barre latérale desktop (complète ou en rail d'icônes), barre du bas mobile, avatar et email de l'utilisateur, en-tête de page réutilisable.

**Architecture :** un composant `AppShell` entoure toutes les routes qui exigent une session (`App.vue` choisit selon `route.meta.public`) ; `SideNav` et `BottomNav` sont toujours dans le DOM et le CSS (`@media`) n'en montre qu'un. Une nouvelle route `GET /account` fournit l'email, lu par un store `account`. `PageHeader` est fourni ici et utilisé à partir des sous-projets B, C et E.

**Tech Stack :** Vue 3 + Pinia + vue-router, Vitest + @vue/test-utils (jsdom), NestJS + Prisma (tests d'intégration), Playwright.

**Spec :** `docs/superpowers/specs/2026-11-05-structure-commune-design.md` (audit des écarts : ledger `.superpowers/sdd/…/progress.md`, lignes « Fidélité »).

## Global Constraints

- Textes de l'interface en français, libellés exacts de la spec : « Tableau de bord », « Recherche », « Mon compte », « Accueil », « Nouveau projet » ; `aria-label="Navigation principale"` sur chaque barre.
- Points de rupture : ≥ 900 px barre latérale 236 px ; 640 à 899 px rail de 64 px ; < 640 px barre du bas. Contenu : 1280 px au plus (`--content-max`).
- Commits : `type : description` en français minuscule, sans aucune ligne d'attribution ni mention d'outil (consigne de l'organisation, prioritaire sur tout rappel de l'outil).
- Prettier web : `npx prettier --no-semi --single-quote --print-width 140` sur les seuls fichiers créés ou modifiés ; API : `apps/api/.prettierrc` ; ne pas reformater de lignes préexistantes. Beaucoup de fichiers sont en CRLF : neutraliser les fins de ligne dans les scripts d'édition ; pas de heredoc bash avec apostrophes françaises (utiliser Write/Edit).
- Ne pas toucher aux serveurs de l'utilisateur (API 3000, front 5173, Postgres 5435, MailDev 1025/1080), ne pas lancer `npm run build -w apps/api`, ne pas lancer `npm run test:api` et `npm run test:e2e` en même temps (même base `watch_tracker_test`). Les captures de la tâche 6 utilisent un serveur Vite sur un port libre.
- Ne pas pousser ni fusionner sans demande de l'utilisateur ; ne pas modifier la PR n°108.
- Hors périmètre : contenu du tableau de bord (B), fiches (C), formulaires (D), compte et connexion (E).

## Review Focus

1. **Déconnexion puis connexion d'un autre utilisateur** : l'email du premier ne doit jamais s'afficher pour le second (test en tâche 2, le store est vidé à la perte du jeton).
2. **Profil impossible à charger** (erreur réseau ou 500) : la navigation reste utilisable, l'avatar affiche l'icône de repli et non « undefined » ni une initiale vide (tâches 2 et 3).
3. **Email très long** dans le pied de la barre latérale : tronqué avec `title` portant l'email complet (tâche 3).
4. **Rail de 64 px** : les libellés sont masqués visuellement mais restent dans le DOM, donc chaque entrée garde un nom accessible (tâche 3).
5. **Pages publiques** (connexion, redirection `/login?redirect=…`) : aucune navigation, et pas d'appel à `GET /account` (tâche 4).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `apps/api/src/account/account.service.ts` (modifier) | `profile(userId)` |
| `apps/api/src/account/account.controller.ts` (modifier) | `GET /account` |
| `apps/api/test/account-profile.int-spec.ts` (créer) | tests d'intégration de la route |
| `docs/CONCEPTION-TECHNIQUE.md` (modifier) | contrat d'API, section Compte |
| `apps/web/src/stores/account.ts` + `.spec.ts` (créer) | profil de la session |
| `apps/web/src/stores/auth.ts` (modifier) | vide le profil à la perte du jeton |
| `apps/web/src/navigation.ts` + `.spec.ts` (créer) | règle d'entrée active, partagée |
| `apps/web/src/components/NavIcon.vue` (créer) | icônes SVG de la navigation |
| `apps/web/src/components/Avatar.vue` + `.spec.ts` (créer) | initiale ou icône |
| `apps/web/src/components/SideNav.vue` + `.spec.ts` (créer) | barre latérale / rail |
| `apps/web/src/components/BottomNav.vue` + `.spec.ts` (créer) | barre du bas |
| `apps/web/src/components/AppShell.vue` + `.spec.ts` (créer) | disposition, charge le profil |
| `apps/web/src/components/PageHeader.vue` + `.spec.ts` (créer) | barre du haut d'écran |
| `apps/web/src/App.vue` + `App.spec.ts` (modifier / créer) | coque pour les routes privées |
| `apps/web/src/styles/tokens.css`, `base.css` (modifier) | jetons et styles de base |
| `apps/web/src/views/DashboardView.vue` + `.spec.ts` (modifier) | retire le lien Mon compte / déconnexion |
| `apps/web/public/favicon.svg` (remplacer) | logo cadran |
| `e2e/shell.spec.ts` (créer) | parcours navigation desktop et mobile |

---

### Task 1: `GET /account`

**Files:**
- Modify: `apps/api/src/account/account.service.ts`, `apps/api/src/account/account.controller.ts`, `docs/CONCEPTION-TECHNIQUE.md` (tableau « Compte », section 3)
- Test: `apps/api/test/account-profile.int-spec.ts`

**Interfaces:**
- Produces : `GET /account` (authentifié) → `200 { email: string, createdAt: string, emailVerifiedAt: string | null, passwordChangedAt: string | null }` (dates ISO 8601). Type `AccountProfile` exporté par `account.service.ts`.

- [ ] **Step 1: Écrire le test d'intégration** (`createTestApp`, `createUser`, `resetUserData`, `TokensService.signSession('access', id)` comme dans `account-delete.int-spec.ts`). Cas : 
  - `RG-SEC-03 sans jeton la réponse est 401` ;
  - `renvoie le profil de la session` : `createUser(prisma, { email: 'foo@bar.fr' })` → `res.body` vaut `{ email: 'foo@bar.fr', createdAt: expect.any(String), emailVerifiedAt: expect.any(String), passwordChangedAt: null }` ;
  - `un compte non vérifié a emailVerifiedAt null` (`verified: false`) ;
  - `RG-SEC-01 chaque session ne voit que son profil` (deux utilisateurs, chacun reçoit son email) ;
  - `ne renvoie jamais le hachage` : `Object.keys(res.body).sort()` égale `['createdAt','email','emailVerifiedAt','passwordChangedAt']`.
- [ ] **Step 2: Lancer le test**, depuis `apps/api` : `npx vitest run --config ./vitest.config.int.ts test/account-profile.int-spec.ts`. Expected : FAIL (statut 404 au lieu de 200 ; le 401 passe déjà).
- [ ] **Step 3: Implémenter** `async profile(userId: number): Promise<AccountProfile>` dans `AccountService` (un `findUniqueOrThrow` avec `select` des colonnes `email`, `created_at`, `email_verified_at`, `password_changed_at`, dates converties par `toISOString()`), et `@Get() profile(@CurrentUser() user: AuthenticatedUser): Promise<AccountProfile>` dans `AccountController`. Ajouter la ligne du contrat dans `docs/CONCEPTION-TECHNIQUE.md` : `| GET /account | oui | avatar et email (chantier fidélité aux maquettes, sous-projet A) |`.
- [ ] **Step 4: Relancer** le fichier de test, puis `npx tsc --noEmit` (dans `apps/api`). Expected : tous PASS, `tsc` sans erreur.
- [ ] **Step 5: Commit** `feat : ajoute la route du profil de la session`

---

### Task 2: store `account`

**Files:**
- Create: `apps/web/src/stores/account.ts`
- Modify: `apps/web/src/stores/auth.ts` (listener `onAccessTokenChange`)
- Test: `apps/web/src/stores/account.spec.ts`

**Interfaces:**
- Consumes : `apiFetch<T>(path)`, `setAccessToken(token)` (`api/client`) ; contrat de la tâche 1.
- Produces : `useAccountStore()` avec `profile: Ref<AccountProfile | null>`, `email: ComputedRef<string | null>`, `initial: ComputedRef<string | null>` (première lettre de l'email en majuscule), `load(): Promise<void>` (n'échoue jamais : une erreur laisse `profile` à `null`), `clear(): void`. `interface AccountProfile { email: string; createdAt: string; emailVerifiedAt: string | null; passwordChangedAt: string | null }`.

- [ ] **Step 1: Écrire les tests** (`stubFetch`, `setActivePinia(createPinia())`, comme `auth.spec.ts`) :
  - `load lit GET /account et expose l'email et l'initiale en majuscule` : corps `{ email: 'amateur@example.com', … }` → `email` vaut `'amateur@example.com'`, `initial` vaut `'A'`, `calls()` égale `['GET /account']` ;
  - `un échec de chargement laisse email et initiale à null sans lever` (statut 500) ;
  - `clear vide le profil` ;
  - `la perte du jeton vide le profil : l'email d'un utilisateur ne reste pas pour le suivant` : `useAuthStore()` instancié, `load()`, puis `setAccessToken(null)` → `email` vaut `null`.
- [ ] **Step 2: Lancer** `npx vitest run src/stores/account.spec.ts` (dans `apps/web`). Expected : FAIL (module absent).
- [ ] **Step 3: Implémenter** le store ; dans `auth.ts`, le callback passé à `onAccessTokenChange` appelle aussi `useAccountStore().clear()` quand `token === null` (le client n'accepte qu'un seul écouteur : ne pas en ajouter un second).
- [ ] **Step 4: Lancer** `npx vitest run src/stores` puis `npx vue-tsc --noEmit`. Expected : PASS, sans erreur de type.
- [ ] **Step 5: Commit** `feat : ajoute le store du profil de la session`

---

### Task 3: jetons, icônes, avatar, barre latérale, barre du bas

**Files:**
- Create: `apps/web/src/navigation.ts`, `components/NavIcon.vue`, `components/Avatar.vue`, `components/SideNav.vue`, `components/BottomNav.vue`
- Modify: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/base.css`
- Test: `apps/web/src/navigation.spec.ts`, `components/Avatar.spec.ts`, `components/SideNav.spec.ts`, `components/BottomNav.spec.ts`

**Interfaces:**
- Consumes : `useAccountStore()` (tâche 2), `useRoute()`.
- Produces :
  - `isHomeActive(path: string): boolean` (`navigation.ts`) : vrai pour `/` et tout chemin commençant par `/watches` ;
  - `NavIcon` : prop `name: 'home' | 'search' | 'account' | 'plus'` ;
  - `Avatar` : props `variant: 'initial' | 'icon'`, `initial: string | null` ; en variante `initial` sans initiale, affiche l'icône de repli ;
  - `SideNav`, `BottomNav` : sans props, `<nav aria-label="Navigation principale">`.
- Jetons ajoutés à `tokens.css` : `--page-bg: #05070a`, `--sidebar-w: 236px`, `--content-max: 1280px`, `--settings-max: 720px`, `--topbar-h: 69px`.
- `base.css` : `:root { color-scheme: dark }`, `body { font-size: 15px }`, `:focus-visible` global (contour 2 px `--accent-text`, décalage 2 px), `prefers-reduced-motion`, `h1, h2, h3 { text-wrap: balance }`, classe `.tabular { font-variant-numeric: tabular-nums }`.

- [ ] **Step 1: Écrire les tests.**
  - `navigation.spec.ts` : `isHomeActive('/')`, `('/watches/12')`, `('/watches/new')` vrais ; `('/account')`, `('/apercu-etapes')` faux.
  - `Avatar.spec.ts` : `initial 'A'` affiche « A » ; `initial null` affiche un `svg` et aucun texte ; `variant icon` affiche un `svg`.
  - `SideNav.spec.ts` (routeur en mémoire via `makeRouter`, store `account` préchargé par `account.profile = …`) :
    - `trois entrées, dans l'ordre, avec leur lien` : textes `['Tableau de bord','Recherche','Mon compte']`, `href` `['/','/?recherche=1','/account']` ;
    - `Tableau de bord est actif sur /, /watches/12 et /watches/new` (`aria-current="page"`, et absent des deux autres) ;
    - `Mon compte est actif sur /account, Tableau de bord ne l'est pas` ;
    - `Recherche n'est jamais active` ;
    - `le pied affiche l'email avec son title complet` (email de 60 caractères : le texte est présent et `title` égale l'email) ;
    - `sans profil, le pied n'affiche pas d'email et garde l'icône` (Review Focus 2) ;
    - `les libellés restent dans le DOM` (chaque lien a un texte non vide : Review Focus 4) ;
    - `la navigation porte aria-label "Navigation principale"`.
  - `BottomNav.spec.ts` : `trois entrées` textes `['Accueil','Recherche','Nouveau projet']`, `href` `['/','/?recherche=1','/watches/new']` ; `Accueil est actif sur / et /watches/3` ; `Nouveau projet n'est jamais actif, même sur /watches/new` ; `aria-label "Navigation principale"`.
- [ ] **Step 2: Lancer** `npx vitest run src/navigation.spec.ts src/components` (dans `apps/web`). Expected : FAIL (modules absents).
- [ ] **Step 3: Implémenter** les fichiers listés. Les icônes et le logo reprennent les tracés SVG des maquettes `design/2026-09-23-screen-dashboard-desktop-technique-luminova-green.html` (cadran, maison, loupe, personne) ; la pastille « + » de « Nouveau projet » fait 28 px (`--accent` / `--accent-ink`). CSS de `SideNav` : largeur `var(--sidebar-w)`, collante (`position: sticky; top: 0; height: 100vh`), fond `--page-bg`, filet droit `--border`, entrée active en fond `--surface` avec `box-shadow: inset 2px 0 0 var(--accent)` ; sous 900 px (`@media (max-width: 899px)`) libellés, nom de la marque et email masqués visuellement (classe `sr-only`, pas `display: none`). CSS de `BottomNav` : `min-height: 60px`, 12 px, filet d'accent de 2 px sur 40 % de la largeur de l'entrée active. L'email du pied est tronqué par `text-overflow: ellipsis`.
- [ ] **Step 4: Relancer** `npx vitest run src/navigation.spec.ts src/components` puis `npx vue-tsc --noEmit`. Expected : PASS, sans erreur de type.
- [ ] **Step 5: Commit** `feat : ajoute la barre latérale, la barre du bas et l'avatar`

---

### Task 4: coque de l'application

**Files:**
- Create: `apps/web/src/components/AppShell.vue`
- Modify: `apps/web/src/App.vue`, `apps/web/src/views/DashboardView.vue` (retirer le paragraphe `.logout`, la fonction `logout`, les imports `useAuthStore` et `useRouter` devenus inutiles, la règle CSS `.logout`), `apps/web/public/favicon.svg` (logo cadran, couleur `--accent`)
- Test: `apps/web/src/components/AppShell.spec.ts`, `apps/web/src/App.spec.ts`, `apps/web/src/views/DashboardView.spec.ts`

**Interfaces:**
- Consumes : `SideNav`, `BottomNav` (tâche 3), `useAccountStore().load()` (tâche 2).
- Produces : `AppShell` avec un `<slot />` pour le contenu ; au montage, appelle `load()`. Disposition : grille `var(--sidebar-w) 1fr` ; de 640 à 899 px `--sidebar-w` vaut 64 px ; sous 640 px une colonne, `SideNav` masquée, `BottomNav` fixée en bas et marge basse de 60 px. Zone de contenu : `max-width: var(--content-max)`, marge intérieure `--space-4` (mobile) puis `--space-6`.
- `App.vue` : si `route.matched.length > 0 && !route.meta.public`, rend `<AppShell><RouterView /></AppShell>` ; sinon l'ancien `<div class="app"><RouterView /></div>`.

- [ ] **Step 1: Écrire les tests.**
  - `AppShell.spec.ts` : `affiche le contenu et les deux barres` (deux `nav[aria-label="Navigation principale"]`, texte du slot présent) ; `charge le profil une fois au montage` (`calls()` égale `['GET /account']`) ; `la navigation reste là si le profil ne se charge pas` (statut 500).
  - `App.spec.ts` (routes via `makeRouter` avec `meta: { public: true }` sur `/login`) : `une page publique n'a aucune navigation et n'appelle pas GET /account` (Review Focus 5) ; `une page privée affiche la navigation`.
  - `DashboardView.spec.ts` : `le tableau de bord n'a plus de lien Mon compte ni de bouton Se déconnecter (la navigation les porte)`.
- [ ] **Step 2: Lancer** `npx vitest run src/components/AppShell.spec.ts src/App.spec.ts src/views/DashboardView.spec.ts`. Expected : FAIL (AppShell absent, test du tableau de bord en échec).
- [ ] **Step 3: Implémenter** `AppShell`, adapter `App.vue` et `DashboardView.vue`, remplacer `favicon.svg`.
- [ ] **Step 4: Lancer** `npm run test:web` (racine), `npx vue-tsc --noEmit` (dans `apps/web`), et `grep -c 863bff apps/web/public/favicon.svg`. Expected : web entièrement vert (204 tests existants + les nouveaux), pas d'erreur de type, `grep` renvoie 0.
- [ ] **Step 5: Commit** `feat : ajoute la coque de l'application et retire la navigation du tableau de bord`

---

### Task 5: `PageHeader`

**Files:**
- Create: `apps/web/src/components/PageHeader.vue`
- Test: `apps/web/src/components/PageHeader.spec.ts`

**Interfaces:**
- Produces : `PageHeader` avec props `title: string`, `subtitle?: string`, `back?: RouteLocationRaw` ; slot `actions`. Premier utilisateur : sous-projet B (tableau de bord) ; le fil d'Ariane de la fiche sera ajouté par C.
- Mise en page : sous 640 px barre d'application (retour 44 px, titre 17 px/600 tronqué, actions à droite) ; à partir de 640 px barre collante (`position: sticky; top: 0; min-height: var(--topbar-h)`, fond `--page-bg`, filet bas `--border`, marge intérieure `16px 32px`, titre 18 px).

- [ ] **Step 1: Écrire les tests** : `affiche le titre dans un h1` ; `affiche le sous-titre quand il est fourni et pas sinon` ; `le bouton retour est un lien vers back avec le nom accessible "Retour"` ; `sans back, pas de lien retour` ; `le slot actions est rendu`.
- [ ] **Step 2: Lancer** `npx vitest run src/components/PageHeader.spec.ts`. Expected : FAIL (module absent).
- [ ] **Step 3: Implémenter** `PageHeader`.
- [ ] **Step 4: Relancer** le fichier de test et `npx vue-tsc --noEmit`. Expected : PASS.
- [ ] **Step 5: Commit** `feat : ajoute l'en-tête de page réutilisable`

---

### Task 6: parcours e2e, vérification visuelle, suites complètes

**Files:**
- Create: `e2e/shell.spec.ts`
- Modify: `.superpowers/sdd/…/progress.md` (ledger : écarts restants par capture)

- [ ] **Step 1: Écrire `e2e/shell.spec.ts`** (helpers `createVerifiedAccount`, `login`, `uniqueEmail` de `e2e/helpers`) : `desktop : la barre latérale porte les trois entrées et l'email, Mon compte ouvre l'écran compte` (viewport par défaut ; `getByRole('navigation', { name: 'Navigation principale' })` contient `Tableau de bord`, `Recherche`, `Mon compte` et l'email ; clic sur `Mon compte` → URL `/account`) ; `mobile 390 px : la barre du bas remplace la barre latérale et Nouveau projet ouvre le formulaire` (`page.setViewportSize({ width: 390, height: 800 })` ; la seule navigation visible contient `Accueil`, `Recherche`, `Nouveau projet` ; clic → URL `/watches/new`).
- [ ] **Step 2: Lancer** `npm run test:e2e` (racine, MailDev requis, jamais en même temps que l'API). Expected : les 5 parcours existants et les 2 nouveaux passent (7/7).
- [ ] **Step 3: Vérification visuelle.** Lancer un serveur Vite sur un port libre (par exemple 5199, pas 5173) devant une fausse API locale jetable (hors dépôt), et capturer le tableau de bord à 390, 768 et 1280 px dans Chrome ; comparer aux maquettes `design/2026-09-23-screen-dashboard-technique-luminova-green.html` (mobile) et `…dashboard-desktop-technique…` (desktop). Contrôler : barre du bas à 3 entrées (390), rail de 64 px sans libellés (768), barre latérale de 236 px avec marque, entrées et pied email (1280), contenu limité à 1280 px. Consigner au ledger ce qui diffère encore (le contenu du tableau de bord relève de B). Arrêter ses propres processus par ligne de commande, jamais ceux des ports de l'utilisateur.
- [ ] **Step 4: Suites complètes**, l'une après l'autre : `npm run test:api` (arrière-plan, ~80 s), puis `npm run test:web`, `npx vue-tsc --noEmit` (dans `apps/web`), et `npm run lint`. Expected : API entièrement verte (les 58 unitaires et 322 tests d'intégration existants, plus les 5 de la tâche 1), web vert, lint sans erreur.
- [ ] **Step 5: Commit** `test : ajoute le parcours de navigation de la coque`

---

## Self-review

- **Couverture de la spec** : points de rupture et dispositions (tâches 3, 4, 5) ; entrées et états actifs (tâche 3) ; `GET /account` et store (tâches 1, 2) ; jetons, `base.css`, favicon (tâches 3, 4) ; retrait du lien du tableau de bord (tâche 4) ; e2e et captures (tâche 6) ; `PageHeader` (tâche 5). Le lien « Recherche » vers `/?recherche=1` est posé, son champ relève de B (spec).
- **Cohérence des types** : `AccountProfile`, `useAccountStore().email/initial/load/clear`, `isHomeActive`, props `Avatar` et `PageHeader` identiques dans les tâches qui les consomment.
- **Proportion** : le plan décrit des signatures, des noms de tests et des valeurs, sans corps de code.
