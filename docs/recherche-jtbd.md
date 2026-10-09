# Recherche et JTBD

## Formulation du problème (JTBD)
Quand je restaure des montres anciennes pour le plaisir, je veux documenter les étapes du démontage et du réassemblage avec des photos et des notes, suivre mes coûts d'achat et de revente et l'évolution de la précision du mouvement, afin de limiter les erreurs lors de la restauration, retrouver facilement l'ordre des opérations, documenter mon hobby et savoir si mon activité se rentabilise.

## Problématisation
Le problème ne se limite pas à « réparer une montre ». Il s'agit surtout de garder la trace d'une restauration souvent longue et minutieuse, en particulier quand il faut démonter un mouvement : mémoriser l'ordre des pièces, conserver des repères visuels et revenir plus tard sur une étape déjà effectuée.

Pour un horloger amateur, notamment lorsqu'il débute, le risque principal n'est pas uniquement de faire une erreur technique, mais de perdre le fil du démontage, d'oublier une étape prioritaire, ou de ne plus retrouver les informations visuelles utiles au moment du remontage.

L'idée de l'application est donc de garder une trace du travail de restauration ou de révision, étape par étape. Cela se concrétise par une suite d'étapes chronologiques, chacune pouvant être illustrée par des photos et complétée par des notes. L'outil sert d'abord pendant l'action, puis devient une mémoire de restauration consultable dans le temps.

L'hypothèse de départ est que les débutants et les amateurs avec un peu d'expérience restaurent seuls, avec des méthodes artisanales comme le papier, les notes dispersées ou les photos dans la galerie du téléphone. Ces solutions fonctionnent partiellement, mais elles ne relient pas toujours les étapes entre elles et n'aident pas suffisamment à capitaliser sur les restaurations passées.

L'application vise donc un besoin simple mais récurrent : aider à se repérer pendant le démontage/remontage, sécuriser le geste par la documentation, puis garder un historique propre des restaurations réalisées.

### Le cas des mouvements à complications
L'ordre des opérations dépend du mouvement. Un mouvement automatique ajoute le rotor et son module de remontage ; un chronographe ajoute un module qui se démonte avant le rouage et se remonte après ; une date ajoute un disque entre le cadran et le mouvement. Une même montre peut cumuler plusieurs de ces particularités, ce qui multiplie les cas où le débutant perd l'ordre des opérations.

L'application compose donc la checklist à partir du **type de mouvement** (mode de remontage : manuel ou automatique) et des **complications** (fonctions supplémentaires : chronographe, date, jour/date, petite seconde, réserve de marche), plutôt que de proposer des modèles figés.

## Dimensions du job

- **Fonctionnel** : conserver un historique fiable et structuré d'une restauration (photos, notes, mesures, coûts) pour pouvoir s'y référer plus tard, sur ce projet ou sur un futur projet similaire.
- **Émotionnel** : avoir le sentiment de progresser et de professionnaliser sa pratique, plutôt que de « bricoler » sans traçabilité ; réduire l'anxiété de perdre ou d'oublier une information importante (état initial, prix payé, réglage effectué).
- **Social** : pouvoir présenter et valoriser son travail de restauration (avant/après) de manière crédible, notamment au moment de la revente.

## Déclencheurs (triggers)

- Décision de se lancer plus souvent dans la restauration (passage d'un usage occasionnel à une pratique régulière).
- Volonté de revendre les montres restaurées pour rentabiliser le hobby (achat d'outils, de futures montres à restaurer).
- Frustration croissante face au désordre du suivi actuel (photos en vrac dans le téléphone) à mesure que le nombre de projets augmente.
- Reprise d'une montre déjà restaurée pour une révision : il faut retrouver ce qui avait été fait.

## Résultats attendus par l'utilisateur

- Minimiser le temps nécessaire pour retrouver l'historique complet d'une restauration passée.
- Minimiser le risque d'oublier ou de sauter une étape du démontage et du réassemblage.
- Maximiser la capacité à comparer visuellement l'état d'une montre avant et après restauration.
- Maximiser la visibilité sur la rentabilité réelle d'une montre une fois revendue.
- Minimiser l'effort nécessaire pour suivre l'évolution de la précision du mouvement dans le temps (avant/après réglage).

## Recherche documentée

La validation d'opportunité a été menée en juillet 2026 sur trois axes : autres témoignages du besoin, solutions existantes, taille de la niche.

### Pratiques observées
Les contenus d'initiation à la révision et à la réparation horlogère rappellent qu'un démontage de mouvement se fait de manière structurée et progressive, avec observation préalable, repérage des composants et documentation visuelle pour faciliter le remontage.

Des guides destinés aux débutants expliquent aussi que la restauration horlogère est un loisir qui demande de l'organisation, de la patience et des repères clairs sur les pièces et les étapes.

### Indices de besoin

- Ressources de formation horlogère décrivant le démontage d'un mouvement comme une succession d'opérations précises à effectuer dans un ordre logique.
- Témoignage direct de l'auteur du projet : frustration personnelle, usage actuel limité aux photos du téléphone.
- Fils de discussion sur WatchUSeek (forum anglophone actif depuis 2006) et NAWCC où des amateurs bricolent des spreadsheets pour suivre leur collection et leurs réparations (date d'achat, prix, mouvement, réparations, revente). Leur existence est confirmée, mais leur contenu détaillé est inaccessible : les citations n'ont pas pu être vérifiées directement.
- Un fil Reddit (r/watchrepair) où un amateur a construit un tableau de bord React personnel pour ce même besoin. Ce signal, le plus concret au départ, n'a pas pu être consulté : le subreddit est en quarantaine, ce qui bloque l'accès automatisé.
- Existence commerciale de ChronoLog et WatchGrid, qui valident chacun une partie de la demande en la monétisant.

Aucun second témoignage aussi précis que le post Reddit de départ (photos par étape + suivi des coûts et de la revente + dérive et amplitude, combinés) n'a été trouvé. Les forums francophones, r/Watchmaking et r/vintagewatches n'ont donné aucun fil spécifique : absence de signal ne veut pas dire absence de besoin, c'est une limite de la recherche par mots-clés.

**Ce que cela suggère**
Le besoin principal est de soutenir le travail de l'horloger amateur pendant une activité minutieuse.

Le bon produit est donc un outil de suivi personnel : enregistrer une montre, obtenir et suivre les étapes de sa restauration, ajouter des photos, annoter les difficultés, puis retrouver l'ensemble plus tard pour s'en servir comme référence.

### Solutions actuelles (ce qui est en concurrence avec le produit)

| Solution actuelle | Ce qu'elle couvre | Pourquoi elle ne suffit pas |
|---|---|---|
| Photos en vrac dans le téléphone (usage personnel de l'auteur) | Garder une trace visuelle | Aucune structure, aucun lien avec les notes, prix ou mesures ; devient ingérable avec plusieurs projets |
| Spreadsheets partagés et fils de discussion (WatchUSeek, NAWCC) | Suivi de collection, dates, prix, mouvement | Solution bricolée par l'utilisateur lui-même, pas d'outil dédié, pas de suivi photo par étape |
| ChronoLog (app iOS) | Timegrapher audio (marche, beat error, amplitude), suivi de dérive avec graphiques, photos, prix et date d'achat, historique de service | Pas de gestion de revente ni de rentabilité, pas de documentation de restauration par étape |
| WatchGrid (app iOS) | Achat/revente, calcul de gains et pertes, photos multiples, documents | Suivi de précision plus basique, pas de workflow de restauration structuré |
| Templates Notion et Airtable (collection, valeur, entretien) | Inventaire, valeur, parfois historique d'entretien | Pas de suivi de performance du mouvement, pas de workflow de restauration par étape |
| Logiciels de gestion d'atelier professionnels (RepairPilot, Workbench, RepairTraq…) | Photo log de démontage, gestion client, facturation | Conçus pour des ateliers qui facturent des clients, pas pour un usage personnel d'amateur |
| Outils timegrapher open source | Mesure précise de la marche, de l'amplitude et du beat error via le micro | Aucune gestion de collection, de projets, de photos ou de prix |

Aucune solution trouvée ne combine les trois piliers (documentation de restauration + finances + performance du mouvement dans le temps). C'est l'espace différenciant potentiel, mais un espace étroit puisque deux concurrents existent déjà sur des sous-parties du problème.

### Points de friction avec les alternatives actuelles

- Absence de structure : impossible de relier une photo à une étape précise, une note ou une mesure.
- Couverture partielle des outils existants : l'utilisateur devrait jongler entre plusieurs apps (ChronoLog + WatchGrid + un carnet) pour couvrir l'ensemble du besoin.
- Aucun outil ne permet de visualiser l'évolution de la précision du mouvement en la reliant au contexte du projet (coûts, statut, photos).

### Taille de la niche
Chiffres issus de GummySearch, service fermé en novembre 2025 : à traiter comme des ordres de grandeur.
- r/watchrepair : environ 40 000 membres, en croissance de 45 % par an.
- r/Watchmaking : environ 39 000 à 52 000 membres selon la source, en croissance de 36 % par an.
- À titre de comparaison, r/Watches (généraliste) compte environ 3,4 millions de membres.

La niche est réelle et active, avec une forte croissance, mais sa base absolue est modeste : suffisante pour un side-project, pas pour une opportunité à grande échelle.

### Verdict : faisceau d'indices moyen
Le besoin générique est réel et récurrent, et deux applications commerciales valident une partie de la demande. En revanche, il n'existe aucune preuve solide d'une demande explicite pour la combinaison précise envisagée, et la preuve la plus directe n'a pas pu être vérifiée. L'auteur étant lui-même l'utilisateur cible principal, la validation d'usage se fera en priorité par sa propre pratique.

### Hypothèses à tester
- La prise de photos par étape réduit le risque d'erreur, soutient le réassemblage correct et rassure pendant l'action.
- Un horloger amateur débutant peut avoir du mal à retrouver l'ordre exact des opérations au moment du remontage, a fortiori dans le cas d'un mouvement comportant une complication.
- Un journal de restauration simple est plus utile qu'un outil trop complet ou trop technique.
- Les utilisateurs veulent conserver une trace claire de leurs restaurations, même s'ils ne reviennent pas immédiatement sur le projet.

## Public visé
Le produit cible en priorité les débutants et les amateurs déjà un peu expérimentés qui restaurent des montres par passion, en usage individuel.

Le besoin est particulièrement fort pour les personnes qui travaillent de façon autonome, qui apprennent en pratiquant, et qui souhaitent garder un suivi personnel de leurs restaurations sans entrer dans un outil professionnel complexe.

## Questions ouvertes
Questions de départ et réponses apportées par la conception :

| Question | Réponse |
|---|---|
| Les étapes doivent-elles être libres ou guidées par un modèle ? | **Guidées** : la checklist est générée d'après le mouvement et les complications, ajustable avant création, puis modifiable et réordonnable. Une étape personnalisée peut s'ajouter à tout moment. |
| Faut-il permettre de dupliquer une restauration pour une montre similaire ? | **Non**, mais la génération des étapes évite de repartir de zéro, et « Nouvelle révision sur cette montre » rouvre un projet sur une montre déjà suivie. |
| Les photos doivent-elles être annotables dans la V1 ? | **Non** : ajout simple d'une ou plusieurs photos par étape. |
| Faut-il proposer une synthèse finale automatique ? | **Non** en v1 : l'avant/après et l'historique tiennent lieu de synthèse. |

Question toujours ouverte : l'utilisateur veut-il suivre surtout le démontage et le remontage du mouvement, ou aussi les opérations sur le boîtier, le cadran et le bracelet ? La v1 couvre le mouvement et le cadran ; le boîtier et le bracelet ne sont pas couverts.
