# Sous-projet B : tableau de bord fidèle aux maquettes (spec)

Chantier « fidélité aux maquettes », sous-projet B. A (structure commune) est fait. Source des écarts : `.superpowers/sdd/2026-11-05-fidelite-structure-commune/audit-ecarts-maquettes.md`, section 1. Maquettes : `design/2026-09-23-screen-dashboard-technique-luminova-green.html` (mobile) et `design/2026-09-23-screen-dashboard-desktop-technique-luminova-green.html` (desktop).

## 1. Objectif et critères de succès

Le tableau de bord reproduit les maquettes mobile et desktop, y compris ce que la spec v1 ne prévoyait pas : recherche, tri, progression, pagination, marge cumulée.

Succès :
- les tests d'intégration de GET /watches sont écrits d'abord (RED), puis verts ;
- les captures Chrome à 390, 768 et 1280 px sont conformes aux maquettes ;
- les suites web, API, lint et e2e sont vertes ;
- SPECS.md, REGLES-GESTION.md et CONCEPTION-TECHNIQUE.md sont à jour.

## 2. Décisions prises avec l'utilisateur

1. **Format d'affichage** : montants sans décimales nulles (« 95 € », « +185 € », « 95,50 € »), dates en JJ/MM/AAAA. `formatMoney` est modifié pour tous les écrans.
2. **Recherche** `?q=` : insensible à la casse et aux accents, sur « marque modèle », tous les mots doivent être présents (ET).
3. **Tri** : par défaut les plus récemment ajoutées d'abord (id décroissant). Un seul tri explicite, `sort=purchase_date` avec `order=asc|desc`. Les montres sans date d'achat passent toujours en dernier. En égalité, id décroissant. Pas de contrôle de tri en mobile.
4. **Pagination serveur** pour desktop et mobile. Compteurs, tuiles, pastilles et marge cumulée restent globaux (S40), ils ne suivent ni le filtre ni la recherche. Mobile : « Voir plus » ajoute la page suivante.
5. **Libellé** : « Nouvelle montre » conservé partout (écart volontaire avec « Nouveau projet » de la maquette).
6. **Calcul en mémoire** dans `list()` (approche A) : un seul chargement des montres de l'utilisateur, puis statut, marge, progression, recherche, tri et découpage en TypeScript. Le statut reste défini par `computeStatus`, source unique.

## 3. API : GET /watches

### Requête
| Paramètre | Valeurs | Défaut |
|---|---|---|
| `status` | `in_progress`, `completed`, `sold`, `no_project` | tous |
| `q` | texte, 1 à 100 caractères après trim | aucun |
| `sort` | `purchase_date` | id décroissant |
| `order` | `asc`, `desc` (seulement avec `sort`) | `desc` |
| `page` | entier ≥ 1 | 1 |
| `pageSize` | entier de 1 à 50 | 8 |

Toute valeur invalide renvoie 400 avec un code explicite (`INVALID_STATUS` existant ; `INVALID_QUERY`, `INVALID_SORT`, `INVALID_ORDER`, `INVALID_PAGE`, `INVALID_PAGE_SIZE`). Validation manuelle dans le contrôleur, comme pour `status`.

### Réponse
```
{ items: WatchCard[], counts, total, page, pageSize, totalMargin }
```
- `total` : nombre de montres correspondant à `status` et `q` (avant découpage).
- `counts` : inchangé, global.
- `totalMargin` : somme des marges non nulles de toutes les montres, chaîne à 2 décimales ; `"0.00"` s'il n'y en a aucune.
- Ordre d'application : statut, recherche, tri, découpage. Une page hors limites renvoie `items: []` avec `total` correct.

### Carte (champs ajoutés)
`purchasePrice` (chaîne 2 décimales ou null), `purchaseDate` (ISO `AAAA-MM-JJ` ou null), `resalePrice`, `resaleDate` (idem), `progress: { done, total } | null`. `progress` porte sur les étapes du projet le plus récent (RG-PRJ-08), `null` sans projet. `done` compte les étapes dont `is_completed` est vrai, `total` toutes les étapes du projet.

### Recherche
Normalisation : minuscules et suppression des diacritiques (NFD) sur `marque + " " + modèle` et sur chaque mot de `q` (séparés par des espaces). Une montre correspond si chaque mot est contenu dans la chaîne.

## 4. Front

Une seule vue `DashboardView`, deux rendus séparés par un point de rupture à 640 px.

- **Store `watches`** : état `query`, `status`, `sort`, `order`, `page`, `total`, `totalMargin`. Une action de chargement avec ces paramètres. Recherche temporisée (~300 ms). Les réponses tardives sont ignorées (même garde que le profil en A). Mobile : ajout à `items` ; desktop : remplacement. Le mode est choisi par la vue.
- **`PageHeader`** : titre, sous-titre « N montres » (aria-live), bouton avatar mobile (repris de `DashboardView`).
- **`StatusFilter`** : pastilles 32 px défilantes avec compteurs, actif `--accent`, inactif `--text-secondary`, `tabindex="0"`, défilement de la pastille active.
- **`WatchCard` (mobile)** : vignette photo 52 px (`thumbnailUrl`), vignette vide en pointillés sans projet, point « Terminé » en `--accent-secondary`, marge sans décimales nulles, tailles 14/12/12 px.
- **`DashboardStats` (nouveau)** : 6 tuiles (Montres, En cours, Terminées, Vendues, Sans projet, Marge cumulée en vert), 3 colonnes à ≤ 1180 px.
- **`WatchTable` (nouveau, desktop)** : Montre (vignette 40 px, titre lien, sous-titre), Statut, Progression (barre 4 px + « 3/27 »), Achat (triable, « Inconnu » si prix nul), Revente, Marge (« — » si non calculable), chevron. Pied « 1–8 sur N » + Précédent / Suivant.
- **`DashboardToolbar` (nouveau)** : recherche (260 px, 160 px à ≤ 900 px), select de statut 36 px, bouton « Nouvelle montre ».
- **Recherche mobile** : `/?recherche=1` affiche un champ sous l'en-tête et lui donne le focus.
- **Formats** : `formatMoney` sans décimales nulles ; `formatDate` inchangé.

## 5. Documentation

- SPECS.md : S25 (tableau de bord : tuiles, tableau, progression), S40 (compteurs globaux, pagination, marge cumulée), recherche et tri ; C6 « tri reporté » remplacé par le tri sur l'achat.
- REGLES-GESTION.md : nouvelles RG-AFF-* (recherche, tri, pagination, compteurs et tuiles globaux, progression, marge cumulée, format d'affichage).
- CONCEPTION-TECHNIQUE.md : contrat de GET /watches, calcul en mémoire et limite de volume.

## 6. Tests et vérification

- API : tests d'intégration RED d'abord (recherche : casse, accents, mots multiples ; tri : montres sans date en dernier, égalité ; pagination, page hors limites ; progression ; `totalMargin` ; paramètres invalides), unitaires sur les fonctions pures de recherche, tri et découpage.
- Web : composants, store, `formatMoney` ajusté (les tests des autres écrans qui attendent « 95,00 € » sont corrigés).
- E2E : un parcours recherche et tri en desktop s'ajoute aux 8 existants.
- Visuel : captures Chrome à 390, 768 et 1280 px, comparées aux maquettes (spec Playwright jetable, non commitée).

## 7. Écarts consignés (Rulings)

1. « Nouvelle montre » conservé contre la maquette.
2. Champ de recherche mobile sans maquette.
3. « Voir plus » mobile absent des maquettes.
4. `formatMoney` modifié pour tous les écrans.
5. Calcul en mémoire : limite de volume (quelques dizaines à quelques centaines de montres par utilisateur). Si faux : migrer vers SQL, avec le risque de dupliquer le statut.

## 8. Hors périmètre

Fiche montre et projet (C), formulaires et confirmations (D), compte et connexion (E). Tri sur d'autres colonnes que l'achat.
