# PRD lean - Watch Restoration Tracker

## 1. Contexte et problème
Les horlogers amateurs qui restaurent des montres anciennes gèrent seuls des projets longs et minutieux sans outil dédiés. Entre le démontage, le repérage des pièces, la prise de photos, les notes de restauration et le remontage, les coûts d'achat de montres, de pièces, de mouvement donneurs... les informations peuvent vite être dispersées.

Le problème ne consiste pas seulement à restaurer une montre, mais à ne pas perdre la logique de la restauration en cours de route. Aujourd’hui, beaucoup s’appuient sur des photos dans le téléphone, des notes papier ou leur mémoire, ce qui devient fragile lorsque l'utilisateur est débutant et dès que l’intervention s’étale dans le temps.

L’application vise donc à offrir un journal de restauration simple, qui aide à documenter les étapes, à se repérer pendant le geste, puis à conserver une mémoire claire des projets réalisés et des coûts engagés.
## 2. Persona principal

### Cible principale
Horloger amateur débutant ou avec un peu d'experience, qui restaure des montres mécaniques vintage par passion et travaille principalement en autonomie.

Il ou elle cherche un outil simple pour documenter une restauration, garder traces des étapes et retrouver rapidement les photos ou les notes associées à un projet, et avoir une vue d'ensemble des ressources engagées dans son hobby.

### Persona

| Attribut | Description |
| :-- | :-- |
| **Nom** | Romain, amateur de restauration horlogère |
| **Âge** | 46 ans |
| **Situation** | Restaure des montres anciennes sur son temps libre |
| **Douleurs** | Débute dans ce hobby et oublie l’ordre des étapes de démontage / remontage ou la place des pièces du mouvement, perd du temps à se retrouver ou réparer ses erreurs |
| **Besoins** | Un journal simple pour suivre chaque restauration étape par étape|
| **Comportements** | Travail manuel, usage autonome, besoin d’un outil clair et rapide à prendre en main|

## 3. Proposition de valeur
Quoi : une application web simple pour documenter des restaurations de montres anciennes.

L’application aide l’amateur à suivre une restauration étape par étape, à ajouter des photos au bon moment et à conserver une mémoire structurée de ses projets.

Elle sert d’abord pendant la restauration, comme support visuel et chronologique, puis après coup comme carnet de bord personnel.

Résumé de l’idée : aider l’amateur à ne pas se perdre dans le démontage/remontage d’une montre et à garder une trace claire de ses restaurations.

## 4. Fonction principale V1
La V1 se concentre sur un flux simple : créer une restauration, dérouler les étapes dans l’ordre, valider chaque étape, ajouter des photos et des notes, puis retrouver l’historique du projet.

L’utilisateur peut documenter la restauration d’une montre ancienne avec les éléments essentiels : nom du projet, référence de la montre ou du calibre, étapes chronologiques, photos par étape, notes, pièces remplacées et difficultés rencontrées.

La V1 inclut aussi une logique avant / après pour mettre en valeur la restauration terminée et l'enregistrement des couts liés au projet (achat de la montre, de pièces à changer, de consommables).

### Objectifs v1

- Permettre de documenter une restauration étape par étape (photos + notes) à partir de checklists types par mouvement.
- Permettre de suivre le prix d'achat, le prix de revente et les coûts additionnels, avec calcul automatique de la marge.
- Permettre de suivre l'évolution des performances du mouvement (marche/jour, beat error, amplitude) dans le temps.
- Permettre de comparer visuellement l'état d'une montre avant et après restauration.

## 5. Métriques de succès
- Nombre de restaurations créées par utilisateur.

- Pourcentage de restaurations complétées jusqu’à l’étape finale.

- Nombre moyen de photos ajoutées par restauration.

- Taux de retour sur une restauration déjà commencée.

- Nombre de projets relus après finalisation, signe d’usage comme mémoire de restauration.

## 6. Hors-périmètre
- Pas à devenir un outil professionnel de gestion d’atelier.
- Ne couvre pas la vente, la gestion commerciale, le calcul de marge, la facturation ou le suivi d’inventaire.
- Ne cherche pas à remplacer un manuel technique complet, ni à contenir tout le savoir horloger.
- Pas de fonctionnalité sociale (commentaires, contact, relations entre utilisateurs).
- Pas de mesure automatique du mouvement via microphone (façon timegrapher intégré) — saisie manuelle uniquement.
- Pas de templates de checklist personnalisés et réutilisables par l'utilisateur (les checklists système sont adaptables par projet, mais l'adaptation n'est pas sauvegardée comme nouveau modèle).
- Pas de suivi du temps passé par étape/projet.
- Pas d'application mobile native — web app responsive uniquement.

## 7. Hypothèses et risques
**Hypothèses** :
H1 : Les amateurs de restauration horlogère ont besoin d’un outil pour garder l’ordre des étapes et des photos.

H2 : Une expérience très simple, notamment dans la prise de photos et leur consultation, sera mieux adoptée qu’une solution riche mais complexe.

H3 : Le besoin de mémoire de restauration est réel même pour un usage individuel.

H4 : la combinaison des trois piliers (restauration + finances + performance du mouvement) constitue une différenciation suffisante par rapport aux solutions existantes (ChronoLog et WatchGrid par exemple) pris séparément.

**Risques** :
Le produit peut être perçu comme trop proche d’un simple album photo si les étapes ne sont pas assez structurées.

Le produit peut être trop technique si le vocabulaire horloger n’est pas assez clair pour les débutants.

Si la V1 est trop ambitieuse, elle peut perdre son côté journal simple et devenir un outil trop lourd.


## 8. Périmètre V1
La V1 comprend :

1. Gestion de projets de restauration (marque/modèle, type de mouvement, statut, achat/revente).
2. Checklists de démontage/réassemblage instanciées depuis un modèle système, adaptables par projet.
3. Photos et notes par étape ; photos avant/après du projet.
4. Journal de mesures de performance du mouvement.
5. Suivi des coûts additionnels et calcul de marge.
6. Tableau de bord listant les projets de l'utilisateur.

La V1 reste web et simple d’usage, avec une logique mobile-first si possible, sans complexité superflue.