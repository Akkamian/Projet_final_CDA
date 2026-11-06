# Fidélité aux maquettes, sous-projet C : fiche montre et projet — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** refaire la fiche montre (`WatchDetailView`) à la maquette, mobile et desktop : en-tête, bandeau de faits, onglets de projet, menu « ⋯ », étapes, finances, performances en échelles, plus l'écran « Modifier la montre » et le champ API `costPrice`.

**Architecture :** une seule vue et un seul rendu, mise en page en CSS pur (DOM dans l'ordre mobile : en-tête, `.rail` Finances et Avant/Après, `.main` Étapes et Performances ; grille à deux colonnes dès 1181 px). Les verdicts de performance sont des fonctions pures dans `performance-zones.ts`. Le coût de revient est calculé par l'API à côté de la marge.

**Tech Stack :** NestJS + Prisma (Vitest unitaires et intégration), Vue 3 + Pinia + vue-router (Vitest + @vue/test-utils), Playwright.

**Spec :** `docs/superpowers/specs/2026-11-06-fiche-montre-design.md` (audit : `.superpowers/sdd/2026-11-05-fidelite-structure-commune/audit-ecarts-maquettes.md`, section 2). Maquettes : `design/2026-09-25-screen-project-detail-*`, `design/2026-10-07-screen-project-detail-etats-*`, `design/2026-10-07-screen-project-detail-desktop-vendue-*`.

## Global Constraints

- `GET /watches/:id` (et les réponses qui renvoient une fiche : création, PATCH, revente) gagne `costPrice: string | null` = prix d'achat + somme des coûts de **tous** les projets, 2 décimales, `null` si le prix d'achat est inconnu ; `Prisma.Decimal`, jamais de flottant. Aucun autre changement de contrat.
- Zones cibles (constantes indicatives, un seul module `apps/web/src/performance-zones.ts`) : marche ±10 s/j, beat error ≤ 0,5 ms, amplitude 250–310°. Bornes incluses (10 s/j et 0,5 ms et 250° et 310° sont « dans la zone »).
- Verdicts : « Avance de 14 s/j · hors zone (±10 s/j) », « Retard de 3 s/j · dans la zone (±10 s/j) », « Dans la zone (≤ 0.5 ms) », « Hors zone (≤ 0.5 ms) », « Dans la zone (250–310°) », « Hors zone (250–310°) ». Marche nulle : « Marche juste · dans la zone (±10 s/j) ».
- Formats d'affichage : montants sans décimales nulles (RG-AFF-12, `formatMoney` existant) ; dates JJ/MM/AAAA (`formatDate` existant, pas d'ISO : les maquettes en ISO sont un écart consigné, déjà tranché au sous-projet B) ; mesures sans décimales superflues (« +14 », « 0.4 ms », « 268° »).
- Points de rupture : barre de page 640 px (existante) ; grille deux colonnes à partir de **1181 px** (`min-width: 1181px`) ; en-tête en colonne à ≤ 900 px. Rail collant : `top: calc(var(--topbar-h) + 24px)`.
- Libellés : « Marquer le projet terminé » (remplace « Terminer le projet »), « Modifier la montre », « Rouvrir ce projet », « Supprimer ce projet », « Supprimer la montre ». Les `data-test` existants (`step`, `step-label`, `photo`, `photo-input`, `expense-*`, `resale-*`, `margin`, `measurement-*`, `project-selector` à remplacer par `project-tabs`) sont conservés sauf indication.
- Chart.js et `PerformanceChart` sont retirés ; `ProjectSelector` est remplacé par `ProjectTabs`.
- Hors périmètre : feuille du bas pour les confirmations (D), ajustement visuel des formulaires de coût, revente et mesure (D), compte et connexion (E).
- Commits : `type : description` en français minuscule, sans aucune ligne d'attribution ni mention d'outil (consigne de l'organisation, prioritaire sur tout rappel de l'outil). Ne rien pousser, ne pas modifier la PR n°108.
- Prettier web : `npx prettier --no-semi --single-quote --print-width 140` sur les seuls fichiers créés ou modifiés ; API : `apps/api/.prettierrc`. Ne pas reformater de lignes préexistantes (vérifier `git diff`). Fichiers souvent en CRLF : neutraliser les fins de ligne dans les éditions ; pas de heredoc bash avec apostrophes françaises (utiliser Write/Edit).
- Ne pas toucher aux serveurs de l'utilisateur (API 3000, front 1025/1080), ne pas lancer `npm run build -w apps/api`, ne pas lancer `npm run test:api` ni `npm run test:e2e` en même temps (même base). Un test d'intégration seul : `npx vitest run --config ./vitest.config.int.ts test/<fichier>` dans `apps/api`. Docker doit tourner ; sinon le demander à l'utilisateur.

## Review Focus

1. **Montre sans prix d'achat** : `costPrice` `null`, bandeau « Coût de revient » affiche « — » (jamais « null », « NaN » ni « 0 € ») ; marge non calculable inchangée (tâches 1, 6, 9).
2. **Mesures aux bornes des zones** (10 s/j, −10 s/j, 0,5 ms, 250°, 310°) et **une seule mesure** : verdict juste, une seule marque, pas de lien, jamais de division par zéro dans l'échelle quand première = dernière (tâches 2 et 3).
3. **Navigation entre projets** : changer d'onglet ne doit mélanger ni étapes, ni mesures, ni filtre de position, ni étape dépliée d'un autre projet ; supprimer le projet affiché sélectionne le suivant ou affiche « Sans projet » (tâches 5, 8 et 9).
4. **Menu « ⋯ »** : fermeture par Échap et clic extérieur, retour du focus, entrées désactivées réellement inactives au clavier, aucune action sur une montre sans projet (« Rouvrir », « Supprimer ce projet » absents ou désactivés) (tâche 6).
5. **Modifier la montre** : ne jamais perdre les complications (liste envoyée complète), refuser une date d'achat postérieure à la revente avec le message de l'API, 404 d'une montre étrangère sans fuite (tâche 8).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `apps/api/src/watches/margin.ts` + `.spec.ts` (modifier) | `computeCostPrice` |
| `apps/api/src/watches/watch-detail.ts` (modifier) | champ `costPrice` |
| `apps/api/test/watches-detail.int-spec.ts` (modifier) | tests d'intégration RED d'abord |
| `apps/web/src/performance-zones.ts` + `.spec.ts` (créer) | zones cibles, verdicts, position des marqueurs |
| `apps/web/src/format.ts` + `.spec.ts` (modifier) | `formatMeasure`, `formatDelta` |
| `apps/web/src/components/PerformanceScales.vue` + spec (créer) | trois échelles |
| `apps/web/src/components/PerformanceBlock.vue` + spec (modifier, spec créé) | échelles, filtre de position, tableau |
| `apps/web/src/components/PerformanceChart.vue` + `.spec.ts` (supprimer), `apps/web/package.json`, `package-lock.json` | retrait de Chart.js |
| `apps/web/src/components/StepItem.vue`, `StepList.vue` + specs (modifier) | ligne d'étape, dépliage, progression |
| `apps/web/src/components/ProjectTabs.vue` + spec (créer), `ProjectSelector.vue` (supprimer) | onglets de projet |
| `apps/web/src/components/WatchFacts.vue`, `WatchHero.vue`, `WatchMenu.vue` + specs (créer) | bandeau de faits, photo et titre, menu « ⋯ » |
| `apps/web/src/components/PageHeader.vue` + spec (modifier) | fil d'Ariane (`parent`) |
| `apps/web/src/components/FinanceBlock.vue` + spec (modifier) | blocs revente et marge, titres |
| `apps/web/src/stores/watches.ts` + spec (modifier) | `costPrice`, `update(id, patch)` |
| `apps/web/src/views/EditWatchView.vue` + spec (créer), `router/index.ts` (modifier) | route `/watches/:id/edit` (S10) |
| `apps/web/src/views/WatchDetailView.vue`, `WatchDetailView.spec.ts`, `WatchLifecycle.spec.ts` (modifier) | assemblage |
| `e2e/watch-detail.spec.ts` (créer), `e2e/resale.spec.ts` (modifier) | parcours fiche |
| `docs/SPECS.md`, `docs/CONCEPTION-TECHNIQUE.md`, `docs/REGLES-GESTION.md` (modifier) | S10, S20, D7, RG |

---

### Task 1: `costPrice` (API)

**Files:**
- Modify: `apps/api/src/watches/margin.ts`, `apps/api/src/watches/watch-detail.ts`
- Test: `apps/api/src/watches/margin.spec.ts`, `apps/api/test/watches-detail.int-spec.ts`

**Interfaces:**
- Produces : `computeCostPrice(input: { purchasePrice: Prisma.Decimal | null; expenses: Prisma.Decimal[] }): Prisma.Decimal | null` ; `WatchDetail.costPrice: string | null`.

- [ ] **Step 1: tests unitaires dans `margin.spec.ts`.** Prix d'achat 120 et coûts [45, 30.5] → `195.5` ; sans coût → `120` ; prix d'achat `null` → `null` ; `0.1 + 0.2` en coûts → exactement `0.3` (pas de flottant).
- [ ] **Step 2: tests d'intégration dans `watches-detail.int-spec.ts`**, au style des tests de marge : `RG-FIN-13 le coût de revient additionne l'achat et les coûts de tous les projets` (2 projets, coûts 45 et 30, achat 120 → `"195.00"`) ; `RG-FIN-13 le coût de revient est renvoyé même si la montre n'est pas vendue` ; `RG-FIN-13 sans prix d'achat le coût de revient est null` ; `RG-FIN-13 il suit l'ajout et la suppression d'un coût` (relire la fiche après chaque écriture).
- [ ] **Step 3: lancer** les deux specs (unitaire : `npx vitest run src/watches/margin.spec.ts` ; intégration : `npx vitest run --config ./vitest.config.int.ts test/watches-detail.int-spec.ts`, dans `apps/api`). Attendu : FAIL (`computeCostPrice` absent, `costPrice` undefined).
- [ ] **Step 4: implémenter** `computeCostPrice` dans `margin.ts` (somme en `Prisma.Decimal`, `null` si achat `null`), l'exposer dans l'interface `WatchDetail` et dans `toWatchDetail` avec le même appel `flatMap` des coûts que la marge (`money(...)`).
- [ ] **Step 5: relancer** les deux specs puis `npx vitest run --config ./vitest.config.int.ts test/watches-create.int-spec.ts test/watches-update.int-spec.ts test/watches-resale.int-spec.ts` (ces réponses portent aussi la fiche). Attendu : PASS.
- [ ] **Step 6: commit** `feat : ajoute le coût de revient à la fiche montre de l'API`.

---

### Task 2: zones cibles et formats de mesure (web)

**Files:**
- Create: `apps/web/src/performance-zones.ts`, `apps/web/src/performance-zones.spec.ts`
- Modify: `apps/web/src/format.ts`, `apps/web/src/format.spec.ts`

**Interfaces:**
- Produces (`performance-zones.ts`) :
  - `ZONES = { rate: { min: -10, max: 10 }, beatError: { min: 0, max: 0.5 }, amplitude: { min: 250, max: 310 } }`
  - `type Verdict = { inZone: boolean; text: string }`
  - `rateVerdict(rate: number): Verdict`, `beatErrorVerdict(ms: number): Verdict`, `amplitudeVerdict(deg: number): Verdict`
  - `scalePosition(value: number, domain: { min: number; max: number }): number` : pourcentage 0–100, borné ; domaine de largeur nulle → 50.
  - `scaleDomain(kind: 'rate' | 'beatError' | 'amplitude', values: number[]): { min: number; max: number }` : domaine fixe pour beat error (0 à max(1, plus grande valeur × 1,2)) et amplitude (150–400, élargi si une valeur sort) ; pour la marche, englobe la zone ±10 et les valeurs avec 10 % de marge.
- Produces (`format.ts`) : `formatMeasure(value: string, unit = ''): string` (« 14.00 » → « 14 », « 0.40 » → « 0.4 », « 268.00 » → « 268 », unité accolée avec espace pour « ms » et sans espace pour « ° ») ; `formatDelta(current: string, previous: string | null): string | null` (écart signé « −12 » avec vrai signe moins, « +3 » en positif, `null` si `previous` est `null`).

- [ ] **Step 1: tests de `performance-zones.spec.ts`.** `rateVerdict(14)` → `{ inZone: false, text: 'Avance de 14 s/j · hors zone (±10 s/j)' }` ; `rateVerdict(10)` et `rateVerdict(-10)` dans la zone (« Retard de 10 s/j · dans la zone (±10 s/j) ») ; `rateVerdict(10.01)` hors zone ; `rateVerdict(0)` → « Marche juste · dans la zone (±10 s/j) » ; `beatErrorVerdict(0.5)` dans la zone, `0.51` hors zone ; `amplitudeVerdict(250)` et `310` dans la zone, `249.9` et `310.1` hors zone ; `scalePosition(5, {min:0,max:10})` → 50, valeur hors domaine → 0 ou 100, largeur nulle → 50 ; `scaleDomain('rate', [48, 14])` englobe −10 à 52,8 au moins.
- [ ] **Step 2: tests de `format.spec.ts`** : `formatMeasure('14.00')` → `14`, `('0.40','ms')` → `0.4 ms`, `('268.00','°')` → `268°`, `('-12.50')` → `−12.5` (vrai signe moins) ; `formatDelta('14.00','26.00')` → `−12` (écart entre la marche courante et la marche précédente **à la même position**, la maquette affiche « +14 (−12) » puis « +26 (−22) »), `formatDelta('26.00','48.00')` → `−22`, `formatDelta('35.00', null)` → `null` (aucune mesure précédente à cette position).
- [ ] **Step 3: lancer** `npx vitest run src/performance-zones.spec.ts src/format.spec.ts` dans `apps/web`. Attendu : FAIL.
- [ ] **Step 4: implémenter** les deux modules. Les verdicts n'utilisent que `ZONES` (aucune valeur répétée dans le texte : construire le texte depuis les constantes).
- [ ] **Step 5: relancer.** Attendu : PASS.
- [ ] **Step 6: commit** `feat : ajoute les zones cibles et les formats de mesure de la fiche`.

---

### Task 3: composant `PerformanceScales`

**Files:**
- Create: `apps/web/src/components/PerformanceScales.vue`, `apps/web/src/components/PerformanceScales.spec.ts`

**Interfaces:**
- Consumes : `MeasurementDetail` (store), `rateVerdict`, `beatErrorVerdict`, `amplitudeVerdict`, `scalePosition`, `scaleDomain`, `ZONES`.
- Produces : `<PerformanceScales :measurements="MeasurementDetail[]" />` (mesures dans n'importe quel ordre ; le composant en tire la première et la dernière chronologiques).

- [ ] **Step 1: tests.** Avec deux mesures (marche 48 puis 14, beat 2.3 puis 0.4, amplitude 186 puis 268) : trois pistes `role="img"` dont l'`aria-label` reprend la maquette (« Marche : +48 puis +14 s/j, zone cible ±10 s/j », « Beat error : 2.3 puis 0.4 ms, zone cible ≤ 0.5 ms », « Amplitude : 186 puis 268 °, zone cible 250–310° ») ; trois verdicts affichés avec les textes des contraintes globales ; classes `ok` / `warn` sur le verdict et le marqueur final selon `inZone`. Avec **une seule mesure** : un seul marqueur, aucun lien, aucun `NaN` dans les `style` ; avec deux mesures identiques : pas de division par zéro ; liste vide : composant vide (rien à rendre). Légende « première mesure · dernière mesure · bande = zone cible (repères indicatifs) ».
- [ ] **Step 2: lancer** le spec. Attendu : FAIL.
- [ ] **Step 3: implémenter** `PerformanceScales.vue` : une `.scale` par grandeur (libellé, valeurs, piste de 16 px avec `.zone`, `.link`, `.mk.first`, `.mk.last`, verdict). Positions en `%` via `scalePosition` et `scaleDomain`. Styles repris de la maquette (section « Performances : échelles avec zone cible et position », lignes ~935–960 de `design/2026-09-25-screen-project-detail-desktop-technique-luminova-green.html`) avec les jetons CSS existants.
- [ ] **Step 4: relancer.** Attendu : PASS.
- [ ] **Step 5: commit** `feat : ajoute les échelles de performance avec zone cible`.

---

### Task 4: `PerformanceBlock` à la maquette, retrait de Chart.js

**Files:**
- Modify: `apps/web/src/components/PerformanceBlock.vue`, `apps/web/package.json`, `package-lock.json`
- Create: `apps/web/src/components/PerformanceBlock.spec.ts`
- Delete: `apps/web/src/components/PerformanceChart.vue`, `apps/web/src/components/PerformanceChart.spec.ts`

**Interfaces:**
- Consumes : `PerformanceScales`, `formatMeasure`, `formatDelta` ; les props et événements actuels de `PerformanceBlock` restent identiques (`projectId`, `measurements`, `update:measurements`).

`PerformanceChart.spec.ts` contient aussi des tests du formulaire de mesure et de la liste (ajout, correction `{ beatErrorMs: 0.3, watchPosition: null }`, suppression) : les migrer vers `PerformanceBlock.spec.ts` avant de supprimer le fichier, sans en perdre un seul ; ne supprimer que les tests du graphique.

- [ ] **Step 1: créer `PerformanceBlock.spec.ts`** avec les tests migrés (ajout, correction, suppression avec confirmation, erreur) puis les nouveaux : `S20 les échelles remplacent le graphique` (présence de `PerformanceScales`, absence de `canvas`) ; `RG-PER-04 le tableau montre les mesures de la plus récente à la plus ancienne` ; colonne Position affichée ; delta de marche « +14 (−12) » sur les lignes qui ont une mesure précédente **à la même position** (« +35 » seul si aucune ; une mesure sans position n'a jamais de delta) ; `le filtre de position` : pastilles « Toutes » et une par position présente avec son nombre (« Cadran haut 3 »), choisir une pastille restreint le tableau **et** les échelles, la pastille d'une position disparue (mesure supprimée) revient sur « Toutes » ; `« + Mesure » reste affiché` ; message vide inchangé.
- [ ] **Step 2: lancer** `npx vitest run src/components/PerformanceBlock.spec.ts`. Attendu : FAIL sur les nouveaux tests, PASS sur les migrés (ils tournent sur le code actuel).
- [ ] **Step 3: implémenter** dans `PerformanceBlock.vue` : remplacer `PerformanceChart` par `PerformanceScales`, ajouter l'état `position` (filtre) réinitialisé quand la position n'existe plus, la colonne Position (en retirant le `span.pos` sous la date), le delta, `formatMeasure` pour marche, beat error (« ms ») et amplitude (« ° »). Titre de bloc 13 px majuscules, « + Mesure » inchangé.
- [ ] **Step 4: retirer Chart.js** : supprimer `PerformanceChart.vue` et son spec, retirer `chart.js` de `apps/web/package.json` et du `package-lock.json` (`npm uninstall chart.js -w apps/web` ; vérifier avec `grep -rn "chart.js" apps/web/src` qu'aucun import ne subsiste).
- [ ] **Step 5: lancer** `npx vitest run src/components` puis `npx vue-tsc --noEmit -p tsconfig.app.json` si le script existe (sinon `npm run build -w apps/web` est interdit côté API seulement : le build web est permis). Attendu : PASS, aucune erreur de type nouvelle.
- [ ] **Step 6: commit** `feat : remplace le graphique de performances par les échelles de la maquette`.

---

### Task 5: lignes d'étape dépliables et progression

**Files:**
- Modify: `apps/web/src/components/StepItem.vue`, `apps/web/src/components/StepList.vue`, `apps/web/src/components/StepList.spec.ts`

**Interfaces:**
- Produces : `StepItem` reçoit `index: number` (rang affiché, base 0) et `expanded: boolean` (remplace le rôle de `editing` pour le dépliage) ; nouveaux événements `toggle-expand`. `StepList` garde ses props et son événement `update:steps`.

La ligne (toujours visible) : case à cocher, index « 01 », titre, puce « N photos » (absente à 0), « Terminé le <date> » (`formatDate(completedAt)`) ou « Notes en cours » quand la note existe et l'étape n'est pas terminée, chevron. Le panneau déplié contient notes, galerie de photos, actions (↑ ↓ ✎ ✕) et l'éditeur. `data-test="step"` reste sur le `li`, la case à cocher sur la ligne ; `data-test="photo-input"` n'est dans le DOM que dans le panneau déplié.

- [ ] **Step 1: tests dans `StepList.spec.ts`** (adapter les existants qui cliquent ✎, ↑, ↓, ✕, ajoutent une photo : ils déplient d'abord la ligne) : `la ligne montre index 01, titre, « 2 photos » et « Terminé le … »` ; `« Notes en cours » pour une étape non terminée qui a une note` ; `rien dans la puce sans photo` ; `le chevron déplie et replie, aria-expanded suit` ; `une seule ligne dépliée à la fois` ; `la barre de progression expose role="progressbar" avec aria-valuenow = étapes terminées` ; `toutes terminées : récapitulatif replié « Toutes les étapes sont terminées », dépliable pour voir les lignes` ; `la liste ne se réutilise pas d'un projet à l'autre` (le `:key` de la vue reste, le test existant S26 couvre l'état déplié).
- [ ] **Step 2: lancer** `npx vitest run src/components/StepList.spec.ts`. Attendu : FAIL.
- [ ] **Step 3: implémenter.** `expandedId` remplace `editingId` pour le dépliage ; l'éditeur d'étape s'ouvre via ✎ dans le panneau (comportement actuel conservé : `editingId`). Barre de progression de 4 px (`--accent`) sous l'en-tête de la carte ; compteur « N/M terminées » conservé. Carte « Étapes » : titre 13 px majuscules.
- [ ] **Step 4: relancer** le spec puis `npx vitest run src/views` (les specs de la fiche touchent `step`). Attendu : PASS.
- [ ] **Step 5: commit** `feat : met les étapes de la fiche à la maquette (index, puces, dépliage, progression)`.

---

### Task 6: onglets, bandeau, photo et menu

**Files:**
- Create: `apps/web/src/components/ProjectTabs.vue`, `WatchFacts.vue`, `WatchHero.vue`, `WatchMenu.vue` et leurs `.spec.ts`
- Modify: `apps/web/src/components/PageHeader.vue`, `apps/web/src/components/PageHeader.spec.ts`
- Delete: `apps/web/src/components/ProjectSelector.vue`

**Interfaces:**
- `ProjectTabs` : props `projects: ProjectDetail[]`, `selectedId: number | null` ; événement `select: [id: number]` ; `data-test="project-tabs"`, rendu seulement avec ≥ 2 projets (S26) ; `role="tablist"`, chaque pilule `role="tab"` avec `aria-selected`, libellé « <date> · En cours|Terminé », flèches gauche/droite entre onglets.
- `WatchFacts` : props `watch: WatchDetail`, `project: ProjectDetail | null` ; affiche Achat / Coût de revient / Progression / Dernière mesure (montre non vendue) ou Achat / Coût de revient / Revente / Marge (vendue) ; valeur absente → « — » ; progression « N/M » de l'étape du projet affiché ; dernière mesure = marche de la mesure la plus récente (« +14 s/j »).
- `WatchHero` : props `watch: WatchDetail`, `project: ProjectDetail | null`, `status: 'in_progress' | 'completed' | 'sold' | 'no_project'` ; photo `fileUrl(photoAfter ?? photoBefore)` ou vignette en pointillés (comme `WatchCard`), titre (h2 sur la fiche, la `h1` étant celle de `PageHeader`), sous-titre mouvement et complications, badge `STATUS_LABELS[status]`.
- `WatchMenu` : props `canReopen: boolean`, `reopenNote: string | null`, `hasProject: boolean` ; événements `edit`, `reopen`, `remove-project`, `remove-watch` ; bouton « ⋯ » `aria-haspopup="menu"` `aria-expanded`, panneau `role="menu"` min 240 px, entrées `role="menuitem"`.
- `PageHeader` : nouvelle prop facultative `parent?: { label: string; to: RouteLocationRaw }` : à partir de 640 px, fil d'Ariane « <label> / » devant le titre et bouton de retour masqué ; sous 640 px, comportement actuel inchangé.

- [ ] **Step 1: tests** (un spec par composant). `ProjectTabs` : 1 projet → rien ; 2 projets → 2 onglets, le sélectionné a `aria-selected="true"`, clic et flèches émettent `select`. `WatchFacts` : montre non vendue avec achat 120 et coûts 75 → « 120 € », « 195 € » ; **sans prix d'achat** → « — » aux deux et jamais « null » ou « NaN » ; vendue → Revente et Marge à la place de Progression et Dernière mesure ; marge négative « −25 € ». `WatchHero` : photo après sinon avant sinon vignette ; badge selon le statut ; titre et sous-titre. `WatchMenu` : fermé par défaut ; `Enter` ou clic ouvre ; `Escape` ferme et rend le focus au bouton ; clic extérieur ferme ; « Rouvrir » désactivé (`aria-disabled="true"`, pas d'événement) avec la note affichée quand `canReopen` est faux ; sans projet, « Rouvrir » et « Supprimer ce projet » ne sont pas proposés ; chaque entrée émet son événement et ferme le menu. `PageHeader` : avec `parent`, le fil d'Ariane est présent dans le DOM (masqué en dessous de 640 px par CSS, vérifier la classe) et un lien vers `parent.to` ; sans `parent`, rendu inchangé (tests existants verts).
- [ ] **Step 2: lancer** `npx vitest run src/components/ProjectTabs.spec.ts src/components/WatchFacts.spec.ts src/components/WatchHero.spec.ts src/components/WatchMenu.spec.ts src/components/PageHeader.spec.ts`. Attendu : FAIL.
- [ ] **Step 3: implémenter** les quatre composants et la prop `parent`, avec les styles des maquettes (pilules, bandeau de 4 faits, carte d'en-tête 200×140 desktop / hero 150 px mobile, popover). Supprimer `ProjectSelector.vue` seulement à la tâche 9 (le spec de la vue l'utilise encore) : ici, ne pas toucher à la vue.
- [ ] **Step 4: relancer.** Attendu : PASS (l'erreur `vue-tsc` préexistante de `PageHeader.spec.ts` n'est pas à corriger).
- [ ] **Step 5: commit** `feat : ajoute onglets de projet, bandeau de faits, en-tête photo et menu de la fiche`.

---

### Task 7: bloc Finances à la maquette

**Files:**
- Modify: `apps/web/src/components/FinanceBlock.vue`, `apps/web/src/components/FinanceBlock.spec.ts`, `apps/web/src/stores/watches.ts`, `apps/web/src/stores/watches.spec.ts`

**Interfaces:**
- Consumes : `WatchDetail.costPrice`. Produces : type `WatchDetail.costPrice: string | null` dans le store ; `FinanceBlock` garde ses props et événements.

- [ ] **Step 1: tests** (adapter les existants) : `RG-FIN-13 le coût de revient est affiché` (« 195 € ») et « — » sans prix d'achat ; `revente : bloc avec prix et date` ; `montre non vendue : encart « Revente non renseignée »` conservé ; `RG-FIN-06 la marge affiche la formule « 350 − 120 − 45 » et « coûts des 2 projets »` (seuls les projets avec coûts sont comptés dans N ; un seul → « coûts du projet ») ; marge négative avec vrai signe moins ; **les montants de la formule sans décimales nulles** ; `data-test="margin"` et `expenses-total` inchangés ; groupes de coûts par projet inchangés (RG-FIN-09).
- [ ] **Step 2: lancer** `npx vitest run src/components/FinanceBlock.spec.ts`. Attendu : FAIL.
- [ ] **Step 3: implémenter** : ajouter `costPrice` au type du store ; dans `FinanceBlock`, blocs revente et marge (26 px/600, vert) avec formule, titre « FINANCES » 13 px majuscules, « Coût de revient » dans la liste de faits ; supprimer le titre « Coûts par projet » redondant uniquement s'il double un titre de la maquette (sinon le garder). Les formulaires `ExpenseForm` et `ResaleForm` ne changent pas.
- [ ] **Step 4: relancer** `npx vitest run src/components/FinanceBlock.spec.ts src/stores`. Attendu : PASS.
- [ ] **Step 5: commit** `feat : met le bloc finances à la maquette avec le coût de revient et la formule de marge`.

---

### Task 8: « Modifier la montre » (S10)

**Files:**
- Create: `apps/web/src/views/EditWatchView.vue`, `apps/web/src/views/EditWatchView.spec.ts`
- Modify: `apps/web/src/router/index.ts`, `apps/web/src/stores/watches.ts`, `apps/web/src/stores/watches.spec.ts`

**Interfaces:**
- Produces : `watches.update(id: number, patch: UpdateWatchPayload): Promise<WatchDetail>` (`PATCH /watches/:id`, `UpdateWatchPayload = { brand?: string; model?: string; movementCode?: 'manual' | 'automatic'; complicationCodes?: string[]; purchasePrice?: string | null; purchaseDate?: string | null }`) ; route `{ path: '/watches/:id/edit', name: 'edit-watch' }`.

Choix de conception (ruling d'exécution à consigner) : le formulaire de `NewWatchView` est un assistant en deux temps qui génère des étapes ; un mode édition l'obligerait à se désactiver à moitié. `EditWatchView` est donc une vue distincte, à un seul écran, qui réutilise `useStepPreviewStore` pour la liste des mouvements et des complications et la même validation de saisie que `NewWatchView` (prix `^\d{1,8}(\.\d{1,2})?$` avec virgule acceptée, date d'achat non future). Le texte « Ces informations se modifient depuis la fiche de la montre » de `NewWatchView` devient vrai.

- [ ] **Step 1: tests du store** : `update` envoie `PATCH /watches/7` avec le corps donné et renvoie la fiche. **Tests de la vue** : charge la fiche et préremplit marque, modèle, mouvement, complications, prix, date ; enregistrer envoie uniquement les champs modifiés et **la liste complète des complications** (jamais une liste partielle) puis revient à `/watches/:id` ; marque vide → message « La marque est obligatoire. » sans appel ; prix invalide et date future refusés comme à la création ; 400 `PURCHASE_AFTER_RESALE` de l'API affiché tel quel ; 404 → « Cette montre est introuvable. » ; « Annuler » revient à la fiche sans appel ; un second clic sur « Enregistrer » pendant l'envoi est ignoré.
- [ ] **Step 2: lancer** `npx vitest run src/views/EditWatchView.spec.ts src/stores/watches.spec.ts`. Attendu : FAIL.
- [ ] **Step 3: implémenter** le store, la route (même garde d'authentification que `watch-detail`), la vue (titre « Modifier la montre », `PageHeader` avec retour vers la fiche, formulaire avec champs et styles de `NewWatchView`).
- [ ] **Step 4: relancer.** Attendu : PASS.
- [ ] **Step 5: commit** `feat : ajoute l'écran de modification d'une montre`.

---

### Task 9: assemblage de `WatchDetailView`

**Files:**
- Modify: `apps/web/src/views/WatchDetailView.vue`, `apps/web/src/views/WatchDetailView.spec.ts`, `apps/web/src/views/WatchLifecycle.spec.ts`, `apps/web/src/components/BeforeAfter.vue` (titre de bloc seulement)
- Delete: `apps/web/src/components/ProjectSelector.vue` (s'il subsiste)

**Interfaces:**
- Consumes : tous les composants des tâches 3 à 8.

Structure (spec, section « Structure ») : `PageHeader` (titre « marque modèle » en `h1`, `back` vers `/`, `parent` « Tableau de bord » vers `/`, slot `actions` : desktop « Modifier la montre » + `WatchMenu` + « Marquer le projet terminé », mobile `WatchMenu` seul) ; `WatchHero` ; `WatchFacts` ; `ProjectTabs` ; bouton « Marquer le projet terminé » avec hint « Passe le projet au statut Terminé » ou, projet terminé, « Terminé le <date> » ; si montre vendue, hint « Montre vendue : aucun nouveau projet… » à la place de « Nouvelle révision » ; `<div class="rail">` (FinanceBlock, BeforeAfter) puis `<div class="main">` (StepList, PerformanceBlock) ; grille deux colonnes à ≥ 1181 px avec rail collant. La zone de danger est supprimée ; les dialogues `ConfirmDialog` de suppression et leur logique `confirmRemove` restent. Statut du badge : `sold` si `resaleDate`, sinon `no_project` sans projet, sinon le statut du projet affiché.

- [ ] **Step 1: adapter et compléter les tests.** Conserver S25, S12, S18, S19, S21, S22, S23 et la réponse tardive ; remplacer les tests du sélecteur par `S26 les onglets n'apparaissent qu'avec 2 projets ou plus` et `S26 le projet le plus récent est affiché d'abord, un onglet change de projet`. Mettre à jour `WatchLifecycle.spec.ts` : « Terminer le projet » devient « Marquer le projet terminé » ; « Rouvrir » et les suppressions passent par le menu « ⋯ » (ouvrir le menu avant de cliquer). Ajouter : `l'ordre du DOM est en-tête, finances, avant/après, étapes, performances` ; `changer d'onglet ne garde ni étape dépliée ni filtre de position de l'autre projet` ; `supprimer le projet affiché sélectionne le suivant, et le dernier laisse « Sans projet »` ; `montre vendue : hint, aucun bouton Marquer ni Nouvelle révision, « + Mesure » présent` ; `« Rouvrir ce projet » désactivé avec note quand un autre projet est en cours ou que la montre est vendue` ; `« Modifier la montre » mène à /watches/:id/edit` ; `le bandeau montre « — » sans prix d'achat`.
- [ ] **Step 2: lancer** `npx vitest run src/views`. Attendu : FAIL.
- [ ] **Step 3: réécrire le gabarit et les styles** de `WatchDetailView.vue` ; conserver la logique (`run`, `applyState`, `updateExpenses`, `refreshMargin`, `updateResale`, `confirmRemove`) en y ajoutant la relecture de `costPrice` avec la marge (la fonction qui relit la marge relit aussi `costPrice`). Supprimer `ProjectSelector.vue`.
- [ ] **Step 4: relancer** `npm run test:web` (en arrière-plan, lire la fin de la sortie). Attendu : tout PASS.
- [ ] **Step 5: commit** `feat : assemble la fiche montre à la maquette (mobile et desktop)`.

---

### Task 10: e2e de la fiche

**Files:**
- Create: `e2e/watch-detail.spec.ts`
- Modify: `e2e/resale.spec.ts`, `e2e/restoration.spec.ts` (seulement si une étape est cassée)

- [ ] **Step 1: adapter `e2e/resale.spec.ts`** : « Terminer le projet » devient « Marquer le projet terminé » ; le titre `heading 'Terminé'` n'existe plus : attendre le badge « Terminé » (`getByText('Terminé', { exact: true })`) ; `restoration.spec.ts` : déplier la ligne avant l'envoi de photo si `photo-input` n'est plus visible.
- [ ] **Step 2: écrire `watch-detail.spec.ts`** (API 3200, web 5273, helpers existants) : création d'une montre à 120 € d'achat par l'API, puis sur le **desktop** (1280) : fil d'Ariane, bandeau Achat « 120 € » et Coût de revient « 120 € » ; ajouter un coût de 45 € → Coût de revient « 165 € » ; ajouter une mesure (marche +14, beat 0.4, amplitude 268) → verdicts « Avance de 14 s/j · hors zone (±10 s/j) », « Dans la zone (≤ 0.5 ms) », « Dans la zone (250–310°) » ; « Modifier la montre » via le menu : changer le modèle, enregistrer, retrouver la fiche mise à jour ; **mobile** (390) : ordre Finances avant Étapes, menu « ⋯ » → « Supprimer la montre » → confirmer → tableau de bord.
- [ ] **Step 3: lancer** `npm run test:e2e` (arrière-plan, rien d'autre sur la base de test). Attendu : tous PASS (l'instabilité préexistante de `auth.spec.ts` « mot de passe oublié » se relance seule).
- [ ] **Step 4: commit** `test : ajoute le parcours e2e de la fiche montre`.

---

### Task 11: documents, vérification visuelle et contrôle final

**Files:**
- Modify: `docs/SPECS.md`, `docs/CONCEPTION-TECHNIQUE.md`, `docs/REGLES-GESTION.md`

- [ ] **Step 1: documents.** SPECS.md : S20 devient « échelles et verdict de la dernière mesure, tableau chronologique » ; S10 : l'écran existe (route `/watches/:id/edit`). CONCEPTION-TECHNIQUE.md : D7 sans Chart.js (échelles maison, zones indicatives), contrat `costPrice` de `GET /watches/:id`, route d'édition, onglets et menu de la fiche. REGLES-GESTION.md : ajouter **RG-FIN-13** (coût de revient = achat + coûts de tous les projets ; nul sans prix d'achat ; service ; S23, S26), **RG-PER-06** (verdict d'une mesure : zones cibles indicatives marche ±10 s/j, beat error ≤ 0,5 ms, amplitude 250–310°, bornes incluses ; Interface ; S20), **RG-AFF-13** (mesures affichées sans décimales superflues, delta de marche entre mesures consécutives) ; compléter la matrice scénario → règles (S10, S20, S23) et les tableaux de couverture des tests déjà tenus par ce document.
- [ ] **Step 2: contrôle des suites** (une à la fois, arrière-plan) : `npm run test:web`, `npm run test:api` puis `npm run test:e2e`, plus lint (`npm run lint` : 0 erreur ; les avertissements préexistants de `watches.service.ts` et l'erreur `vue-tsc` de `PageHeader.spec.ts` ne sont pas à corriger). Attendu : tout vert.
- [ ] **Step 3: captures** (spec Playwright jetable non commitée, dans le scratchpad, channel chrome, ports e2e) à 390, 768 et 1280 px : fiche d'une montre en cours avec 2 projets, terminée, vendue, sans projet, menu ouvert ; comparer aux maquettes `design/` ; à 768 px (sans maquette) vérifier l'absence de débordement horizontal. Corriger les écarts par des commits `fix : …`.
- [ ] **Step 4: commit** `docs : met à jour specs, conception et règles pour la fiche montre`, puis relecture finale par un sous-agent Opus (`superpowers:executing-plans`, section Final Review) avec le Review Focus ci-dessus.
