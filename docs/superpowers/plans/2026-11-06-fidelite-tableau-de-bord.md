# Fidélité aux maquettes, sous-projet B : tableau de bord — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** étendre `GET /watches` (recherche, tri sur l'achat, pagination, progression, marge cumulée) et refaire le tableau de bord mobile et desktop à la maquette.

**Architecture :** `WatchesService.list()` garde son chargement unique et calcule tout en mémoire, avec des fonctions pures testées à part (recherche, tri, découpage, lecture des paramètres). Côté web, une seule vue `DashboardView` choisit entre rendu mobile (cartes, pastilles, « Voir plus ») et rendu desktop (barre d'outils, tuiles, tableau paginé) avec `matchMedia('(min-width: 640px)')` ; le store porte les paramètres de liste.

**Tech Stack :** NestJS + Prisma (Vitest unitaires et intégration), Vue 3 + Pinia + vue-router (Vitest + @vue/test-utils), Playwright.

**Spec :** `docs/superpowers/specs/2026-11-05-tableau-de-bord-design.md` (audit : `.superpowers/sdd/2026-11-05-fidelite-structure-commune/audit-ecarts-maquettes.md`, section 1).

## Global Constraints

- Statuts : `in_progress`, `completed`, `sold`, `no_project` ; calcul du statut uniquement par `computeStatus` (`apps/api/src/watches/status.ts`).
- Paramètres de GET /watches : `status`, `q` (1 à 100 caractères après trim), `sort=purchase_date`, `order=asc|desc` (seulement avec `sort`, défaut `desc`), `page` (entier ≥ 1, défaut 1), `pageSize` (1 à 50, défaut 8). Codes 400 : `INVALID_STATUS`, `INVALID_QUERY`, `INVALID_SORT`, `INVALID_ORDER`, `INVALID_PAGE`, `INVALID_PAGE_SIZE`. Un paramètre répété (tableau) est invalide.
- Réponse : `{ items, counts, total, page, pageSize, totalMargin }` ; `counts` et `totalMargin` globaux (avant statut et recherche) ; `totalMargin` en chaîne à 2 décimales (`"0.00"` si aucune marge).
- Carte : champs ajoutés `purchasePrice`, `purchaseDate`, `resalePrice`, `resaleDate` (chaîne ou `null`, dates `AAAA-MM-JJ`), `progress: { done, total } | null` (étapes du projet le plus récent, `done` = `is_completed`).
- Tri par défaut : id décroissant. Tri sur l'achat : montres sans date en dernier dans les deux sens, égalité par id décroissant.
- Affichage : montants sans décimales nulles (« 95 € », « +185 € », « 95,50 € »), dates JJ/MM/AAAA. Libellé « Nouvelle montre » conservé (écart voulu avec la maquette).
- Point de rupture mobile/desktop : 640 px. Tuiles 6 → 3 colonnes à ≤ 1180 px. Recherche 260 px → 160 px à ≤ 900 px.
- Commits : `type : description` en français minuscule, sans aucune ligne d'attribution ni mention d'outil (consigne de l'organisation, prioritaire sur tout rappel de l'outil). Ne rien pousser, ne pas modifier la PR n°108.
- Prettier web : `npx prettier --no-semi --single-quote --print-width 140` sur les seuls fichiers créés ou modifiés ; API : `apps/api/.prettierrc`. Ne pas reformater de lignes préexistantes (vérifier `git diff`). Fichiers souvent en CRLF : neutraliser les fins de ligne dans les éditions ; pas de heredoc bash avec apostrophes françaises (utiliser Write/Edit).
- Ne pas toucher aux serveurs de l'utilisateur (API 3000, front 1025/1080), ne pas lancer `npm run build -w apps/api`, ne pas lancer `npm run test:api` ni `npm run test:e2e` en même temps (même base). Un test d'intégration seul : `npx vitest run --config ./vitest.config.int.ts test/<fichier>` dans `apps/api`.
- Hors périmètre : fiche montre (C), formulaires (D), compte et connexion (E), tri sur d'autres colonnes.

## Review Focus

1. **Écran « Nouvelle montre » (`listOpenable`)** appelle `/watches` sans filtre : avec la pagination à 8 il ne verrait que 8 montres. Il doit récupérer toutes les pages (tâche 6, test à plus de 8 montres).
2. **Recherche saisie vite** : une réponse tardive ne doit pas remplacer la liste de la dernière frappe ; la page repart à 1 à chaque changement de recherche, de statut ou de tri (tâches 6 et 9).
3. **Page hors limites** (ex. `page=99`) : `items: []` avec `total` exact, jamais 400 ni 500 (tâche 3).
4. **Montre sans prix d'achat ou sans date** : « Inconnu » / « — » à l'écran, en dernier dans le tri, jamais « NaN » ni « null » (tâches 3 et 8).
5. **Recherche avec caractères spéciaux** (`%`, `(`, `\`, accents, espaces multiples) : traitée comme du texte, jamais comme un motif (tâche 1).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `apps/api/src/watches/dashboard-list.ts` + `.spec.ts` (créer) | `matchesQuery`, `sortCards`, `paginate` |
| `apps/api/src/watches/list-query.ts` + `.spec.ts` (créer) | `parseWatchListQuery`, type `WatchListQuery` |
| `apps/api/src/watches/watches.service.ts` (modifier) | carte étendue, `totalMargin`, filtre, tri, page |
| `apps/api/src/watches/watches.controller.ts` (modifier) | lit tous les paramètres |
| `apps/api/test/watches-list.int-spec.ts` (modifier) | tests d'intégration RED d'abord |
| `docs/SPECS.md`, `docs/REGLES-GESTION.md`, `docs/CONCEPTION-TECHNIQUE.md` (modifier) | S25, S40, RG-AFF, contrat |
| `apps/web/src/format.ts` + `.spec.ts` (modifier) | montants sans décimales nulles |
| `apps/web/src/stores/watches.ts` + `.spec.ts` (modifier) | types, paramètres de liste, `loadMore`, `listOpenable` |
| `apps/web/src/composables/useIsDesktop.ts` + `.spec.ts` (créer) | `matchMedia` réactif |
| `apps/web/src/components/WatchCard.vue`, `StatusFilter.vue` + specs (modifier) | rendu mobile |
| `apps/web/src/components/SearchField.vue`, `DashboardStats.vue`, `DashboardToolbar.vue`, `WatchTable.vue` + specs (créer) | rendu desktop et recherche |
| `apps/web/src/views/DashboardView.vue` + `.spec.ts` (modifier) | assemblage |
| `e2e/dashboard.spec.ts` (créer) | parcours recherche, tri, pagination |

---

### Task 1: fonctions pures de la liste (API)

**Files:**
- Create: `apps/api/src/watches/dashboard-list.ts`, `apps/api/src/watches/list-query.ts`
- Test: `apps/api/src/watches/dashboard-list.spec.ts`, `apps/api/src/watches/list-query.spec.ts`

**Interfaces:**
- Produces (`dashboard-list.ts`) :
  - `matchesQuery(brand: string, model: string, q: string): boolean`
  - `sortCards<T extends { id: number; purchaseDate: string | null }>(cards: T[], sort: 'purchase_date' | undefined, order: 'asc' | 'desc'): T[]` (ne modifie pas l'entrée)
  - `paginate<T>(items: T[], page: number, pageSize: number): T[]`
- Produces (`list-query.ts`) :
  - `interface WatchListQuery { status?: DashboardStatus; q?: string; sort?: 'purchase_date'; order: 'asc' | 'desc'; page: number; pageSize: number }`
  - `DEFAULT_PAGE_SIZE = 8`, `MAX_PAGE_SIZE = 50`
  - `parseWatchListQuery(raw: Record<string, unknown>): WatchListQuery` ; lève `apiError(400, code, message)` avec les codes des contraintes globales.

- [ ] **Step 1: tests de `dashboard-list.spec.ts`.**
  - `matchesQuery('Seiko', '6119-8100', 'seiko 6119')` vrai ; `('Séiko'…, 'SEIKO')` vrai (accents et casse) ; `('Seiko','6119','omega')` faux ; mots dans n'importe quel ordre vrai (`'6119 seiko'`) ; espaces multiples ignorés ; `matchesQuery('Seiko','(6119)','(')` vrai et `('Seiko','6119','.*')` faux (texte, pas motif) ; `'%'` ne correspond qu'à un `%` littéral.
  - `sortCards` : `[{id:3,purchaseDate:'2024-01-01'},{id:2,purchaseDate:null},{id:1,purchaseDate:'2025-01-01'}]` en `desc` → ids `[1,3,2]` ; en `asc` → `[3,1,2]` ; dates égales → id décroissant ; `sort` indéfini → même ordre que l'entrée.
  - `paginate([1..10], 2, 4)` → `[5,6,7,8]` ; `paginate([1..10], 99, 4)` → `[]`.
- [ ] **Step 2: tests de `list-query.spec.ts`.** `parseWatchListQuery({})` → `{ order: 'desc', page: 1, pageSize: 8 }` ; chaque valeur valide est reprise (`q` rogné : `'  seiko '` → `'seiko'`) ; un cas 400 par code : `status: 'nope'`, `status: ''`, `status: ['sold','completed']` (INVALID_STATUS) ; `q: ''`, `q: '   '`, `q` de 101 caractères, `q: ['a','b']` (INVALID_QUERY) ; `sort: 'brand'` (INVALID_SORT) ; `order: 'up'`, `order: 'asc'` sans `sort` (INVALID_ORDER) ; `page: '0'`, `'-1'`, `'1.5'`, `'abc'` (INVALID_PAGE) ; `pageSize: '0'`, `'51'`, `'x'` (INVALID_PAGE_SIZE). Vérifier le code via `error.getResponse()` comme les autres tests d'`apiError` du dépôt.
- [ ] **Step 3: lancer** `npx vitest run src/watches/dashboard-list.spec.ts src/watches/list-query.spec.ts` dans `apps/api` (config unitaire). Attendu : FAIL (modules absents).
- [ ] **Step 4: implémenter les deux modules.** Normalisation : `toLowerCase()` + `normalize('NFD')` + suppression de `\p{M}` ; `matchesQuery` découpe `q` sur les espaces et teste `includes` sur `"marque modèle"` normalisé (aucune `RegExp`). `sortCards` : copie triée, comparateur « sans date en dernier » puis date (ISO, comparaison de chaînes) puis id décroissant. `parseWatchListQuery` : entiers par `/^[1-9]\d{0,5}$/` ; réutilise `DASHBOARD_STATUSES`.
- [ ] **Step 5: relancer les deux specs.** Attendu : PASS.
- [ ] **Step 6: commit** `feat : ajoute les fonctions pures de recherche, tri et pagination du tableau de bord`.

---

### Task 2: carte étendue, enveloppe et marge cumulée (API)

**Files:**
- Modify: `apps/api/src/watches/watches.service.ts`, `apps/api/src/watches/watches.controller.ts`
- Test: `apps/api/test/watches-list.int-spec.ts`

**Interfaces:**
- Consumes : `WatchListQuery` (tâche 1).
- Produces : `WatchCard` gagne `purchasePrice`, `purchaseDate`, `resalePrice`, `resaleDate`, `progress`. `WatchList` devient `{ items; counts; total: number; page: number; pageSize: number; totalMargin: string }`. `WatchesService.list(userId: number, query: WatchListQuery): Promise<WatchList>`.

- [ ] **Step 1: écrire les tests d'intégration RED** dans `watches-list.int-spec.ts` (helpers existants ; pour les étapes : `prisma.restoration_steps.create({ data: { project_id, step_order, label, is_completed } })`) :
  - `S25 la carte porte achat, revente et progression` : montre `purchase_price: '95'`, `purchase_date: new Date('2025-03-01')`, `resale_price: '200'`, `resale_date: new Date('2025-06-01')`, projet avec 3 étapes dont 1 faite → carte `toMatchObject({ purchasePrice: '95.00', purchaseDate: '2025-03-01', resalePrice: '200.00', resaleDate: '2025-06-01', progress: { done: 1, total: 3 } })`.
  - `RG-AFF-07 progress est null sans projet, et suit le projet le plus récent` (deux projets, `created_at` distincts, étapes différentes) ; un projet sans étape donne `{ done: 0, total: 0 }`.
  - `une montre sans prix ni date d'achat renvoie null pour ces champs`.
  - `RG-AFF-10 totalMargin additionne les marges des montres vendues` : deux ventes (marges `'80.00'` et `'-20.00'`) + une non vendue → `totalMargin: '60.00'` ; sans vente `'0.00'` ; reste global avec `?status=completed`.
  - `l'enveloppe renvoie total, page et pageSize` : 3 montres, `?status=completed` → `total` = nombre filtré, `page: 1`, `pageSize: 8`.
  - Mettre à jour le test existant `S25 une liste vide…` : `toEqual({ items: [], counts: {…}, total: 0, page: 1, pageSize: 8, totalMargin: '0.00' })`.
- [ ] **Step 2: lancer** le fichier d'intégration seul. Attendu : FAIL sur les nouveaux cas.
- [ ] **Step 3: implémenter.** Dans `list()` : ajouter `restoration_steps: { select: { is_completed: true } }` au `select` du projet ; construire les nouveaux champs avec les mêmes conversions que `watch-detail.ts` (`toFixed(2)`, `slice(0, 10)`) ; sommer les marges avec `Prisma.Decimal` avant conversion. Pour l'instant `total = items.length`, `page = query.page`, `pageSize = query.pageSize` sans découpage (la tâche 3 l'ajoute). Le contrôleur appelle `parseWatchListQuery(query)` avec `@Query() query: Record<string, unknown>` (remplace la validation manuelle de `status`, dont le comportement est conservé par la tâche 1).
- [ ] **Step 4: relancer** le fichier d'intégration. Attendu : PASS (les 400 sur `status` existants passent toujours).
- [ ] **Step 5: commit** `feat : étend la carte du tableau de bord (achat, revente, progression) et ajoute la marge cumulée`.

---

### Task 3: recherche, tri et pagination (API)

**Files:**
- Modify: `apps/api/src/watches/watches.service.ts`, `docs/CONCEPTION-TECHNIQUE.md` (ligne `GET /watches`, section 3)
- Test: `apps/api/test/watches-list.int-spec.ts`

**Interfaces:**
- Consumes : `matchesQuery`, `sortCards`, `paginate` (tâche 1), `WatchesService.list` (tâche 2).
- Produces : `GET /watches?status&q&sort&order&page&pageSize` conforme aux contraintes globales.

- [ ] **Step 1: écrire les tests RED.**
  - `RG-AFF-08 la recherche trouve par marque ou modèle, sans casse ni accents` ; `plusieurs mots : chacun doit être présent` ; `une recherche sans résultat renvoie items vide et total 0` ; `la recherche se combine au statut` ; `counts reste global avec une recherche` ; `?q=%25` (caractère `%`) ne renvoie que les montres contenant `%`.
  - `RG-AFF-09 sort=purchase_date&order=desc` : montres achetées 2024, 2025 et sans date → ordre 2025, 2024, sans date ; `order=asc` → 2024, 2025, sans date ; sans `sort`, ordre par id décroissant.
  - `RG-AFF-11 pagination` : 10 montres, `?pageSize=4` → `items` de 4, `total: 10`, `page: 1` ; `?page=3&pageSize=4` → 2 items ; `?page=99` → `items: []`, `total: 10` ; sans paramètre → 8 items.
  - `400` : une requête par code (`?q=`, `?sort=brand`, `?order=up`, `?order=asc` seul, `?page=0`, `?pageSize=51`).
- [ ] **Step 2: lancer** le fichier. Attendu : FAIL.
- [ ] **Step 3: implémenter** dans `list()` : cartes → `counts` et `totalMargin` (sur toutes) → filtre statut → `matchesQuery` si `q` → `sortCards` → `total = filtrées.length` → `paginate`. Mettre à jour la ligne `GET /watches` de `CONCEPTION-TECHNIQUE.md` (paramètres, réponse, calcul en mémoire et sa limite de volume).
- [ ] **Step 4: relancer** le fichier d'intégration, puis `npx vitest run src/watches` (unitaires). Attendu : PASS.
- [ ] **Step 5: commit** `feat : ajoute la recherche, le tri sur l'achat et la pagination à GET /watches`.

---

### Task 4: documentation des règles

**Files:**
- Modify: `docs/SPECS.md` (section G, S25 et S40), `docs/REGLES-GESTION.md` (tableau RG-AFF, arbitrage C6, matrice S25/S40)

**Interfaces:** aucune.

- [ ] **Step 1: SPECS.md.** Section G : S25 gagne les tuiles (Montres, En cours, Terminées, Vendues, Sans projet, Marge cumulée), le tableau desktop (Montre, Statut, Progression « 3/27 », Achat, Revente, Marge), la progression, la pagination « 1–8 sur N » et « Voir plus » en mobile ; S40 : compteurs et tuiles globaux, recherche (S40bis ou nouveau scénario Gherkin dans le style de la section : recherche insensible à la casse et aux accents, mots en ET) et tri sur l'achat. Texte du scénario en français, comme les voisins.
- [ ] **Step 2: REGLES-GESTION.md.** Ajouter RG-AFF-07 (progression), 08 (recherche), 09 (tri), 10 (marge cumulée et compteurs globaux), 11 (pagination), 12 (format d'affichage : montants sans décimales nulles, dates JJ/MM/AAAA) au tableau, colonne « Couche » comme les lignes voisines, statut « à écrire » puis « écrit » selon la convention du fichier ; compléter RG-AFF-06 (« le compteur suit le filtre » devient « le sous-titre indique le nombre de montres correspondant au filtre et à la recherche ») ; réécrire l'arbitrage C6 (tri sur l'achat inclus, autres colonnes non) ; compléter la ligne S25 et S40 de la matrice.
- [ ] **Step 3: vérifier** `git diff --stat` : seuls ces trois documents (avec la tâche 3) changent. Relire la numérotation (pas de trou ni de doublon RG-AFF).
- [ ] **Step 4: commit** `docs : ajoute les règles d'affichage du tableau de bord (recherche, tri, pagination, progression)`.

---

### Task 5: format des montants (web)

**Files:**
- Modify: `apps/web/src/format.ts`, `apps/web/src/format.spec.ts`, et les specs qui attendent des décimales nulles : `apps/web/src/views/DashboardView.spec.ts`, `WatchDetailView.spec.ts`, `apps/web/src/components/FinanceBlock.spec.ts`

**Interfaces:**
- Produces : `formatMoney(amount: string): string` supprime les décimales nulles (`'80.00'` → `'80 €'`, `'95.50'` → `'95,50 €'`, `'-20.00'` → `'-20 €'`, `'0.00'` → `'0 €'`) ; `formatMargin` en découle (`'185.00'` → `'+185 €'`, `'-25.00'` → `'−25 €'`, `'0.00'` → `'0 €'`).

- [ ] **Step 1: mettre à jour `format.spec.ts`** avec les valeurs ci-dessus, et ajouter `formatMoney('1234.50')` → `'1234,50 €'`. Lancer `npm run test:web` en arrière-plan : les autres specs qui attendent `80,00 €`, `86,00 €`, `120,00 €`, `-20,00 €`, `200,00 €`, `15,00 €`, `30,00 €`, `45,00 €`, `+80,00 €`, `−25,00 €`, `0,00 €` échouent. Attendu : FAIL listant exactement ces fichiers.
- [ ] **Step 2: implémenter** dans `format.ts` : retirer `.00` final de la partie décimale avant la virgule (chaîne, sans `Number`). `formatMargin` n'a pas à changer.
- [ ] **Step 3: corriger les attentes** des specs listées (`80 €`, `86 €`, `120 €`, `-20 €`, `200 €`, `15 €`, `30 €`, `45 €`, `+80 €`, `−25 €`, `0 €`), sans autre modification. Les montants à centimes éventuels gardent leur forme.
- [ ] **Step 4: lancer** `npm run test:web`. Attendu : PASS (239 tests ou plus).
- [ ] **Step 5: commit** `feat : affiche les montants sans décimales nulles`.

---

### Task 6: store des montres (web)

**Files:**
- Modify: `apps/web/src/stores/watches.ts`, `apps/web/src/stores/watches.spec.ts`

**Interfaces:**
- Produces :
  - `WatchCard` (type) gagne `purchasePrice: string | null`, `purchaseDate: string | null`, `resalePrice: string | null`, `resaleDate: string | null`, `progress: { done: number; total: number } | null`.
  - `interface WatchListParams { status: DashboardStatus | null; q: string; sort: 'purchase_date' | null; order: 'asc' | 'desc'; page: number }`.
  - État exposé : `items`, `counts`, `total: number`, `totalMargin: string`, `page: number`, `pageSize: number`, `loading`, `error`.
  - `list(params?: Partial<WatchListParams>, mode?: 'replace' | 'append'): Promise<void>` : fusionne `params` aux paramètres courants (non fournis = conservés ; tout changement de `status`, `q` ou `sort`/`order` remet `page` à 1 sauf si `page` est fourni) ; `mode: 'append'` ajoute `result.items` à `items`.
  - `loadMore(): Promise<void>` : `list({ page: page + 1 }, 'append')` si `items.length < total`, sinon ne fait rien.
  - `listOpenable(): Promise<WatchCard[]>` récupère toutes les pages (`pageSize=50`) avant de filtrer `completed` / `no_project`.
  - Le numéro de demande (`latestRequest`) protège aussi `loadMore`.

- [ ] **Step 1: écrire les tests RED** (`stubFetch`, comme dans le fichier) :
  - `list() n'envoie aucun paramètre superflu` : URL `/watches` sans `q` vide, `sort` ni `status` absents, `pageSize=8` et `page=1` toujours présents ;
  - `list({ q: 'seiko', status: 'sold' })` → `?status=sold&q=seiko&page=1&pageSize=8` (tester via `url.searchParams`) ;
  - `sort: 'purchase_date', order: 'asc'` → `sort=purchase_date&order=asc` ; sans `sort`, aucun `order` envoyé ;
  - changer `q` après être allé page 3 → la requête porte `page=1` ;
  - `loadMore` ajoute les items de la page suivante, ne fait rien quand `items.length >= total` ;
  - `total`, `totalMargin`, `page` reflètent la réponse ;
  - réponse tardive ignorée (cas existant à conserver, avec le nouveau `list`) ;
  - `listOpenable` avec 60 montres sur 2 pages (réponses `page=1` : 50 items, `page=2` : 10, `total: 60`) renvoie les `completed` et `no_project` des deux pages.
- [ ] **Step 2: lancer** `npx vitest run src/stores/watches.spec.ts` dans `apps/web`. Attendu : FAIL.
- [ ] **Step 3: implémenter.** `DashboardView` est adapté à la tâche 9 ; d'ici là son spec peut échouer : ne pas y toucher ici, et adapter ses appels `list(status)` au minimum pour que la suite compile (`list({ status })`). Mettre à jour `listOpenable` comme ci-dessus.
- [ ] **Step 4: lancer** `npm run test:web`. Attendu : PASS.
- [ ] **Step 5: commit** `feat : ajoute les paramètres de liste et le chargement progressif au store des montres`.

---

### Task 7: carte mobile et pastilles (web)

**Files:**
- Modify: `apps/web/src/components/WatchCard.vue`, `StatusFilter.vue`, `WatchCard.spec.ts` (créer s'il n'existe pas), `StatusFilter.spec.ts` (créer s'il n'existe pas)
- Create: `apps/web/src/composables/useIsDesktop.ts` + `.spec.ts`

**Interfaces:**
- Produces : `useIsDesktop(): Ref<boolean>` (`matchMedia('(min-width: 640px)')`, mis à jour sur `change` ; `false` si `window.matchMedia` n'existe pas, comme en jsdom). `WatchCard` et `StatusFilter` gardent leurs props et événements.

- [ ] **Step 1: tests RED.**
  - `WatchCard` : avec `thumbnailUrl: '/uploads/a.webp'`, une `<img>` dont le `src` est `fileUrl('/uploads/a.webp')`, `alt=""` ; sans projet (`status: 'no_project'`), pas d'image et une vignette `.thumb-empty` ; sans photo mais avec projet, l'icône d'horloge existante ; marge `'185.00'` → texte `+185 €` ; `'-25.00'` → `−25 €` ; la ligne meta garde « Automatique · Chronographe » ; le lien porte `title="Ouvre le détail de la montre"`.
  - `StatusFilter` : le groupe a `tabindex="0"` ; la pastille active appelle `scrollIntoView({ inline: 'center', block: 'nearest' })` quand `selected` change (stubber `Element.prototype.scrollIntoView`) ; les pastilles gardent compteurs et `aria-pressed`.
  - `useIsDesktop` : sans `matchMedia` → `false` ; avec un `matchMedia` stubbé `{ matches: true, addEventListener }` → `true`, et passe à `false` quand l'écouteur `change` reçoit `{ matches: false }`.
- [ ] **Step 2: lancer** les trois specs. Attendu : FAIL.
- [ ] **Step 3: implémenter à la maquette.** Carte : titre 14 px/600, sous-titre 12 px, badge 12 px, marge 13 px/600 (`formatMargin`), vignette 52 px avec `<img>` (`object-fit: cover`) ou cadre en pointillés (`border: 1px dashed var(--border-strong)`) pour `no_project`, règle `.status-completed::before { background: var(--accent-secondary) }`. Pastilles : `min-height: 32px`, 13 px/600, inactif `color: var(--text-secondary)`, actif `--accent` / bordure `--accent-text` / texte `--accent-ink`. Cartes en colonne (gap 12, padding 16).
- [ ] **Step 4: lancer** `npm run test:web`. Attendu : PASS.
- [ ] **Step 5: commit** `feat : aligne la carte et les pastilles du tableau de bord sur la maquette mobile`.

---

### Task 8: composants desktop et champ de recherche (web)

**Files:**
- Create: `apps/web/src/components/SearchField.vue`, `DashboardStats.vue`, `DashboardToolbar.vue`, `WatchTable.vue` et leurs `.spec.ts`

**Interfaces:**
- Produces :
  - `SearchField` : props `modelValue: string`, `width?: string` ; événement `update:modelValue` ; `<input type="search" aria-label="Rechercher une montre" placeholder="Rechercher une montre">` ; expose `focus(): void`.
  - `DashboardStats` : props `counts: StatusCounts`, `totalMargin: string` ; six `[data-test="stat"]` dans l'ordre Montres, En cours, Terminées, Vendues, Sans projet, Marge cumulée (`formatMargin`, classe `positive` si > 0).
  - `DashboardToolbar` : props `query: string`, `status: DashboardStatus | null` ; événements `update:query`, `update:status` ; contient `SearchField`, un `<select aria-label="Statut">` (Tous / En cours / Terminé / Vendue / Sans projet) et `<RouterLink to="/watches/new">Nouvelle montre</RouterLink>` précédé d'un « + ».
  - `WatchTable` : props `items: WatchCard[]`, `total: number`, `page: number`, `pageSize: number`, `sort: 'purchase_date' | null`, `order: 'asc' | 'desc'` ; événements `sort` (aucun argument : bascule), `page: [number]`. Données `data-test` : `table-row`, `sort-purchase`, `page-prev`, `page-next`, `range`.

- [ ] **Step 1: tests RED.**
  - `DashboardStats` : six tuiles, libellés et valeurs, marge `+640 €` avec la classe verte, `0 €` sans classe.
  - `DashboardToolbar` : la saisie émet `update:query` ; le select émet `update:status` avec `null` pour « Tous » ; le lien mène à `/watches/new`.
  - `WatchTable` : une ligne par montre ; colonnes Montre (sous-titre « Automatique · Date »), Statut, Progression (`3/27` et `role="progressbar"` avec `aria-valuenow`/`aria-valuemax`, « — » si `progress` est `null`), Achat (`95 €` et `01/03/2025`, « Inconnu » si prix `null`), Revente (« — » si aucune), Marge (« — » si `null`) ; en-tête Achat avec `aria-sort="none" | "descending" | "ascending"` selon `sort`/`order`, un clic émet `sort` ; pied `1–8 sur 12` pour `page=1, pageSize=8, total=12`, `9–12 sur 12` page 2 ; Précédent désactivé page 1, Suivant désactivé page 2 ; clic Suivant émet `page` avec `2` ; pas de pied si `total` vaut 0.
- [ ] **Step 2: lancer** les quatre specs. Attendu : FAIL.
- [ ] **Step 3: implémenter à la maquette desktop** : tuiles 6 colonnes, 3 colonnes à `@media (max-width: 1180px)` ; recherche 260 px, 160 px à `@media (max-width: 900px)` ; select et bouton de 36 px ; vignette 40 px (`<img>` via `fileUrl` ou cadre en pointillés) ; barre de progression 4 px ; chiffres en `.tabular` ; chevron à droite ; ligne cliquable via un lien sur le titre (`RouterLink` vers `watch-detail`).
- [ ] **Step 4: lancer** les specs du dossier `components`. Attendu : PASS.
- [ ] **Step 5: commit** `feat : ajoute les tuiles, la barre d'outils, le tableau et le champ de recherche du tableau de bord`.

---

### Task 9: assemblage de `DashboardView` (web)

**Files:**
- Modify: `apps/web/src/views/DashboardView.vue`, `apps/web/src/views/DashboardView.spec.ts`

**Interfaces:**
- Consumes : store (tâche 6), `useIsDesktop` (7), composants (7 et 8), `PageHeader` (A).
- Produces : l'écran décrit en §4 de la spec.

- [ ] **Step 1: adapter le spec existant et ajouter les cas RED.** `stubFetch` répond selon `status`, `q`, `page` ; les cartes de test portent les nouveaux champs. Le sous-titre se lit via `[data-test="subtitle"]` (celui de `PageHeader`). Cas mobile (jsdom, `useIsDesktop` faux) : sous-titre `N montres` d'après `total` ; `1 montre · Vendue` avec le filtre ; le bouton « Voir plus » ajoute la page suivante et disparaît quand `items.length >= total` ; le champ de recherche est absent sans `?recherche=1`, présent et focalisé avec `/?recherche=1` ; la saisie (avec `vi.useFakeTimers`, 300 ms) lance une seule requête `q=...` avec `page=1` ; effacer la saisie retire `q` ; message vide adapté (« Aucune montre ne correspond à votre recherche. » si `q`, le message de statut sinon) ; le bouton avatar reste ; aucun bouton « Nouvelle montre » dans l'en-tête mobile (la barre du bas le porte), le lien du message « aucune montre » reste. Cas desktop (stubber `matchMedia` → `matches: true`) : tuiles, tableau, barre d'outils présents, pastilles et « Voir plus » absents ; clic Suivant → requête `page=2` et remplacement des lignes ; clic sur Achat → `sort=purchase_date&order=desc`, deuxième clic `asc`, troisième sans `sort` ; changement de statut ou de recherche → `page=1` ; les tuiles ne changent pas avec le filtre.
- [ ] **Step 2: lancer** `npx vitest run src/views/DashboardView.spec.ts`. Attendu : FAIL.
- [ ] **Step 3: implémenter.** `PageHeader` (slot `actions`) porte, sous 640 px, le bouton avatar repris de la vue et, à partir de 640 px, `DashboardToolbar`. Mobile : `StatusFilter`, `SearchField` conditionnel, liste de `WatchCard`, « Voir plus » (`watches.loadMore()`). Desktop : `DashboardStats` puis `WatchTable`, qui émet `sort` (bascule `desc` → `asc` → aucun) et `page`. La recherche est temporisée à 300 ms avant `watches.list({ q })`. Le focus du champ mobile suit `route.query.recherche === '1'`. Le sous-titre n'est affiché ni pendant le premier chargement ni en erreur (comportement existant).
- [ ] **Step 4: lancer** `npm run test:web` en arrière-plan, puis `npm run lint`. Attendu : PASS.
- [ ] **Step 5: commit** `feat : assemble le tableau de bord mobile et desktop à la maquette`.

---

### Task 10: e2e, vérification visuelle et clôture

**Files:**
- Create: `e2e/dashboard.spec.ts`
- Modify: `.superpowers/sdd/2026-11-06-fidelite-tableau-de-bord/progress.md` (ledger)

**Interfaces:** aucune.

- [ ] **Step 1: écrire `e2e/dashboard.spec.ts`** (helpers `createVerifiedAccount`, `login`, `uniqueEmail`, `API_URL`). Créer 10 montres par `POST /watches` avec le jeton de l'utilisateur (`/auth/login` pour l'obtenir). Cas desktop : tuiles et `Marge cumulée` visibles ; `1–8 sur 10`, Suivant → `9–10 sur 10` ; recherche d'une marque unique → une seule ligne ; clic sur Achat → `aria-sort` change. Cas mobile 390 px : « Voir plus » charge les 2 montres restantes ; `/?recherche=1` focalise le champ.
- [ ] **Step 2: lancer** `npm run test:e2e` en arrière-plan. Attendu : 8 parcours existants + les nouveaux au vert.
- [ ] **Step 3: captures Chrome** (spec Playwright jetable, non commitée, dans le scratchpad) à 390, 768 et 1280 px avec 12 montres variées (sans projet, vendue, photo, achat inconnu), comparées aux deux maquettes ; corriger les écarts visibles dans les composants concernés (retouches commitées à part : `fix : aligne … sur la maquette`).
- [ ] **Step 4: relecture finale** par un sous-agent Opus de toute la branche depuis `9dffc5d`. Traiter les remarques.
- [ ] **Step 5: ledger** : listes exhaustives « Rulings I made » (libellé « Nouvelle montre » ; champ de recherche mobile sans maquette ; « Voir plus » mobile ; `formatMoney` global ; calcul en mémoire et sa limite ; bascule du tri `desc → asc → aucun` ; `order` sans `sort` refusé ; `listOpenable` sur toutes les pages ; barre d'outils dans le slot `actions` de `PageHeader`) et « Deferred » ; commit `docs : consigne le sous-projet B au registre`.
- [ ] **Step 6: vérifier** `npm run lint`, `npm run test:web`, puis (séparément) `npm run test:api` et `npm run test:e2e`. Proposer ensuite le sous-projet C sans l'engager, la mise à jour de la mémoire du projet et de la grille du skill jury-cda.
