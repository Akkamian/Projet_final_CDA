# Compte et connexion (sous-projet E) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner l'écran « Mon compte » et les cinq écrans d'authentification sur les maquettes, sans changer l'API ni les règles métier.

**Architecture:** Deux composants neufs (`PasswordField`, `AuthLayout`) portent l'habillage des écrans d'authentification ; `AccountView` est refondu en cartes, le changement de mot de passe passe dans une `Sheet` (livrée en D) et les statistiques viennent d'un appel direct à `GET /watches`.

**Tech Stack:** Vue 3.5 + Pinia + vue-router, Vitest + @vue/test-utils, Playwright. Web uniquement (Prettier `--no-semi --single-quote --print-width 140`, ne pas reformater les lignes existantes).

**Spec:** `docs/superpowers/specs/2026-11-06-compte-connexion-design.md`

## Global Constraints

- Aucun changement d'API ni de règle de gestion ; messages d'erreur et de succès existants inchangés (RG-CPT-03 : 8 caractères minimum et confirmation identique, vérifiés avant tout appel).
- Les `id`, `name` et `data-test` actuels des champs et boutons sont conservés (`resend`, `change-password`, `confirm-ok`…).
- CGV et confidentialité : texte sans lien (décision de l'auteur).
- Maquettes : `design/2026-09-17-screen-account-desktop-technique-luminova-green.html`, `design/2026-10-09-screen-auth-technique-luminova-green.html` (mobile) et `…auth-desktop-…` ; ne pas reproduire le cadre factice de 390 px.
- Points de rupture : 900 px (panneau de marque), 640 px (tuiles 2×2), 720 px (`--settings-max`).
- Commits `type : description` en français minuscule, aucune ligne d'attribution. Ne pas lancer `npm run build -w apps/api` ; ne pas lancer `test:api` et `test:e2e` ensemble.
- Fichiers souvent en CRLF : utiliser `edit_util.py` (scratchpad) ou Edit/Write.

## Review Focus

- Les sélecteurs Playwright `getByLabel('Mot de passe')` (non exact) matchent aussi le bouton œil « Afficher le mot de passe » : ils sont passés en `exact: true` (Task 3).
- Un champ mot de passe affiché en clair (`type="text"`) doit repasser en masqué au démontage ou au changement d'écran, et ne jamais perdre sa valeur à la bascule.
- La feuille du mot de passe ne doit pas pouvoir se fermer pendant l'enregistrement (`busy`) et doit vider ses champs à la réouverture.
- Les compteurs de statistiques d'un compte ne doivent jamais montrer ceux d'un autre utilisateur après déconnexion/reconnexion (l'état est local à la vue).
- `AuthLayout` ne doit pas produire de débordement horizontal à 390 px ni dupliquer la marque pour un lecteur d'écran (panneau masqué par `display: none` sous 900 px).

## File Structure

- Create `apps/web/src/components/PasswordField.vue` (+ `.spec.ts`) : étiquette, champ, bouton œil, aide, erreur.
- Create `apps/web/src/components/AuthLayout.vue` (+ `.spec.ts`) : marque mobile, panneau desktop, zone du formulaire.
- Modify `apps/web/src/styles/base.css` : retire `.auth-card`, ajoute champs 44 px, bannières, pied d'écran, tuiles, cartes (styles globaux partagés).
- Modify les 5 vues `apps/web/src/views/auth/*.vue` (+ specs), `apps/web/src/views/AccountView.vue` (+ spec), `apps/web/src/components/Avatar.vue` (variante `large`).
- Modify `e2e/helpers.ts`, `e2e/auth.spec.ts` ; nouveau parcours dans `e2e/account.spec.ts`.
- Modify `docs/SPECS.md`, `docs/CONCEPTION-TECHNIQUE.md`.

---

### Task 1: `PasswordField`

**Files:** Create `apps/web/src/components/PasswordField.vue`, `PasswordField.spec.ts` ; Modify `base.css` (styles du champ 44 px et de l'œil).

**Interfaces:**
- Produces: `<PasswordField id label v-model autocomplete maxlength? hint? error? name? />`. `v-model` via `defineModel<string>()`. Le bouton œil porte `data-test="toggle-password"`, `type="button"`, `aria-pressed`, `aria-label` « Afficher le mot de passe » (non pressé) / « Masquer le mot de passe » (pressé). Avec `error`, l'input a `aria-invalid="true"` et `aria-describedby` vers un `<span role="alert" :id="id + '-error'">` ; avec `hint`, `<span class="field-hint" :id="id + '-hint'">`. Au démontage il n'y a rien à nettoyer (l'état `shown` est local).

- [ ] **Step 1: Tests (`PasswordField.spec.ts`)** : « le champ est masqué par défaut » (`type=password`) ; « l'œil l'affiche puis le masque, `aria-pressed` et `aria-label` suivent, la valeur est conservée » ; « `error` pose `aria-invalid` et `aria-describedby` vers le message » ; « `hint` est lié par `aria-describedby` » ; « `v-model` propage la saisie » ; « `autocomplete`, `maxlength`, `name` sont transmis à l'input ».
- [ ] **Step 2:** `npx vitest run src/components/PasswordField.spec.ts` (dans `apps/web`). Expected: FAIL (composant absent).
- [ ] **Step 3: Implémenter `PasswordField.vue`** (signature ci-dessus ; l'icône œil en SVG inline 20 px, deux états ; champ `min-height: 44px`, fond `--surface`, étiquette 13 px `--text-secondary`, bouton œil positionné à droite dans le champ, zone cliquable ≥ 36 px) et les règles correspondantes dans `base.css`.
- [ ] **Step 4:** relancer le spec. Expected: PASS ; `npx vue-tsc --noEmit -p apps/web/tsconfig.app.json` (ou la commande `typecheck` du projet) sans erreur.
- [ ] **Step 5: Commit** `feat : champ mot de passe avec bouton afficher/masquer`.

### Task 2: `AuthLayout`

**Files:** Create `apps/web/src/components/AuthLayout.vue`, `AuthLayout.spec.ts` ; Modify `base.css` (remplace `.auth-card`, ajoute `.auth-lead`, `.auth-footer` avec filet, `.banner`, `.banner-warning`, `.confirm-badge` 56 px).

**Interfaces:**
- Produces: `<AuthLayout>` avec slot par défaut. Structure : racine `.auth-page` ; `<header class="auth-brand">` (logo + « Watch Restoration Tracker », visible < 900 px) ; `<aside class="auth-panel">` (logo, cadran SVG, `<p>` slogan « Le journal de vos restaurations horlogères. », `<ul>` de 3 puces ; masqué < 900 px, `data-test="auth-panel"`) ; `<main class="auth-main">` contenant le slot. Aucun `h1`/`h2` dans le layout (le titre est dans chaque vue). Les 3 puces : « Suivez chaque restauration, étape par étape », « Mesurez la précision de vos mouvements », « Gardez la trace de vos coûts et reventes ».

- [ ] **Step 1: Tests** : « affiche le contenu du slot dans `main` » ; « contient la marque en en-tête et le panneau avec le slogan exact » ; « n'introduit aucun titre (h1–h6) » ; « le panneau a trois puces ».
- [ ] **Step 2:** lancer le spec. Expected: FAIL.
- [ ] **Step 3: Implémenter** (mobile : colonne, formulaire ancré en bas avec `min-height: 100dvh` et `justify-content: space-between` ; ≥ 900 px : grille `1.15fr 1fr`, panneau fond sombre de la maquette, formulaire centré 380 px). Retirer `.auth-card` de `base.css` seulement en Task 3, quand plus aucune vue ne l'utilise.
- [ ] **Step 4:** spec PASS, vue-tsc propre.
- [ ] **Step 5: Commit** `feat : mise en page commune des écrans d'authentification`.

### Task 3: les cinq écrans d'authentification

**Files:** Modify `LoginView.vue`, `RegisterView.vue`, `ForgotPasswordView.vue`, `ResetPasswordView.vue`, `VerifyEmailView.vue` et leurs specs ; `base.css` (retrait de `.auth-card`) ; `e2e/helpers.ts`, `e2e/auth.spec.ts`.

**Interfaces:** Consumes `AuthLayout` (slot) et `PasswordField` (Tasks 1-2). Chaque vue remplace `<section class="auth-card">` par `<AuthLayout>…</AuthLayout>` ; les `<p class="brand">` sont supprimés (la marque est dans le layout). Logique script inchangée.

- [ ] **Step 1: Tests (RED)** dans les specs de vues : Connexion « le champ mot de passe a un bouton œil » et « une erreur `EMAIL_NOT_VERIFIED` affiche la bannière ambre (`.banner-warning`) avec le bouton `[data-test="resend"]` » ; Inscription « les deux champs mot de passe ont un œil » et « la mention CGV/confidentialité ne contient aucun lien (`a`) » ; Réinitialisation « les deux champs ont un œil » ; Mot de passe oublié et Vérification « le contenu est dans `main` de `AuthLayout` » ; Inscription « la confirmation d'envoi affiche la pastille `.confirm-badge` ».
- [ ] **Step 2:** `npx vitest run src/views/auth`. Expected: FAIL sur les nouveaux tests seulement.
- [ ] **Step 3: Implémenter.** Connexion : accroche `.auth-lead`, « Mot de passe oublié ? » aligné à droite au-dessus du bouton, bannière rouge (icône) pour `invalid`/`other`, ambre pour `unverified` avec sous-texte, pied `.auth-footer` « Pas encore de compte ? Créer un compte ». Inscription : `PasswordField` pour mot de passe (hint « 8 caractères minimum. ») et confirmation, mention en texte simple, pied « Vous avez déjà un compte ? Connexion ». Réinitialisation : `PasswordField` ×2. Les messages d'erreur de validation (RG-CPT-03) restent dans la bannière du formulaire, inchangés. Retirer `.auth-card` de `base.css`.
- [ ] **Step 4: e2e** : dans `e2e/helpers.ts:37` et `e2e/auth.spec.ts:20,30,53`, `getByLabel('Mot de passe')` devient `getByLabel('Mot de passe', { exact: true })`. Lancer `npx playwright test e2e/auth.spec.ts` (ports 3200/5273). Expected: PASS (le test « mot de passe oublié » est connu pour être instable : le relancer seul avant de conclure).
- [ ] **Step 5:** `npm run test:web` Expected: PASS ; vue-tsc propre.
- [ ] **Step 6: Commit** `feat : écrans d'authentification alignés sur les maquettes`.

### Task 4: écran « Mon compte »

**Files:** Modify `AccountView.vue`, `AccountView.spec.ts`, `Avatar.vue` (+ `Avatar.spec.ts`), `base.css` (cartes, tuiles).

**Interfaces:**
- Consumes: `useAccountStore().profile` (`email`, `createdAt`, `emailVerifiedAt`, `passwordChangedAt`, chargé par la coque ; la vue appelle `account.load()` si `profile` est null), `PasswordField`, `Sheet`, `ConfirmDialog`, `apiFetch`.
- Produces: `Avatar` accepte `variant: 'initial' | 'icon' | 'large'` (`large` = initiale sur 52 px). Statistiques : état local `stats = ref<{ total; inProgress; finished; sold } | null>` rempli par `apiFetch('/watches?page=1&pageSize=1')` (clés de `counts` telles que définies dans `stores/watches.ts`) ; échec → `null` et tuiles « – ». `data-test` : `account-email`, `stat-total`, `stat-in-progress`, `stat-finished`, `stat-sold`, `password-open`, `password-cancel`, `password-changed-at`.

- [ ] **Step 1: Tests (RED)** : « affiche l'email, « Membre depuis » et « Adresse vérifiée le » (absent si `emailVerifiedAt` null) » ; « les quatre tuiles affichent les compteurs de `GET /watches?page=1&pageSize=1` » ; « les tuiles affichent – si l'appel échoue et la page reste utilisable » ; « « Dernier changement » affiche « Jamais modifié » si `passwordChangedAt` est null » ; « le formulaire de mot de passe n'est pas affiché tant qu'on n'a pas cliqué « Modifier » » ; « la feuille refuse un mot de passe de moins de 8 caractères et une confirmation différente, sans appel réseau, l'erreur reste dans la feuille » ; « un succès appelle l'API, ferme la feuille et affiche « Mot de passe modifié. » (`role="status"`) » ; « pendant l'enregistrement, `dialog.sheet` ne se ferme pas sur `cancel` (`busy`) » ; « rouvrir la feuille vide les trois champs » ; les tests S35 actuels (suppression) restent verts sans modification.
- [ ] **Step 2:** `npx vitest run src/views/AccountView.spec.ts src/components/Avatar.spec.ts`. Expected: FAIL sur les nouveaux tests.
- [ ] **Step 3: Implémenter** : cartes Compte / Statistiques / Sécurité / Session / Suppression (colonne `--settings-max`, tuiles 4 colonnes puis 2×2 sous 640 px) ; dates formatées en français (mois et année pour « Membre depuis », date complète pour les autres) avec les utilitaires de format existants, sinon `Intl.DateTimeFormat('fr-FR')` ; formulaire `data-test="change-password"` déplacé dans `<Sheet v-if="changingPassword" title="Modifier le mot de passe" :busy="changing" @close="…">` avec Annuler (`password-cancel`) / « Modifier le mot de passe » ; le lien « ← Mes montres » est retiré ; session et suppression gardent leur texte et leur logique ; `confirmDelete`/`logout` inchangés.
- [ ] **Step 4:** specs PASS, `npm run test:web` PASS, vue-tsc propre.
- [ ] **Step 5: Commit** `feat : écran compte en cartes, mot de passe en feuille et statistiques`.

### Task 5: e2e, documents et captures

**Files:** Create `e2e/account.spec.ts` ; Modify `docs/SPECS.md` (section J « Compte (suite ») et scénarios d'authentification), `docs/CONCEPTION-TECHNIQUE.md`.

- [ ] **Step 1: e2e `account.spec.ts`** : « changer son mot de passe depuis la feuille puis se reconnecter avec le nouveau » (compte créé par `createVerifiedAccount`, connexion, `/account`, ouvrir la feuille, remplir, enregistrer, `status` « Mot de passe modifié. », déconnexion, reconnexion avec le nouveau) ; « les statistiques affichent le nombre de montres créées » (1 montre créée par l'API → tuile Montres = 1).
- [ ] **Step 2:** `npx playwright test` complet (14 + nouveaux). Expected: PASS.
- [ ] **Step 3: Documents** : SPECS.md (identité et statistiques du compte, changement de mot de passe en feuille, affichage du mot de passe, bannière d'adresse non vérifiée) ; CONCEPTION-TECHNIQUE.md (`AuthLayout`, `PasswordField`, statistiques via `GET /watches`, `Avatar` `large`). REGLES-GESTION.md : aucune règle nouvelle, ne pas modifier sauf matrice de tests si elle liste les écrans.
- [ ] **Step 4: Captures Chrome** à 390, 768 et 1280 px (connexion, inscription, compte, feuille du mot de passe) comparées aux maquettes ; vérifier l'absence de débordement horizontal (`document.documentElement.scrollWidth <= innerWidth`) ; consigner les écarts au registre ; sans fichiers jetables laissés dans le dépôt.
- [ ] **Step 5: Suites complètes** : `npm run test:web`, vue-tsc, e2e. Expected: tout vert.
- [ ] **Step 6: Commit** `test : parcours e2e du compte et mise à jour des documents`.
