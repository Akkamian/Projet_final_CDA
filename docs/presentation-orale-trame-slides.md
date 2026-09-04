# Trame de présentation orale — Watch Restoration Tracker

> Projet de fin de formation CDA — Simplon · Durée cible :6 minutes · Auteur :Clément MARTIN

> Ce fichier contient :
> 1. le brief à copier dans Gamma, avec les consignes de style et le contenu des 7 slides.
> 2. le récap des temps pour l'entraînement.
> 3. les notes de vigilance avant l'oral.



<!-- DEBUT DU BLOC A COPIER DANS GAMMA -->

**Brief — Présentation orale « Watch Restoration Tracker »**

Contexte :présentation de projet de fin de formation, CDA, Concepteur Développeur d'Applications, Simplon. Durée :6 minutes. Langue :français. Nom du projet :« Watch Restoration Tracker ».


## Consignes générales de style, à appliquer à tout le deck

- **Ambiance** :atelier d'horloger, précis, artisanal, chaleureux. Pas de style startup corporate, pas de néon, pas d'emoji. Des icônes fines au trait restent possibles. 
- **Palette** :fond ivoire `#F7F3EC`, texte anthracite `#1F2937`, accent cuivre/ambre `#B87333`, qui évoque le laiton, la visserie et le cuivre, gris secondaire `#6B7280`. Option :slide de titre sur fond sombre anthracite avec texte ivoire. 
- **Typographie** :titres en sérif élégante, Playfair Display ou Cormorant Garamond, corps en sans-serif sobre, Inter ou Source Sans 3. 
- **Layout** :beaucoup d'air, une seule idée par slide, des textes courts sur les slides, quatre à six mots par puce au maximum. Les phrases complètes vont dans les notes présentateur. Une image forte par slide. 
- **Images** :photos réelles de montres ou de mouvements, captures des maquettes Figma, capture du tableau kanban GitHub. Ces images seront uploadées après génération. Laisser des emplacements clairs si elles ne sont pas encore disponibles. 



## Slide 1 — Titre

- **Contenu visible** :« Watch Restoration Tracker », sous-titre « Documenter une restauration de montre, étape par étape », et « Clément MARTIN — CDA Simplon ».

- **Visuel** :grande photo avant/après d'une montre ou macro d'un mouvement. Fond sombre anthracite, texte ivoire, accent cuivre. 
- **Notes présentateur** :« Bonjour. Je vous présente Watch Restoration Tracker, mon projet de fin de formation :une application web qui aide les horlogers amateurs à documenter leurs restaurations de montres anciennes, étape par étape. »
- **Temps** :slide affichée pendant l'accueil, environ 15 secondes, sans discours. 



---

## Slide 2 — Le problème, JTBD

- **Titre visible** :« Restaurer une montre, c'est ne pas perdre le fil »
- **Contenu visible** :trois puces courtes.
 - Photos en vrac dans le téléphone, notes papier, mémoire fragile.
 - Perdre le fil du démontage, c'est provoquer des erreurs au remontage.

 - Aucune solution existante ne combine documentation, finances et précision. 
- **Visuel** :photo forte de mouvement démonté, pièces disposées sur un plan de travail ou éclairé en macro. 
- **Notes présentateur** :
 1. L'horloger amateur restaure seul, souvent sur plusieurs semaines. L'intervention est longue et minutieuse. 
 2. Aujourd'hui, ses repères sont dispersés :des photos en vrac, des notes papier, sa mémoire. Dès qu'on débute, ou dès que le projet s'étale dans le temps, on perd l'ordre du démontage ou la place des pièces. Le vrai risque n'est pas seulement technique, c'est de perdre le fil de la restauration. 
 3. Le besoin, formulé en JTBD :« Quand je restaure une montre pour le plaisir, je veux documenter mes étapes avec photos et notes, suivre mes coûts et l'évolution de la précision du mouvement, afin de limiter les erreurs et de garder une mémoire de mon travail. »
 4. Sur le marché, ChronoLog et WatchGrid ne couvrent chacun qu'une partie du besoin. Aucun ne réunit ces trois dimensions. 
 **Transition, à dire sans l'afficher** :« Ce constat, je l'ai transformé en une solution, une solution simple. »
- **Temps** :environ 50 secondes. 



## Slide 3 — La solution

- **Titre visible** :« Un journal de restauration, pas un album photo »
- **Contenu visible** :trois tuiles pour les trois piliers, et un flux V1.


 - Documentation étape par étape :checklists types, photos, notes, validation de chaque étape
 - Finances du projet :prix d'achat, pièces, coûts additionnels, revente
 - Performance du mouvement :marche par jour, amplitude, beat error
 - Flux V1 en quatre pastilles :« Créer, la checklist s'instancie, valider avec photos et notes, avant/après et historique »》
- **Visuel** :captures Figma de trois à quatre écrans :tableau de bord des projets, détail d'une restauration avec sa checklist, une étape avec photo et note, vue avant/après. Ajouter le flux en quatre pastilles. 
- **Notes présentateur** :
 1. « J'ai transformé le constat en une V1 très simple, concentrée sur un flux unique. »
 2. « Trois piliers, précisément les trois dimensions qu'aucune solution existante ne réunit. » Les montrer un par un. 
 3. « Le flux :à la création d'un projet, la checklist du bon type de mouvement s'instancie automatiquement. Deux types de mouvement et quatre complications, soit huit processus référencés en base. Chaque étape se valide avec photos et notes. En fin de projet, avant/après et historique. »
 4. « Voici les maquettes, conçues sur Figma. Elles montrent ce flux en conditions réelles. » Montrer les captures. 
 **Transition** :« Pour que ce journal reste fiable et ne parte pas en vrille, j'ai d'abord pensé les données. »
- **Temps** :environ 70 secondes. 



---

## Slide 4 — De l'idée à la donnée, MCD vers MPD, le cœur

- **Titre visible** :« Le MCD choisit la sémantique, le MPD corrige ce que la technique refuse »
- **Contenu visible** :
 - Chaîne :JTBD, PRD, SPECS Gherkin, MCD, MPD
 - Les processus gardent leur clé sémantique, le couple type de mouvement et complication :stable, unique, aucun identifiant technique ajouté

 - Les étapes reçoivent un identifiant technique :l'ordre est réordonnable et le libellé modifiable. L'unicité est protégée par des contraintes. 
- **Visuel** :la chaîne documentaire horizontale et un tableau contrasté des deux cas, ou un extrait SQL des deux clés côte à côte. 
- **Notes présentateur** :
 1. « Avant d'écrire la moindre ligne de code, j'ai pensé les données, parce que c'est le socle du produit. »
 2. « Tout découle d'une chaîne :le besoin formalisé dans le PRD, les comportements attendus écrits en Gherkin dans les spécifications fonctionnelles, puis le modèle conceptuel dans Looping, et enfin le modèle physique dans PostgreSQL. »
 3. « Le principe directeur :favoriser l'identifiant sémantique tant qu'il est stable et unique. On n'ajoute un identifiant technique que quand la technique l'exige, et dans ce cas on protège la sémantique par des contraintes. »
 4. « L'exemple contrasté :le processus de restauration garde sa clé métier, car le couple type de mouvement et complication est stable et unique. En revanche, les étapes reçoivent un identifiant technique, car leur ordre change dès qu'on réordonne et leur libellé se modifie. L'unicité est alors protégée par des contraintes. »
 5. Optionnel, si tu es à l'aise :« Pour déplacer des étapes sans conflit, la contrainte est déclarée deferrable et vérifiée au commit. Cela permet de réordonner la checklist sans erreur transitoire. »
 **Transition** :« Ce socle de données, voici maintenant la stack qui va le faire vivre. »
- **Temps** :95 à 100 secondes. C'est le cœur de la présentation, ne pas rogner ici. 



## Slide 5 — La stack, en bref

- **Titre visible** :« Une web app mobile-first, pensée pour l'atelier »
- **Contenu visible** :schéma en trois couches.
 - Client :Vue 3
 - API :NestJS avec Prisma
 - Base de données :PostgreSQL
 Plus une phrase :« TypeScript de bout en bout. »
- **Visuel** :schéma simple en trois couches, client, API, base, style sobre. 
- **Notes présentateur** :
 1. « Pour faire vivre ce socle, une stack simple :Vue 3 côté client, pensée mobile-first, pour être utilisée dans l'atelier, une montre dans une main. »
 2. « Côté serveur, NestJS avec Prisma comme ORM, sur PostgreSQL. »
 3. « Un choix de cohérence :TypeScript de bout en bout, pour un code sûr et simple à maintenir. »
 **Transition** :« Et tout ce travail, je ne le fais pas au hasard. Le projet est organisé comme un vrai projet. »
- **Temps** :environ 30 secondes. 



---

## Slide 6 — Organisation du travail, GitHub Projects

- **Titre visible** :« Un projet mené comme un vrai projet »
- **Contenu visible** :
 - Dépôt Git organisé avec des branches dédiées, dev, staging, main
 - Tableau kanban GitHub Projects avec des colonnes Backlog, À faire, En cours, Terminé
 - Tâches découpées directement depuis le PRD et les SPECS. 
- **Visuel** :capture écran du tableau kanban réel, avec une ou deux cartes mises en évidence. 
- **Notes présentateur** :
 1. « En parallèle de la conception, le projet est organisé :un dépôt Git avec des branches dédiées, dev pour le travail courant, staging pour la validation, main pour le stable. »
 2. « Un tableau kanban GitHub Projects découpe le travail directement depuis le PRD et les spécifications. Chaque carte correspond à une brique de la V1. »
 3. « Exemple :la rédaction des spécifications fonctionnelles est passée de À faire à Terminé. Le projet avance concrètement et chaque étape reste traçable. »
 **Transition** :« Et concrètement, où en suis-je aujourd'hui ? »
- **Temps** :environ 35 secondes. 



## Slide 7 — Où j'en suis et prochaines étapes

- **Titre visible** :« Le socle est posé, l'implémentation commence »
- **Contenu visible** :timeline horizontale en trois segments, pastilles de couleur sans emoji.

 - Fait :besoin JTBD et persona, PRD, SPECS Gherkin, MCD et MPD avec seed des huit processus, maquettes Figma
 - En cours :socle technique, stack actée, mise en place de l'environnement
 - À venir :implémentation de la V1, validation des scénarios Gherkin par les tests, démonstration. 
- **Visuel** :timeline horizontale fait, en cours, à venir, avec les livrables côté fait et les technologies côté à venir. 
- **Notes présentateur** :
 1. « Concrètement, aujourd'hui :le besoin est documenté, avec le JTBD et le persona. Le PRD est écrit. Les spécifications fonctionnelles sont rédigées en Gherkin. Le modèle de données est conçu et justifié, le MCD dans Looping, le MPD et son seed dans PostgreSQL. Et les maquettes sont sur Figma. »
 2. « La stack est actée. La prochaine étape est l'implémentation de la V1, puis la validation des scénarios Gherkin par les tests, et enfin la démonstration. »
 3. Pour conclure :« L'objectif est qu'à la fin, l'amateur ne perde plus jamais le fil de sa restauration, et qu'il garde une mémoire claire de chaque montre passée entre ses mains. Merci, je suis prêt à répondre à vos questions. »
- **Temps** :environ 35 secondes. 



<!-- FIN DU BLOC A COPIER DANS GAMMA -->



---

## Récap des temps pour l'entraînement

| Slide | Sujet | Temps |
|---|---|---|---|
| 1 | Titre |15 s, affichée sans discours |
| 2 | Problème et JTBD |≈50 s |
| 3 | Solution et maquettes |≈70 s |
| 4 | MCD vers MPD, le cœur |≈95 à 100 s |
| 5 | Stack |≈30 s |
| 6 | Organisation du projet |≈35 s |
| 7 | Où j'en suis |≈35 s |
| — | Transitions, incluses dans les notes |≈25 à 30 s |
| | Total |≈6 min |

Règle d'entraînement :à l'oral, vise les minimums, soit 50, 70, 95, 30, 35 et 35 secondes. Les 15 secondes de marge absorbent les respirations et les aléas. Un premier passage à voix haute dure environ 7 minutes. Coupe sans pitié, le jury n'entendra que ce que tu assumes. 



---

## Notes de vigilance avant l'oral

1. Prisma est côté serveur. Déjà corrigé dans la slide 5, mais garde-le en tête aux questions :Prisma tourne côté Node.js et interroge PostgreSQL, tandis que Vue 3 tourne dans le navigateur. 
2. Adapte les noms des colonnes du kanban aux colonnes réelles de ton tableau GitHub Projects si elles diffèrent. La trame est générique :Backlog, À faire, En cours, Terminé. 
3. Adapte les écrans Figma aux captures que tu as réellement. Trois à quatre écrans suffisent. Si le temps presse, deux captures :le flux avec la checklist et la vue avant/après. 
4. Uploade les captures dans Gamma après génération. Gamma ne peut pas accéder tout seul à Figma ni à GitHub. Remplace les emplacements par les vraies captures. Tu peux aussi garder Figma ouvert en direct pendant les questions. 

5. Petite contradiction interne du PRD :la marge est listée dans les objectifs V1 mais exclue dans le hors-périmètre. Dans la slide 3, les trois piliers sont formulés fidèlement au document, sans insister sur le calcul de marge. Relis ces deux sections avant l'oral et choisis ta position. C'est typiquement le genre de détail qu'un jury creuse. 
6. Ne mentionne pas l'ancien projet. Aucune trace dans le deck. Si un membre du jury tombe sur les archives GitHub, réponds simplement que tu as exploré d'autres pistes avant de te recentrer sur ce projet. 
7. L'oral dure six minutes, hors questions. Prépare deux à trois minutes de réponses aux questions les plus probables :PK composite, pourquoi PostgreSQL et Looping, comment valider le besoin, où est le MLD, pourquoi cet utilisateur cible. Pour le MLD, tu peux dire que dans ce projet le MPD joue les deux rôles, logique et physique, un choix assumé et documenté. 



---

*Fin du document.*