# Parcours génériques de démontage et de réassemblage

Ce document décrit le **référentiel d'étapes types** de l'application, tel qu'il est alimenté en base par `db/seed_reference_data.sql`.

Les étapes ci-dessous sont des ordres conseillés, à adapter au calibre réel : c'est précisément ce que permet l'aperçu ajustable à la création d'un projet. Ce référentiel est un premier jet, à relire par un horloger.

## Principe : une base par mouvement, des étapes par complication

Une checklist n'est plus choisie dans une liste de modèles figés : elle est **composée** à la création d'un projet.

```
étapes du projet = étapes du type de mouvement  +  étapes de chaque complication de la montre
```

- **Type de mouvement** (manuel, automatique) : décrit le mode de remontage. Chaque type possède sa liste de base complète, démontage puis remontage.
- **Complication** (chronographe, date, jour/date, petite seconde, réserve de marche) : fonction supplémentaire. Ses étapes sont les mêmes quel que soit le type de mouvement. Une montre peut en cumuler plusieurs.
- **Ordre** : chaque étape porte un rang `step_order` sur une **échelle commune espacée** (100, 200, 300…). Une étape de complication s'**intercale** entre deux étapes de base (ex. 350 entre 300 et 400). À rang égal, l'étape de base passe avant celle d'une complication, puis on départage par code de complication.
- **Copie** : la liste composée est proposée en aperçu, ajustée par l'utilisateur, puis **copiée** dans le projet. Modifier le référentiel ou les complications d'une montre n'affecte jamais les projets existants.

Le chronographe, qui figurait comme troisième « type de mouvement » dans la première version de ce document, est donc une **complication** : il se superpose à un mouvement manuel ou automatique au lieu de remplacer un parcours.

## Étapes de base

Rangs de 100 à 1000 : démontage. Rangs de 1100 à 2200 : remontage.

| Rang | Étape | Manuel | Automatique |
|---:|---|:---:|:---:|
| 100 | Désarmer le ressort de barillet | ✓ | ✓ |
| 200 | Sortir le mouvement du boîtier | ✓ | ✓ |
| **250** | **Déposer le rotor et le module automatique** | | ✓ |
| 300 | Déposer les aiguilles | ✓ | ✓ |
| 400 | Déposer le cadran | ✓ | ✓ |
| 500 | Déposer les éléments côté cadran | ✓ | ✓ |
| 600 | Déposer le balancier et le coq | ✓ | ✓ |
| 700 | Déposer l'ancre et son pont | ✓ | ✓ |
| 800 | Déposer le pont de rouage et le train de rouage | ✓ | ✓ |
| 900 | Déposer le barillet | ✓ | ✓ |
| 1000 | Déposer le remontoir, le rochet et le cliquet | ✓ | ✓ |
| 1100 | Contrôler, trier et nettoyer les pièces | ✓ | ✓ |
| 1200 | Remonter le remontoir et la mise à l'heure | ✓ | ✓ |
| 1300 | Lubrifier et remonter le barillet | ✓ | ✓ |
| 1400 | Remonter le train de rouage | ✓ | ✓ |
| 1500 | Poser l'ancre et son pont | ✓ | ✓ |
| 1600 | Poser le balancier et le coq | ✓ | ✓ |
| 1700 | Vérifier le fonctionnement du mouvement de base | ✓ | ✓ |
| **1770** | **Remonter le module automatique et le rotor** | | ✓ |
| 1800 | Remonter les éléments côté cadran | ✓ | ✓ |
| 1900 | Poser le cadran | ✓ | ✓ |
| 2000 | Poser les aiguilles | ✓ | ✓ |
| 2100 | Régler et mesurer la marche | ✓ | ✓ |
| 2200 | Emboîter et tester | ✓ | ✓ |

Soit **22 étapes** pour un mouvement manuel et **24** pour un automatique.

Le module automatique est reposé **avant** le cadran. Il pourrait l'être après sans conséquence : ce choix est un parti pris de lecture, ajustable dans l'aperçu.

## Étapes des complications

| Complication | Rang | Étape |
|---|---:|---|
| **Chronographe** | 350 | Déposer les aiguilles chrono |
| | 550 | Déposer le module chronographe |
| | 1730 | Remonter le module chronographe |
| | 2050 | Poser les aiguilles chrono |
| | 2150 | Tester les fonctions chrono |
| **Date** | 420 | Déposer le module calendrier |
| | 1850 | Remonter le module calendrier |
| | 2160 | Tester le saut de date |
| **Jour / date** | 420 | Déposer les disques de jour et de quantième |
| | 1850 | Remonter les disques de jour et de quantième |
| | 2160 | Tester le saut du jour et de la date |
| **Petite seconde** | 850 | Déposer la roue et le mécanisme de petite seconde |
| | 1450 | Remonter la roue et le mécanisme de petite seconde |
| **Réserve de marche** | 950 | Déposer le mécanisme de réserve de marche |
| | 1350 | Remonter le mécanisme de réserve de marche |

Chaque dépose a son pendant en remontage, dans l'ordre inverse : ce qui a été déposé en dernier est reposé en premier.

## Exemple de composition : mouvement manuel + chronographe + date

30 étapes : 22 de base, 5 de chronographe, 3 de date.

| Rang | Étape | Origine |
|---:|---|---|
| 100 | Désarmer le ressort de barillet | base |
| 200 | Sortir le mouvement du boîtier | base |
| 300 | Déposer les aiguilles | base |
| 350 | Déposer les aiguilles chrono | chronographe |
| 400 | Déposer le cadran | base |
| 420 | Déposer le module calendrier | date |
| 500 | Déposer les éléments côté cadran | base |
| 550 | Déposer le module chronographe | chronographe |
| 600 | Déposer le balancier et le coq | base |
| 700 | Déposer l'ancre et son pont | base |
| 800 | Déposer le pont de rouage et le train de rouage | base |
| 900 | Déposer le barillet | base |
| 1000 | Déposer le remontoir, le rochet et le cliquet | base |
| 1100 | Contrôler, trier et nettoyer les pièces | base |
| 1200 | Remonter le remontoir et la mise à l'heure | base |
| 1300 | Lubrifier et remonter le barillet | base |
| 1400 | Remonter le train de rouage | base |
| 1500 | Poser l'ancre et son pont | base |
| 1600 | Poser le balancier et le coq | base |
| 1700 | Vérifier le fonctionnement du mouvement de base | base |
| 1730 | Remonter le module chronographe | chronographe |
| 1800 | Remonter les éléments côté cadran | base |
| 1850 | Remonter le module calendrier | date |
| 1900 | Poser le cadran | base |
| 2000 | Poser les aiguilles | base |
| 2050 | Poser les aiguilles chrono | chronographe |
| 2100 | Régler et mesurer la marche | base |
| 2150 | Tester les fonctions chrono | chronographe |
| 2160 | Tester le saut de date | date |
| 2200 | Emboîter et tester | base |

## Points de lecture

- Les mouvements manuels offrent le parcours le plus linéaire : boîtier, cadran, train, échappement et barillet.
- Les automatiques ajoutent le rotor et le module de remontage automatique, d'où deux étapes propres.
- Les chronographes demandent le plus de granularité : le module chrono s'ajoute au mouvement de base et varie selon le calibre.
- Le quartz est hors périmètre de la v1 : un chronographe quartz n'a rien à voir avec un chronographe mécanique, et la règle « les étapes d'une complication sont les mêmes quel que soit le mouvement » ne tiendrait plus.

## Conseils UX pour l'app

Chaque étape peut contenir :
- une ou plusieurs photos ;
- une note courte (pièces remplacées, difficultés rencontrées, repères de remontage) ;
- un statut « fait / à faire ».

La structure reste simple tout en laissant assez de souplesse pour suivre un démontage réel, qui n'est jamais parfaitement identique d'un calibre à l'autre. L'utilisateur peut donc ajouter une étape personnalisée, modifier une étape et **réordonner** les étapes d'un projet à tout moment.
