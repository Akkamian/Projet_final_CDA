# PRD lean - Watch Restoration Tracker

## 1. Contexte et problème
Les horlogers amateurs qui restaurent des montres anciennes gèrent seuls des projets longs et minutieux, sans outil dédié. Entre le démontage, le repérage des pièces, la prise de photos, les notes de restauration et le remontage, et les coûts d'achat de montres, de pièces ou de mouvements donneurs, les informations se dispersent vite.

Le problème ne consiste pas seulement à restaurer une montre, mais à ne pas perdre la logique de la restauration en cours de route. Aujourd'hui, beaucoup s'appuient sur des photos dans le téléphone, des notes papier ou leur mémoire, ce qui devient fragile lorsque l'utilisateur est débutant et dès que l'intervention s'étale dans le temps.

L'application vise donc à offrir un journal de restauration simple, qui aide à documenter les étapes, à se repérer pendant le geste, puis à conserver une mémoire claire des montres restaurées, des performances de leur mouvement et des coûts engagés.

## 2. Persona principal

### Cible principale
Horloger amateur débutant ou avec un peu d'expérience, qui restaure des montres mécaniques vintage par passion et travaille principalement en autonomie.

Il ou elle cherche un outil simple pour documenter une restauration, garder trace des étapes, retrouver rapidement les photos ou les notes associées à un projet, et avoir une vue d'ensemble des ressources engagées dans son hobby. Chaque utilisateur a son compte et ses données sont privées.

### Persona

| Attribut | Description |
| :-- | :-- |
| **Nom** | Romain, amateur de restauration horlogère |
| **Âge** | 46 ans |
| **Situation** | Restaure des montres anciennes sur son temps libre |
| **Douleurs** | Débute dans ce hobby et oublie l'ordre des étapes de démontage / remontage ou la place des pièces du mouvement, perd du temps à se retrouver ou à réparer ses erreurs |
| **Besoins** | Un journal simple pour suivre chaque restauration étape par étape |
| **Comportements** | Travail manuel, usage autonome, besoin d'un outil clair et rapide à prendre en main |

## 3. Proposition de valeur
Quoi : une application web simple pour documenter des restaurations de montres anciennes.

L'application aide l'amateur à suivre une restauration étape par étape, à ajouter des photos au bon moment et à conserver une mémoire structurée de ses montres.

Elle sert d'abord pendant la restauration, comme support visuel et chronologique, puis après coup comme carnet de bord personnel.

Résumé de l'idée : aider l'amateur à ne pas se perdre dans le démontage/remontage d'une montre et à garder une trace claire de ses restaurations.

## 4. Fonction principale V1
La V1 se concentre sur un flux simple : enregistrer une montre, obtenir la checklist de son démontage et de son remontage, dérouler les étapes dans l'ordre, valider chaque étape, ajouter des photos et des notes, puis retrouver l'historique de la montre.

La checklist n'est pas choisie dans une liste de modèles figés : elle est **générée** à partir du type de mouvement (manuel ou automatique) et des complications de la montre (chronographe, date, petite seconde…), dans un ordre proposé que l'utilisateur ajuste avant de la valider, puis qu'il peut réordonner à tout moment.

L'utilisateur documente ainsi la restauration d'une montre ancienne avec les éléments essentiels : marque et modèle, type de mouvement, complications, étapes chronologiques, photos par étape, notes (pièces remplacées, difficultés rencontrées), photos avant / après.

La V1 inclut aussi le suivi des coûts liés à la montre (achat, pièces, consommables), le prix de revente et le calcul automatique de la marge.

Une même montre peut faire l'objet de plusieurs interventions successives (restauration, puis révision) : ces projets forment son historique.

### Objectifs v1

- Permettre de documenter une restauration étape par étape (photos + notes) à partir de checklists générées selon le type de mouvement et les complications de la montre.
- Permettre de retrouver l'historique des interventions successives sur une même montre.
- Permettre de suivre le prix d'achat (facultatif : il peut être inconnu pour une montre conservée de longue date), le prix de revente et les coûts additionnels, avec calcul automatique de la marge par montre quand le prix d'achat est connu.
- Permettre de suivre l'évolution des performances du mouvement (marche/jour, beat error, amplitude) dans le temps.
- Permettre de comparer visuellement l'état d'une montre avant et après restauration.

## 5. Métriques de succès

### 5.1 Indicateurs d'usage
Indicateurs à suivre si l'application est mise à disposition d'utilisateurs :
- Nombre de projets créés par utilisateur.
- Pourcentage de projets menés jusqu'à l'étape finale.
- Nombre moyen de photos ajoutées par projet.
- Taux de retour sur un projet déjà commencé.
- Nombre de projets relus après finalisation, signe d'usage comme mémoire de restauration.

### 5.2 Critères de succès de la v1
Le projet étant un side-project personnel avant d'être un produit à grande échelle, le succès se mesure aussi à l'usage réel :
- L'auteur utilise l'application de bout en bout sur au moins une restauration complète, de la création de la montre à sa revente.
- Le temps de recherche d'un historique de restauration passée diminue perceptiblement par rapport à l'usage actuel (photos en vrac dans le téléphone).
- La marge d'une montre vendue, dont le prix d'achat est connu, est calculable directement dans l'outil, sans recalcul manuel.

## 6. Hors-périmètre
- Pas à devenir un outil professionnel de gestion d'atelier : ni facturation, ni clients, ni inventaire de stock. La revente n'est suivie que pour calculer la marge d'une montre.
- Ne cherche pas à remplacer un manuel technique complet, ni à contenir tout le savoir horloger.
- Pas de fonctionnalité sociale (commentaires, contact, relations entre utilisateurs).
- Pas de mesure automatique du mouvement via microphone (façon timegrapher intégré) : saisie manuelle uniquement.
- Pas de modèles de checklist personnalisés et réutilisables par l'utilisateur : les checklists générées sont adaptables par projet, mais l'adaptation n'est pas sauvegardée comme nouveau modèle.
- Pas de mouvements quartz, ni de type d'intervention (restauration / révision).
- Pas de suivi du temps passé par étape ou par projet.
- Pas d'application mobile native : web app responsive uniquement.

## 7. Hypothèses et risques
**Hypothèses** :
H1 : Les amateurs de restauration horlogère ont besoin d'un outil pour garder l'ordre des étapes et des photos.

H2 : Une expérience très simple, notamment dans la prise de photos et leur consultation, sera mieux adoptée qu'une solution riche mais complexe.

H3 : Le besoin de mémoire de restauration est réel même pour un usage individuel.

H4 : La combinaison des trois piliers (restauration + finances + performance du mouvement) constitue une différenciation suffisante par rapport aux solutions existantes (ChronoLog et WatchGrid par exemple) prises séparément.

**Risques** :
- Le produit peut être perçu comme trop proche d'un simple album photo si les étapes ne sont pas assez structurées.
- Le produit peut être trop technique si le vocabulaire horloger n'est pas assez clair pour les débutants.
- Si la V1 est trop ambitieuse, elle peut perdre son côté journal simple et devenir un outil trop lourd.
- La recherche de validation a qualifié le faisceau d'indices de preuve de « moyen » : aucun témoignage direct ne confirme une demande explicite pour cette combinaison précise. **Mitigation** : l'auteur est lui-même l'utilisateur cible principal, la validation d'usage se fait en priorité par sa propre pratique.

## 8. Périmètre V1
La V1 comprend :

1. Comptes utilisateurs privés, avec vérification de l'adresse email et gestion du mot de passe.
2. Gestion des montres (marque, modèle, type de mouvement, complications, achat, revente) et de leurs interventions successives (projets, avec statut « en cours » ou « terminé »).
3. Checklists de démontage / réassemblage générées d'après le type de mouvement et les complications, adaptables avant validation, étape personnalisée possible, réordonnancement à tout moment.
4. Photos et notes par étape ; photos avant / après du projet.
5. Journal de mesures de performance du mouvement.
6. Suivi des coûts additionnels, revente et calcul de la marge par montre.
7. Tableau de bord listant les montres de l'utilisateur.

La V1 reste web et simple d'usage, avec une logique mobile-first, sans complexité superflue.

## 9. Backlog v2 (noté pour plus tard)
- Suivi du temps passé.
- Fiches de référence par calibre de mouvement (ex : FEF 520, Landeron 48), avec historique croisé des projets ayant travaillé sur ce calibre.
- Modèles de checklist personnalisés et réutilisables.
- Mouvements quartz.
- Mesure automatique du mouvement via microphone.
- Resynchronisation des étapes d'un projet quand les complications d'une montre changent.

## 10. Contraintes
- Projet réalisé en solo, dans le cadre du titre professionnel Concepteur Développeur d'Applications (RNCP niveau 6) : la conception prime sur l'exhaustivité du code produit.
- Base de données relationnelle imposée par la formation ; stack technique libre.
- Web app responsive, conçue mobile-first : l'usage principal a lieu à l'établi, pendant la restauration.
