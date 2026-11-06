# Fidélité aux maquettes, sous-projet D : formulaires et confirmations — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** faire passer les confirmations, le formulaire de mesure, de coût et de revente dans une feuille du bas (mobile) / un dialogue centré (desktop), et aligner l'écran « Nouvelle montre » et « Modifier la montre » sur la maquette (mouvement segmenté, complications en pastilles, prix et date côte à côte, récapitulatif, étapes numérotées).

**Architecture :** un composant `Sheet.vue` (enveloppe du `<dialog>` natif, en-tête avec poignée et fermeture, deux variantes) ; `ConfirmDialog` est recomposé dessus sans changer d'API ; les trois formulaires restent des `<form>` (mêmes `data-test`) et s'ouvrent dans `Sheet` depuis leur bloc parent ; les champs d'identité d'une montre sont extraits dans `WatchIdentityFields.vue`, partagé par `NewWatchView` et `EditWatchView`. Aucun changement d'API ni de store.

**Tech Stack :** Vue 3.5 + Pinia + vue-router (Vitest + @vue/test-utils, jsdom), Playwright.

**Spec :** `docs/superpowers/specs/2026-11-06-formulaires-confirmations-design.md` (audit : `.superpowers/sdd/2026-11-05-fidelite-structure-commune/audit-ecarts-maquettes.md`, sections 3 et 4). Maquettes : `design/2026-10-07-screen-add-measurement-technique-luminova-green.html` (mobile, feuille), `design/2026-10-07-screen-add-measurement-desktop-technique-luminova-green.html` (dialogue 560 px), `design/2026-09-25-screen-new-project-technique-luminova-green.html` (segmenté `.segmented`, pastilles `.chip-toggle`, `.step-row`, `.icon-btn`, `.add-step-row`).

## Global Constraints

- Feuille du bas sous **640 px** : `margin: auto 0 0`, largeur 100 %, `max-height: 96%` (formulaire) ou compacte (confirmation), coins supérieurs 20 px, poignée 36×4 px, bouton fermer 32 px rond. À partir de 640 px : dialogue centré, `max-width: 560px` (formulaire) ou `24rem` (confirmation). Fond `rgb(5 7 10 / 0.72)`.
- `Sheet` : `showModal()` au montage (repli attribut `open` si `showModal` absent, comme `ConfirmDialog` actuel) ; Échap (événement natif `cancel`, `preventDefault`) et clic sur le fond (`event.target === dialog`) et bouton fermer émettent `close` ; le focus revient à l'élément actif au montage quand `Sheet` est démonté ; défilement du fond bloqué en CSS (`body:has(dialog[open]) { overflow: hidden }`, `base.css`).
- `ConfirmDialog` garde son API (`title`, `message`, `confirmLabel`, `confirm`, `cancel`, slot) et ses `data-test` (`confirm-ok`, `confirm-cancel`) ; son élément racine reste un `DIALOG`.
- Les formulaires gardent leur `<form>` racine, leurs `data-test` (`expense-form`, `resale-form`, `m-date`, `m-rate`, `m-beat`, `m-amp`, `m-position-*`, `e-*`, `resale-*`) et leurs règles de validation. Le titre passe de leur `<h3>` à l'en-tête de `Sheet` (`Ajouter une mesure`, `Modifier la mesure`, `Ajouter un coût`, `Modifier le coût`, `Renseigner la revente`, `Corriger la revente`).
- Mesure : `step="1"` marche, `step="0.1" min="0"` beat error, `step="1" min="0"` amplitude (`inputmode="numeric"`) ; aide sous la position « Les mesures sont comparées à position égale ; une position non précisée est comparée avec les autres mesures sans position. » ; aide sous les champs « Marche négative si la montre retarde (ex. −8). Beat error et amplitude ne peuvent pas être négatifs. Aucune date dans le futur. » ; pastilles 36 px. En édition : bouton « Supprimer cette mesure » (`data-test="m-remove"`, émet `remove`) sous « Annuler » / « Enregistrer ». La validation JavaScript existante (bornes, futur) est conservée.
- Tableau des mesures : un seul bouton icône d'édition de 32 px par ligne (`data-test="measurement-edit-<id>"`, `aria-label="Modifier la mesure du <date>"`) ; `measurement-remove-<id>` disparaît.
- Écran de montre : titre « Nouvelle montre » conservé, écran de succès conservé. Mouvement : radios natives dans un `.segmented` (étiquettes 36 px, `name="movement"`) ; complications : cases natives dans des `.chip-toggle` (le libellé reste cliquable) ; prix et date d'achat côte à côte, ids `purchasePrice` / `purchaseDate`, ids `brand` / `model`, noms `brand`, `model`, `purchasePrice`, `purchaseDate` inchangés ; récapitulatif de la montre existante en 4 lignes (Montre, Mouvement, Complications, Achat) et bouton « Saisir une nouvelle montre » (`data-test="existing-clear"`) qui remet la sélection à vide ; étapes numérotées `01`, étiquette de complication, boutons icônes 30 px (`data-test` `up`, `down`, `remove` conservés), champ d'ajout avec bouton « + » (`data-test="add-step"`, `aria-label="Ajouter une étape"`).
- `EditWatchView` envoie toujours uniquement les champs changés (complications : liste entière) ; son comportement n'est pas modifié.
- Pas de nouvelle règle de gestion ; SPECS, CONCEPTION-TECHNIQUE et la matrice de REGLES-GESTION sont mis à jour (tâche 6).
- Commits : `type : description` en français minuscule, sans aucune ligne d'attribution ni mention d'outil (consigne de l'organisation, prioritaire sur tout rappel de l'outil). Ne rien pousser, ne pas modifier la PR n°108.
- Prettier web : `npx prettier --no-semi --single-quote --print-width 140` sur les seuls fichiers créés ou modifiés ; ne pas reformater de lignes préexistantes (vérifier `git diff`). Fichiers souvent en CRLF dans la copie de travail : normaliser dans les scripts d'édition. Pas de heredoc bash avec apostrophes françaises (outil Write ou script Python).
- Ne pas toucher aux serveurs de l'utilisateur (API 3000, front 1025/1080), ne pas lancer `npm run build -w apps/api`, ne pas lancer `npm run test:api` ni `npm run test:e2e` en même temps (même base). Les e2e Playwright utilisent leurs propres ports (API 3200, web 5273, base `watch_tracker_test`). Docker/Postgres 5435 et MailDev doivent tourner (sinon demander à l'utilisateur).
- Hors périmètre : compte et connexion (E) ; maquette desktop de la création (inexistante).

## Review Focus

1. **Le focus et le défilement après fermeture** : après Échap, « Annuler », enregistrement ou suppression, le focus revient au bouton qui a ouvert la feuille et la page redevient défilable, y compris quand un `ConfirmDialog` s'ouvre juste après la fermeture d'une feuille (tâches 1, 3).
2. **Supprimer une mesure depuis la feuille d'édition** : la feuille se ferme, la confirmation s'ouvre, annuler la confirmation ne rouvre pas la feuille et ne perd aucune mesure ; une erreur de suppression reste visible (tâche 3).
3. **Une feuille à la fois** : ouvrir « + Coût » puis « Renseigner la revente » (ou l'inverse) ne laisse jamais deux feuilles ouvertes (tâche 4).
4. **Saisie perdue** : Échap, fond ou « Annuler » ferment sans rien enregistrer ; une erreur de validation ou d'API laisse la feuille ouverte avec la saisie intacte (tâches 3, 4).
5. **Écran de montre** : revenir sur « Saisir une nouvelle montre » après avoir choisi une montre existante vide le récapitulatif sans perdre la marque et le modèle saisis ; `EditWatchView` n'envoie toujours que les champs modifiés (tâche 5).

---

### Task 1: Composant `Sheet`

**Files:**
- Create: `apps/web/src/components/Sheet.vue`, `apps/web/src/components/Sheet.spec.ts`
- Modify: `apps/web/src/styles/base.css` (règles globales de la feuille)

**Interfaces:**
- Produces: `Sheet` — props `{ title: string; variant?: 'form' | 'confirm' }` (défaut `form`), événement `close: []`, slot par défaut (le corps ; un `<form>` ou du contenu). L'élément racine est un `<dialog class="sheet" :class="variant">` avec `aria-labelledby` vers son `<h2>`. Un identifiant de titre unique par instance (compteur de module).
- Produces (CSS global, `base.css`) : `.sheet-form` (colonne flex, `min-height: 0`, `flex: 1`), `.sheet-body` (flex 1, défilement vertical, `padding: 0 var(--space-4) var(--space-4)`, colonne `gap: var(--space-4)`), `.sheet-footer` (`flex: none`, `padding: var(--space-4)`, `border-top: 1px solid var(--border)`, colonne `gap: var(--space-2)`), `.sheet-actions` (ligne `gap: var(--space-2)`, le bouton principal `flex: 2`, le secondaire `flex: 1`), `.sheet-danger` (bouton lien rouge pleine largeur), `.chip-toggle`, `.segmented`.
- Consumes: rien.

- [ ] **Step 1: Write the failing tests** — `Sheet.spec.ts`, `mount(Sheet, { props: { title: 'Ajouter une mesure' }, slots: { default: '<p data-test="body">Corps</p>' }, attachTo: document.body })` :
  - `rend un dialog natif titré et le corps du slot` : `wrapper.element.tagName === 'DIALOG'`, `h2` = « Ajouter une mesure », `aria-labelledby` de la racine = `id` du `h2`, `[data-test="body"]` présent.
  - `s'ouvre en modal au montage` : `showModal` est espionné (`HTMLDialogElement.prototype.showModal = vi.fn()` défini avant le montage, nettoyé après) et appelé une fois ; sans `showModal`, l'attribut `open` est posé.
  - `Échap (cancel) émet close et empêche la fermeture native` : `const event = new Event('cancel', { cancelable: true })`, `wrapper.element.dispatchEvent(event)` → `close` émis une fois, `event.defaultPrevented === true`.
  - `le clic sur le fond émet close, le clic dans le corps non` : `trigger('click')` sur la racine (target = le dialog) → 1 `close` ; clic sur `[data-test="body"]` → toujours 1.
  - `le bouton fermer (aria-label « Fermer ») émet close` (`data-test="sheet-close"`).
  - `la variante confirm pose la classe confirm, form par défaut`.
  - `le focus revient à l'élément actif au montage quand la feuille est démontée` : un `<button>` du document est focalisé avant `mount` ; après `wrapper.unmount()`, `document.activeElement` est ce bouton.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/Sheet.spec.ts`. Expected: FAIL (`Sheet.vue` introuvable).
- [ ] **Step 3: Implement `Sheet.vue`** (script setup, `defineProps`, `defineEmits`) : en-tête (poignée `aria-hidden`, `h2`, bouton fermer avec croix SVG de la maquette), slot par défaut en dessous. `onMounted` : mémoriser `document.activeElement` à la **création** (setup) ; `showModal()` ou repli `open`. `onBeforeUnmount` : `el.close?.()` si `open` natif, puis `previous?.isConnected && previous.focus()`. CSS scoped pour le cadre, la poignée, l'en-tête, le fond (`::backdrop`) et la bascule 640 px ; les classes réutilisables par les formulaires (`.sheet-form`, `.sheet-body`, `.sheet-footer`, `.sheet-actions`, `.sheet-danger`, `.chip-toggle`, `.segmented`) et la règle `body:has(dialog[open])` vont dans `base.css` (non scoped, valeurs des maquettes : `.chip-toggle` 36 px / 13 px / 600, pressé = `--accent` + `--accent-ink` ; `.segmented` = conteneur surface, bordure `--border-strong`, `padding: 3px`, `gap: 3px`, entrées radio masquées visuellement, étiquette 36 px, cochée = `--accent`, `:focus-visible` = contour `--accent-text` 2 px).
- [ ] **Step 4: Run** le spec de l'étape 2 puis `cd apps/web && npx vitest run`. Expected: PASS, suite web verte.
- [ ] **Step 5: Commit** `git add apps/web/src/components/Sheet.vue apps/web/src/components/Sheet.spec.ts apps/web/src/styles/base.css && git commit -m "feat : ajoute le composant feuille du bas et dialogue"`.

---

### Task 2: `ConfirmDialog` recomposé sur `Sheet`

**Files:**
- Modify: `apps/web/src/components/ConfirmDialog.vue`, `apps/web/src/components/ConfirmDialog.spec.ts`

**Interfaces:**
- Consumes: `Sheet` (tâche 1), variante `confirm`.
- Produces: `ConfirmDialog` inchangé pour ses appelants (8 usages : `BeforeAfter`, `AccountView`, `WatchDetailView` ×2, `FinanceBlock` ×2, `PerformanceBlock`, `StepList` ×2).

- [ ] **Step 1: Write the failing tests** — ajouter à `ConfirmDialog.spec.ts` : `la confirmation est une feuille compacte (classe sheet confirm)` : `wrapper.classes()` contient `sheet` et `confirm` ; `un clic sur le fond émet cancel` : `trigger('click')` sur la racine → `cancel` émis ; `le bouton fermer de la feuille émet cancel` (`sheet-close`). Les trois tests existants restent inchangés (ils doivent continuer de passer).
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/ConfirmDialog.spec.ts`. Expected: FAIL sur les trois nouveaux tests.
- [ ] **Step 3: Implement** : la racine devient `<Sheet :title="title" variant="confirm" @close="emit('cancel')">` ; le corps contient le message `<p>`, le slot, et la ligne d'actions (`.sheet-actions`) avec les mêmes boutons `confirm-cancel` / `confirm-ok` ; retirer le `showModal` et les styles du cadre devenus inutiles (le `<dialog>` est dans `Sheet`). Conserver le style du bouton `danger`.
- [ ] **Step 4: Run** `cd apps/web && npx vitest run`. Expected: PASS (les specs de vues qui cliquent `confirm-ok` passent sans changement).
- [ ] **Step 5: Commit** `git add apps/web/src/components/ConfirmDialog.vue apps/web/src/components/ConfirmDialog.spec.ts && git commit -m "feat : les confirmations s'ouvrent en feuille du bas sur mobile"`.

---

### Task 3: Mesure dans la feuille, bouton d'édition unique

**Files:**
- Modify: `apps/web/src/components/MeasurementForm.vue`, `apps/web/src/components/MeasurementForm.spec.ts`, `apps/web/src/components/PerformanceBlock.vue`, `apps/web/src/components/PerformanceBlock.spec.ts`, `apps/web/src/views/WatchLifecycle.spec.ts`, `apps/web/src/views/WatchDetailView.spec.ts` (seulement les attentes qui cliquent `measurement-remove-*` ou lisent le titre `h3` de la mesure)

**Interfaces:**
- Consumes: `Sheet` (tâche 1), `ConfirmDialog` (tâche 2), classes de `base.css`.
- Produces: `MeasurementForm` — mêmes props ; événements `saved`, `cancel`, et nouveau `remove: []` (émis seulement si `measurement` est fourni). Plus de `<h3>` : le titre est dans `Sheet`.

- [ ] **Step 1: Write the failing tests** :
  - `MeasurementForm.spec.ts` : `les champs portent les attributs de la maquette` (`m-rate` `step="1"` ; `m-beat` `step="0.1"` `min="0"` ; `m-amp` `step="1"` `min="0"` `inputmode="numeric"`) ; `l'aide de position et l'aide des valeurs sont celles de la maquette` (texte « une position non précisée est comparée » et « Marche négative si la montre retarde (ex. −8) ») ; `en saisie le bouton Supprimer cette mesure n'existe pas` ; `en édition « Supprimer cette mesure » émet remove` (`m-remove`).
  - `PerformanceBlock.spec.ts` : `+ Mesure ouvre la feuille « Ajouter une mesure » (dialog)` ; `la feuille d'édition s'ouvre avec la mesure choisie (titre « Modifier la mesure »)` ; `chaque ligne n'a qu'un bouton Modifier (icône, aria-label avec la date) et plus de bouton Supprimer` ; `enregistrer ferme la feuille` ; `Annuler et Échap ferment la feuille sans appel réseau` ; `Supprimer cette mesure ferme la feuille puis ouvre la confirmation ; confirmer retire la mesure` ; `annuler la confirmation garde la mesure et ne rouvre pas la feuille`.
  - Adapter les assertions existantes de `WatchLifecycle.spec.ts` / `WatchDetailView.spec.ts` / `PerformanceBlock.spec.ts` qui utilisaient `measurement-remove-<id>` : le parcours passe par `measurement-edit-<id>` puis `m-remove`.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/MeasurementForm.spec.ts src/components/PerformanceBlock.spec.ts src/views`. Expected: FAIL sur les tests nouveaux ou adaptés.
- [ ] **Step 3: Implement** : `MeasurementForm.vue` — racine `<form class="sheet-form" novalidate>` avec `.sheet-body` (date, position en `.chip-toggle`, champs en `.sheet-row`, aides) et `.sheet-footer` (`Annuler` / `Enregistrer la mesure` ou `Enregistrer` dans `.sheet-actions`, puis `.sheet-danger` « Supprimer cette mesure » en édition) ; retirer `<h3>`, le cadre et les styles redondants. `PerformanceBlock.vue` — `<Sheet v-if="adding || editing" :title="editing ? 'Modifier la mesure' : 'Ajouter une mesure'" @close="closeForm">` contenant `MeasurementForm` (`@saved`, `@cancel="closeForm"`, `@remove="askRemove"`) où `askRemove` pose `removing = editing.value` puis ferme la feuille ; bouton « + Mesure » toujours affiché ; colonne d'actions du tableau réduite à un bouton icône d'édition 32 px (crayon SVG, `aria-label`), suppression du bouton `measurement-remove-*` ; supprimer la condition `!adding && !editing` du bouton d'ajout.
- [ ] **Step 4: Run** `cd apps/web && npx vitest run && npx vue-tsc --noEmit`. Expected: PASS ; seule l'erreur préexistante de `PageHeader.spec.ts` ligne 8 subsiste.
- [ ] **Step 5: Commit** `git add -A apps/web/src && git commit -m "feat : le formulaire de mesure s'ouvre en feuille, suppression depuis l'édition"`.

---

### Task 4: Coût et revente dans la feuille

**Files:**
- Modify: `apps/web/src/components/ExpenseForm.vue`, `apps/web/src/components/ResaleForm.vue`, `apps/web/src/components/FinanceBlock.vue`, `apps/web/src/components/FinanceBlock.spec.ts`, `apps/web/src/views/WatchDetailView.spec.ts` (attentes qui lisent les titres de formulaire)

**Interfaces:**
- Consumes: `Sheet` (tâche 1) et les classes de `base.css`.
- Produces: `ExpenseForm` et `ResaleForm` — mêmes props et événements ; plus de `<h3>`.

- [ ] **Step 1: Write the failing tests** — `FinanceBlock.spec.ts` : `+ Coût ouvre la feuille « Ajouter un coût »` (dialog, `expense-form` à l'intérieur) ; `« Modifier » d'un coût ouvre « Modifier le coût »` ; `« Renseigner la revente » ouvre la feuille « Renseigner la revente »` ; `« Corriger » ouvre « Corriger la revente »` ; `ouvrir la revente pendant qu'un coût est ouvert remplace la feuille (un seul dialog)` : après les deux clics, exactement un `dialog.sheet` ; `Annuler et Échap ferment` ; `une erreur de validation laisse la feuille ouverte avec la saisie` ; `le bouton + Coût reste affiché pendant que la feuille est ouverte`.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/FinanceBlock.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** : `ExpenseForm` et `ResaleForm` — racine `<form class="sheet-form" … novalidate>`, `.sheet-body` (champs ; montant et date en `.sheet-row`), `.sheet-footer` (`.sheet-actions` Annuler / Enregistrer) ; retirer `<h3>` et le cadre. `FinanceBlock` — `<Sheet v-if="expenseForm" :title=… @close="expenseForm = null">` et `<Sheet v-if="resaleOpen" :title=… @close="resaleOpen = false">` autour des formulaires ; retirer la condition `!expenseForm` du bouton « + Coût » et le `v-else-if` de la zone de revente (le bloc de revente reste affiché sous la feuille).
- [ ] **Step 4: Run** `cd apps/web && npx vitest run && npx vue-tsc --noEmit`. Expected: PASS (erreur `PageHeader.spec.ts` seule).
- [ ] **Step 5: Commit** `git add -A apps/web/src && git commit -m "feat : les formulaires de coût et de revente s'ouvrent en feuille"`.

---

### Task 5: Champs d'identité partagés et écran de montre à la maquette

**Files:**
- Create: `apps/web/src/components/WatchIdentityFields.vue`, `apps/web/src/components/WatchIdentityFields.spec.ts`
- Modify: `apps/web/src/views/NewWatchView.vue`, `apps/web/src/views/EditWatchView.vue`, `apps/web/src/views/EditWatchView.spec.ts`, `apps/web/src/views/WatchLifecycle.spec.ts` (les tests de création), `apps/web/src/views/StepPreviewView.spec.ts` si des sélecteurs changent

**Interfaces:**
- Produces: `WatchIdentityFields` — props `{ brand: string; model: string; movementCode: string; complicationCodes: string[]; purchasePrice: string; purchaseDate: string; movementTypes: { movementCode: string; label: string }[]; complications: { complicationCode: string; label: string }[]; maxDate: string; complicationHint?: string }` ; événements `update:brand`, `update:model`, `update:purchasePrice`, `update:purchaseDate` (v-model), `select-movement: [code: string]`, `toggle-complication: [code: string]`. Rend sans `<form>` : marque, modèle (+ aide du calibre), mouvement en `.segmented`, complications en `.chip-toggle` (case native masquée visuellement dans l'étiquette ; `aria-pressed` n'est pas utilisé, c'est l'état `:checked`), prix et date côte à côte avec l'aide sur la date d'achat. Ids et noms inchangés (voir Global Constraints).
- Consumes: store `stepPreview` (`movementTypes`, `complications`, `movementCode`, `complicationCodes`, `selectMovement`, `toggleComplication`) côté création ; données locales côté édition.

- [ ] **Step 1: Write the failing tests** :
  - `WatchIdentityFields.spec.ts` : `rend marque, modèle, prix et date avec leurs ids` ; `le mouvement est un groupe de radios dans un contrôle segmenté et cocher émet select-movement` ; `les complications sont des pastilles à cases natives, cocher émet toggle-complication` ; `la saisie émet update:brand etc.` ; `complicationHint s'affiche quand il est fourni` ; `le prix et la date sont dans la même rangée` (même parent `.pair`).
  - `NewWatchView` (dans `WatchLifecycle.spec.ts`, section création) : `choisir une montre existante affiche le récapitulatif de 4 lignes (Montre, Mouvement, Complications, Achat)` ; `« Saisir une nouvelle montre » vide la sélection, cache le récapitulatif et garde la marque et le modèle déjà saisis` ; `les étapes sont numérotées 01, 02 … avec l'étiquette de complication` ; `le bouton « + » ajoute l'étape saisie (Entrée aussi)` ; les tests existants de création (identité → étapes → création, montre existante) continuent de passer sans changement de comportement.
  - `EditWatchView.spec.ts` : les tests existants (préremplissage, seuls les champs changés partent, liste de complications entière) passent inchangés ; ajouter `l'aide « Les étapes des projets existants ne changent pas » s'affiche`.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/components/WatchIdentityFields.spec.ts src/views`. Expected: FAIL sur les tests nouveaux.
- [ ] **Step 3: Implement** : créer `WatchIdentityFields.vue` d'après les blocs identiques de `NewWatchView` (lignes d'identité) et `EditWatchView` ; `NewWatchView` l'utilise (`select-movement` → `preview.selectMovement`, `toggle-complication` → `preview.toggleComplication`) ; `EditWatchView` l'utilise (`select-movement` → `movementCode.value = code`, `toggle-complication` → ajouter ou retirer le code de `complicationCodes`, `complication-hint` = texte actuel) et supprime ses balises dupliquées ; récapitulatif d'une montre existante : ajouter la ligne « Achat » (prix et date si présents, sinon « — ») et le bouton « Saisir une nouvelle montre » (`existing-clear` : `existingId = ''`, `existing = null`) ; la liste d'étapes devient `.step-row` (index `01`, libellé, étiquette `.step-tag`, `.icon-btn` 30 px avec les `data-test` et `aria-label` actuels et des icônes SVG flèches/croix) ; champ d'ajout avec bouton « + » (`add-step-row`). Champs 44 px et étiquettes 13 px `--text-secondary` pour ces deux écrans (règles scoped dans le composant partagé).
- [ ] **Step 4: Run** `cd apps/web && npx vitest run && npx vue-tsc --noEmit`. Expected: PASS (erreur `PageHeader.spec.ts` seule).
- [ ] **Step 5: Commit** `git add -A apps/web/src && git commit -m "feat : aligne l'écran de montre sur la maquette et partage ses champs"`.

---

### Task 6: e2e et documents

**Files:**
- Modify: `e2e/watch-detail.spec.ts`, `e2e/restoration.spec.ts`, `e2e/resale.spec.ts` (selon les sélecteurs touchés), `docs/SPECS.md`, `docs/CONCEPTION-TECHNIQUE.md`, `docs/REGLES-GESTION.md`

**Interfaces:**
- Consumes: tout ce qui précède.

- [ ] **Step 1: Write the failing e2e** (desktop et mobile 390 pour la mesure) : `watch-detail.spec.ts` — ajouter une mesure dans la feuille (« + Mesure », saisir, enregistrer, la feuille se ferme, la ligne apparaît, le verdict se lit), la modifier par l'icône, la supprimer depuis la feuille et confirmer ; ajouter un coût ; modifier la montre. `resale.spec.ts` — la revente se renseigne dans la feuille. `restoration.spec.ts` — création d'une montre avec les nouveaux sélecteurs (segmenté, pastilles). Adapter tout sélecteur de `measurement-remove-*` ou de formulaire en ligne.
- [ ] **Step 2: Run** `npx playwright test e2e/watch-detail.spec.ts e2e/resale.spec.ts e2e/restoration.spec.ts` (jamais en même temps que `test:api`). Expected: FAIL avant adaptation des sélecteurs, PASS ensuite.
- [ ] **Step 3: Docs** — `SPECS.md` : scénarios S19 (mesure en feuille), S21 (coût), S22 (revente), S33 (modification d'une mesure, suppression depuis la feuille) et confirmations S35, S37, S38 (feuille du bas sur mobile, dialogue sur desktop) ; `CONCEPTION-TECHNIQUE.md` : composant `Sheet` à la place de « élément natif `<dialog>` » pour les confirmations, ajout des formulaires, `WatchIdentityFields` ; `REGLES-GESTION.md` : aucune règle nouvelle, mettre à jour la colonne des tests de la matrice (ajouter `Sheet.spec`, `WatchIdentityFields.spec`) si les lignes concernées en listent.
- [ ] **Step 4: Run** la suite complète : `cd apps/web && npx vitest run` puis `npx playwright test` (12 tests, hors du `test:api`). Expected: PASS ; l'instabilité préexistante de `auth.spec.ts` « mot de passe oublié » se relance seule.
- [ ] **Step 5: Commit** `git add -A e2e docs && git commit -m "test : parcours e2e des feuilles et mise à jour des documents"`.
