# Fidélité aux maquettes, sous-projet D : formulaires et confirmations

Date : 2026-11-06. Branche : `feat/fidelite-maquettes`. Suite des sous-projets A (structure commune), B (tableau de bord) et C (fiche montre).

## Objet

Aligner les formulaires et les confirmations sur les maquettes `design/2026-10-07-screen-add-measurement-*` et `design/2026-09-25-screen-new-project-*`. Périmètre convenu avec l'utilisateur : tout ce que montrent les maquettes est implémenté. Audit de départ : `.superpowers/sdd/2026-11-05-fidelite-structure-commune/audit-ecarts-maquettes.md`, sections 3 et 4.

## Décisions prises avec l'utilisateur

1. **Coût et revente** : sans maquette, ils s'ouvrent dans la même feuille ou le même dialogue que la mesure (un seul composant).
2. **Vocabulaire** : l'écran garde le titre « Nouvelle montre » (la maquette dit « Nouveau projet »). Seul le corps de l'écran est aligné. Écart consigné.
3. **Écran de succès** après création : conservé tel quel (absent de la maquette).

## Composant commun `Sheet.vue`

Enveloppe du `<dialog>` natif.
- Sous 640 px : feuille du bas (poignée, bouton fermer de 32 px, coins supérieurs arrondis). Les formulaires occupent toute la hauteur utile ; les confirmations sont compactes.
- À partir de 640 px : dialogue centré, 560 px pour les formulaires, 24 rem pour les confirmations.
- Props : `title`, `variant` (`form` ou `confirm`). Événement `close`. Slot par défaut pour le corps.
- Comportement : `showModal()` au montage (repli `open` si absent, comme `ConfirmDialog`), Échap ferme (événement `cancel` natif), clic sur le fond ferme, focus piégé par le navigateur, retour du focus au déclencheur à la fermeture, défilement du fond bloqué.
- `ConfirmDialog` est recomposé sur `Sheet` (variante `confirm`) et garde son API (`title`, `message`, `confirmLabel`, `confirm`, `cancel`, slot) : ses 8 usages ne changent pas.

## Formulaires dans la feuille

`MeasurementForm`, `ExpenseForm` et `ResaleForm` s'ouvrent dans `Sheet` (variante `form`) depuis « + Mesure », « + Coût » et le bouton de revente. Ils ne sont plus en ligne dans la page. Un enregistrement réussi ferme la feuille ; une erreur reste affichée dans la feuille.

### Mesure
- Champs et attributs de la maquette : marche (step 1), beat error (step 0.1, min 0), amplitude (step 1, min 0), pastilles de position de 36 px (34 px en desktop), aides plus longues.
- Édition : « Supprimer cette mesure » dans la feuille, avec la confirmation existante.
- Tableau : un seul bouton icône d'édition de 32 px par ligne remplace « Modifier » / « Supprimer » (la suppression se fait dans la feuille). Plus de défilement horizontal à 390 px.

### Coût et revente
Mêmes champs et mêmes règles qu'aujourd'hui, dans le même cadre. Aucune maquette : écart consigné.

## Écran « Nouvelle montre » et « Modifier la montre »

Le corps du formulaire est extrait en un composant partagé par `NewWatchView` et `EditWatchView` (il est dupliqué aujourd'hui).
- Mouvement : contrôle segmenté (radios natives conservées, pour l'accessibilité).
- Complications : pastilles `.chip-toggle` (cases natives conservées).
- Prix d'achat et date d'achat côte à côte.
- Montre existante : récapitulatif en 4 lignes et bouton « Saisir une nouvelle montre ».
- Étapes proposées : liste numérotée, étiquette de complication, boutons icônes, champ d'ajout avec bouton « + ».
- Champs 44 px, étiquettes 13 px, comme les autres écrans alignés.

## Documents

- SPECS.md : scénarios mesure, coût, revente et confirmations (feuille sur mobile, dialogue sur desktop) ; suppression d'une mesure depuis la feuille d'édition.
- CONCEPTION-TECHNIQUE.md : composant `Sheet` (remplace la mention « `<dialog>` seul »).
- REGLES-GESTION.md : aucune règle métier nouvelle ; matrice de tests mise à jour.

## Tests

- Unitaires : `Sheet` (ouverture, Échap, clic sur le fond, retour du focus, variantes) ; `ConfirmDialog` inchangé en comportement ; specs des trois formulaires adaptés à l'ouverture en feuille ; formulaire de montre partagé (segmenté, pastilles, récapitulatif, étapes) ; `PerformanceBlock` (bouton d'édition unique).
- e2e : ajout, édition et suppression d'une mesure ; ajout d'un coût ; revente ; création et modification d'une montre ; desktop et mobile 390.
- Visuel : captures Chrome à 390, 768 et 1280 px comparées aux maquettes ; 768 px sans maquette, vérifier l'absence de débordement.

## Hors périmètre

Compte et authentification (sous-projet E).

## Écarts consignés

- Formulaires de coût et de revente : aucune maquette, même style que la mesure.
- Titre « Nouvelle montre » conservé (maquette : « Nouveau projet »).
- Écran de succès de création conservé (absent de la maquette).
- Pas de maquette desktop pour la création de montre : le formulaire reste en colonne centrée.
