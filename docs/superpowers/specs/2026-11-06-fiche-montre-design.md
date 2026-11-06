# Fidélité aux maquettes, sous-projet C : fiche montre et projet

Date : 2026-11-06. Branche : `feat/fidelite-maquettes`. Suite des sous-projets A (structure commune) et B (tableau de bord).

## Objet

Aligner `WatchDetailView` (fiche montre, avec son projet affiché) sur les maquettes `design/2026-09-25-screen-project-detail-*`, `design/2026-10-07-screen-project-detail-etats-*` et `design/2026-10-07-screen-project-detail-desktop-vendue-*`. Périmètre convenu avec l'utilisateur : tout ce que montrent les maquettes est implémenté, y compris ce que la spec v1 ne prévoyait pas. Audit de départ : `.superpowers/sdd/2026-11-05-fidelite-structure-commune/audit-ecarts-maquettes.md`, section 2.

## Décisions prises avec l'utilisateur

1. **Performances** : échelles de la maquette (zone cible, marqueurs 1re et dernière mesure, verdict texte), sans graphique. Chart.js et `PerformanceChart` sont retirés ; D7 et S20 sont mis à jour. Le tableau chronologique reste (RG-PER-04).
2. **Modifier la montre** : nouvelle route `/watches/:id/edit` qui réutilise le formulaire de `NewWatchView`, prérempli, et appelle le `PATCH /watches/:id` existant. Aucune maquette ; l'ajustement relève du sous-projet D.
3. **Coût de revient** : calculé côté API, champ `costPrice` sur `GET /watches/:id` (achat + coûts de tous les projets, `Prisma.Decimal`).
4. **Chevron d'étape** : déplie l'éditeur d'étape existant, sur place. Aucun écran de détail d'étape.

## Structure

Une seule vue et un seul rendu ; la mise en page est en CSS pur (pas de `useIsDesktop`).

DOM, dans l'ordre mobile : en-tête, `.rail` (Finances, Avant/Après), `.main` (Étapes, Performances). Mobile : blocs empilés dans cet ordre, séparés par `border-top`, padding 24×16. À partir de 1181 px : grille `minmax(0, 1.65fr) minmax(300px, 1fr)`, gap 24 ; `.main` à gauche, `.rail` à droite, `position: sticky; top: calc(var(--topbar-h) + 24px)`. En dessous de 900 px, l'en-tête passe en colonne.

### En-tête
- Photo : celle de la carte du tableau de bord, `photoAfter ?? photoBefore` du projet affiché ; vignette en pointillés si absente (même motif que `WatchCard`). Mobile : hero 150 px ; desktop : 200×140.
- Titre (19 px mobile, 22 px desktop), sous-titre (mouvement, complications), badge de statut : En cours, Terminé, Vendue, Sans projet.
- Bouton « Marquer le projet terminé » avec hint « Passe le projet au statut Terminé » ; pour un projet terminé : « Terminé le <date> ».
- Montre vendue : hint « Montre vendue : aucun nouveau projet… » à la place du bouton de révision.
- Desktop : fil d'Ariane « Tableau de bord / marque modèle » dans le slot du `PageHeader` ; boutons « Modifier la montre », « ⋯ », « Marquer le projet terminé ».
- Bandeau de 4 faits : Achat / Coût de revient / Progression / Dernière mesure. Montre vendue : Achat / Coût de revient / Revente / Marge. Montants sans décimales nulles (RG-AFF-12).
- Onglets de projet (pilules) quand la montre a au moins 2 projets ; remplace `ProjectSelector` (`<select>`). Un seul projet : pas d'onglets.

### Menu « ⋯ »
Popover (min 240 px) : Modifier la montre ; Rouvrir ce projet (désactivé avec une note quand RG-PRJ-05 ou RG-PRJ-09 l'interdit) ; Supprimer ce projet ; Supprimer la montre. Fermeture par Échap et clic extérieur, retour du focus au bouton. Les boutons de la zone de danger actuelle sont supprimés. La confirmation reste le `<dialog>` existant (la feuille du bas relève de D).

### Étapes
Ligne : index « 01 », titre, puce « N photos », date de fin ou « Notes en cours », chevron. Un appui sur la ligne ou le chevron déplie l'éditeur actuel (notes, photos, dates). Carte avec barre de progression de 4 px. Toutes les étapes terminées : récapitulatif replié « Toutes les étapes sont terminées », dépliable.

### Finances
Bloc de revente (prix, date) ou encart pointillé « Revente non renseignée » ; bloc de marge (26 px/600, vert) avec formule « revente − achat − coûts (350 − 120 − 45) » et mention « coûts des N projets » ; coûts groupés par projet. Formulaires existants conservés (`ExpenseForm`, `ResaleForm`).

### Titres de bloc
13 px, majuscules, comme les maquettes.

## Performances

Composant `PerformanceScales` : trois pistes de 16 px (Marche, Beat error, Amplitude). Chaque piste montre la zone cible, le marqueur de la première mesure, celui de la dernière, le lien entre les deux, et un verdict texte :
- Marche : « Avance de 14 s/j · hors zone (±10 s/j) » ou « Dans la zone (±10 s/j) » ; « Retard de … » en négatif.
- Beat error : « Dans la zone (≤ 0.5 ms) » ou « Hors zone (≤ 0.5 ms) ».
- Amplitude : « Dans la zone (250–310°) » ou « Hors zone (250–310°) ».

Zones cibles : constantes indicatives dans un seul module (`performance-zones.ts`), marche ±10 s/j, beat error ≤ 0,5 ms, amplitude 250–310°. Elles sont inscrites dans une règle de gestion et présentées comme repères indicatifs, comme dans la maquette. L'échelle de la marche s'ajuste aux valeurs. Moins de 2 mesures : une seule marque (la dernière), pas de lien.

Le filtre de position (pastilles « Cadran haut 3 »…) restreint le tableau et les échelles à une position. Le tableau montre date, marche avec delta « +14 (−12) », beat error, amplitude, position, actions. Formats de mesure : sans décimales superflues (« +14 », « 0.4 ms », « 268° »). « + Mesure » reste affiché pour une montre vendue (la maquette mobile l'omet, la maquette desktop le montre : ruling, aucune règle ne l'interdit).

## API

`GET /watches/:id` : champ `costPrice: string | null` = `purchasePrice + somme des coûts de tous les projets`, en `Prisma.Decimal`, `null` si le prix d'achat est inconnu. Calculé au même endroit que `margin`, même invalidation côté web (relecture après chaque coût, comme `margin`). Aucun autre changement de contrat. Nouvelle règle RG-FIN pour le coût de revient ; nouvelle règle RG-PER pour les zones cibles.

## Front : fichiers

Créés : `PerformanceScales.vue`, `performance-zones.ts`, `ProjectTabs.vue`, `WatchMenu.vue`, `WatchFacts.vue` (bandeau), `WatchHero.vue` (photo et titre), `EditWatchView.vue` (ou mode édition de `NewWatchView`, à trancher au plan), specs correspondants. Modifiés : `WatchDetailView.vue`, `StepList.vue`, `StepItem.vue`, `FinanceBlock.vue`, `PerformanceBlock.vue`, `BeforeAfter.vue`, `format.ts`, `router`, `stores/watches.ts` (type `costPrice`). Supprimés : `PerformanceChart.vue` et son spec, `ProjectSelector.vue` et son spec, dépendance Chart.js si plus utilisée ailleurs.

## Documents

- SPECS.md : S20 (échelles et verdict à la place du graphique), nouveau scénario « modifier une montre ».
- CONCEPTION-TECHNIQUE.md : D7 (Chart.js retiré), contrat `costPrice`, route d'édition.
- REGLES-GESTION.md : RG-FIN coût de revient ; RG-PER zones cibles et verdict ; RG-AFF format des mesures ; matrice mise à jour.

## Tests

- API (intégration) : `costPrice` avec 0, 1 et 2 projets, sans prix d'achat, après ajout et suppression d'un coût, après suppression d'un projet.
- Web (unitaires) : un spec par composant créé ; `performance-zones` (verdicts aux limites exactes) ; `WatchDetailView` (ordre des blocs, onglets, menu, états En cours, Terminé, Vendue, Sans projet).
- e2e : parcours fiche (ouvrir, terminer, modifier la montre, ajouter une mesure et lire le verdict), desktop et mobile 390.
- Visuel : captures Chrome à 390, 768 et 1280 px comparées aux maquettes ; 768 px sans maquette, vérifier l'absence de débordement.

## Hors périmètre (sous-projet D)

Feuille du bas pour les confirmations de suppression ; maquettes absentes des formulaires de coût, de revente et de mesure ; ajustement du formulaire d'édition de montre.

## Écarts consignés

- Écran de détail d'étape : aucune maquette, remplacé par le dépliage sur place.
- Formulaire « Modifier la montre » : aucune maquette, même style que la création.
- Zones cibles : valeurs issues de la maquette, non validées par une source horlogère.
