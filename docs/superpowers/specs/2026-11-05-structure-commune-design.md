# Fidélité aux maquettes — sous-projet A : structure commune

Date : 2026-11-05. Statut : à relire.

## Contexte

Les 33 tâches du plan v1 livrent les fonctions, mais l'interface ne reproduit pas les maquettes de `design/` : l'appli est une colonne de 720 px sans point de rupture, sans barre latérale, sans barre du bas, sans barre du haut ni avatar. Le chantier « fidélité aux maquettes » est découpé en cinq sous-projets, chacun avec sa spec, son plan et une vérification par captures Chrome :

- **A. Structure commune** (ce document) ;
- B. tableau de bord (mobile et desktop, extension de `GET /watches`) ;
- C. fiche montre et projet ;
- D. formulaires et confirmations (feuilles, dialogues) ;
- E. compte et connexion.

Périmètre décidé avec l'auteur : tout ce que montrent les maquettes est implémenté, y compris ce que la spec ne prévoyait pas (recherche, tri, progression, pagination, marge cumulée) ; les specs seront mises à jour en conséquence, sous-projet par sous-projet. Un audit des écarts, écran par écran, a servi de base (voir le ledger, `.superpowers/sdd/…/progress.md`).

## Décisions

1. **Points de rupture, trois modes** (les maquettes n'en définissent aucun entre mobile et desktop ; seule la règle « rail de 64 px sous 900 px » y est écrite).
   - ≥ 900 px : barre latérale complète, 236 px.
   - de 640 à 899 px : rail d'icônes, 64 px (libellés, nom et email masqués).
   - < 640 px : barre du bas, mise en page mobile.
   - Largeur de contenu : 1280 px au plus ; écrans de réglages : 720 px.
2. **« Recherche »** : l'entrée ramène au tableau de bord et active la recherche. Desktop : curseur dans le champ de la barre du haut. Mobile : un champ de recherche s'affiche au-dessus des pastilles (non dessiné dans les maquettes ; réalisé avec les jetons du design system). Le champ et son focus sont livrés par le sous-projet B ; A pose seulement le lien `/?recherche=1`.

## Composants

- `AppShell` : entoure toutes les routes qui exigent une session ; ne contient que la navigation. Les routes publiques (connexion, inscription, vérification, mot de passe oublié et réinitialisation) restent sans navigation.
- `SideNav` : barre latérale. Marque (pastille cadran + « Watch Restoration Tracker » sur deux lignes), entrées, pied avec avatar et email (identité, ni lien ni bouton). Deux largeurs par CSS seul.
- `BottomNav` : barre du bas, trois entrées avec libellé.
- `PageHeader` : barre du haut d'un écran. Variante mobile (retour, titre, actions) et variante desktop (collante, fond `--page-bg`), avec emplacements pour les actions propres à chaque écran. Fourni par A, utilisé par B, C et E ; chaque écran garde ses actions.
- `Avatar` : cercle avec l'initiale de l'email (variante mobile, bouton compte de 40 px) ou icône personne (variante desktop, 30 px).

## Entrées de navigation

| Mode | Entrées | Remarques |
|---|---|---|
| Desktop et rail | Tableau de bord, Recherche, Mon compte ; pied : avatar et email | « Tableau de bord » reste actif sur les fiches et l'écran Nouveau projet. Pas d'entrée « Nouveau projet » : l'action est le bouton de la barre du haut du tableau de bord (B). |
| Mobile | Accueil, Recherche, Nouveau projet | « Nouveau projet » est une action (pastille « + » de 28 px), jamais active, vers `/watches/new`. « Accueil » reste actif sur les fiches. « Mon compte » n'y figure pas : accès par le bouton avatar du tableau de bord (B). |

États : `aria-current="page"` sur l'entrée active ; barre du bas : filet d'accent de 2 px en haut sur 40 % de la largeur ; rail : fond `--surface` et liseré d'accent à gauche (`inset 2px 0 0 var(--accent)`). Repères : `<nav aria-label="Navigation principale">`.

## API

Nouvelle route authentifiée `GET /account` : `{ email, createdAt, emailVerifiedAt, passwordChangedAt }`. Elle alimente l'avatar et l'email du rail ; le sous-projet E s'en servira pour l'écran Compte. Un store web `account` la charge après la connexion ou la restauration de session et se vide à la déconnexion. À ajouter à `docs/CONCEPTION-TECHNIQUE.md` (contrat d'API, section Compte).

## Styles de base

- Jetons ajoutés : `--page-bg` (#05070a), `--sidebar-w` (236px), `--content-max` (1280px), `--settings-max` (720px), `--topbar-h` (69px).
- `base.css` : corps à 15 px (interligne 1,5), `:focus-visible` global (contour 2 px `--accent-text`, décalage 2 px), `color-scheme: dark`, `prefers-reduced-motion`, `text-wrap: balance` sur les titres, utilité de chiffres tabulaires.
- Favicon : logo cadran de la maquette à la place du logo Vite.

## Conséquences et risques

- La carte `.app` de 720 px laisse place à la zone de contenu de l'`AppShell`. Les écrans existants restent fonctionnels mais ne sont pas encore mis en page desktop (B, C, E).
- Le lien texte « Mon compte · Se déconnecter » en bas du tableau de bord disparaît. La déconnexion reste dans l'écran Compte, comme dans la maquette.
- Les parcours Playwright peuvent rencontrer deux liens de même nom sur la page (« Mon compte », « Nouveau projet ») : leurs sélecteurs sont ajustés.
- Libellé : l'action s'appelle « Nouveau projet » (maquette) et non « Nouvelle montre » (appli actuelle).
- L'entrée « Recherche » existe avant son champ (B) : jusqu'à B, elle ramène simplement au tableau de bord.

## Tests et vérification

1. Test d'intégration `GET /account` (RED d'abord) : renvoie les quatre champs de l'utilisateur de la session ; 401 sans jeton ; un utilisateur ne voit jamais les données d'un autre.
2. Tests de composants (jsdom) : entrées présentes selon le mode, état actif sur `/` et `/watches/:id`, liens (Recherche, Nouveau projet, Mon compte), absence de navigation sur les routes publiques.
3. Tests du store `account` (chargement, vidage à la déconnexion).
4. Suites complètes API et web, `vue-tsc`, e2e adaptés.
5. Vérification visuelle : captures Chrome à 390, 768 et 1280 px, comparées aux maquettes `design/2026-09-23-screen-dashboard-technique-luminova-green.html` (mobile) et `…dashboard-desktop-technique…` (desktop) ; écarts restants consignés au ledger. Le cadre factice de 390 px des maquettes mobiles n'est pas reproduit.

## Hors périmètre

Contenu du tableau de bord (B), contenu des barres du haut propres à chaque écran (B, C, E), fiches (C), formulaires (D), compte et connexion (E). Aucune maquette n'existe pour l'écran « Recherche » dédié : non réalisé.
