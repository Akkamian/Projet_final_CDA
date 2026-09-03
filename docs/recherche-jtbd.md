# Recherche et JTBD

## Formulation du problème (JTBD)
Quand je restaure des montre ancienne pour le plaisir, je veux documenter les étape du démontage et du réassemblage avec des photos et des notes, suivre mes coûts d'achat/revente et l'évolution de la précision du mouvement afin de limiter les erreurs lors de la restauration, retrouver facilement l’ordre des opérations et documenter mon hobby.

## Problématisation
Le problème ne se limite pas à “réparer une montre”. Il s’agit surtout de garder la trace d’une restauration souvent longue et minutieuse en particulier quand il faut démonter un mouvement (mémoriser l’ordre des pièces, conserver des repères visuels et revenir plus tard sur une étape déjà effectuée).

Pour un horloger amateur, notamment lorsqu'il débute, le risque principal n’est pas uniquement de faire une erreur technique, mais de perdre le fil du démontage, d’oublier une étape prioritaire dans le démontage notamment ou de ne plus retrouver les informations visuelles utiles au moment du remontage.

L’idée de l’application est donc de garder une trace du travail de restauration ou de révision, étape par étape. Cela se concrétise par une suite d’étapes chronologiques, chacune pouvant être illustrée par des photos validée et complétée par des notes. L’outil sert d’abord pendant l’action, puis devient une mémoire de restauration consultable dans le temps.

L’hypothèse de départ est que les débutants et les amateurs avec un peu d'experience restaurent seuls, avec des méthodes artisanales comme le papier, les notes dispersées ou les photos dans la galerie du téléphone. Ces solutions fonctionnent partiellement, mais elles ne relient pas toujours les étapes entre elles et n’aident pas suffisamment à capitaliser sur les restaurations passées.

L’application viserait donc un besoin simple mais récurrent : aider à se repérer pendant le démontage/remontage, sécuriser le geste par la documentation, puis garder un historique propre des restaurations réalisées.

## Dimensions du job

- **Fonctionnel** : conserver un historique fiable et structuré d'une restauration (photos, notes, mesures, coûts) pour pouvoir s'y référer plus tard (sur ce projet ou sur un futur projet similaire).
- **Émotionnel** : avoir le sentiment de progresser et de professionnaliser sa pratique, plutôt que de "bricoler" sans traçabilité ; réduire l'anxiété de perdre ou d'oublier une information importante (état initial, prix payé, réglage effectué).
- **Social** : pouvoir présenter/valoriser son travail de restauration (avant/après) de manière crédible, notamment au moment de la revente.

## Déclencheurs (triggers)

- Décision de se lancer plus souvent dans la restauration (passage d'un usage occasionnel à une pratique régulière).
- Volonté de revendre les montres restaurées pour rentabiliser le hobby (achat d'outils, de futures montres à restaurer).
- Frustration croissante face au désordre du suivi actuel (photos en vrac dans le téléphone) à mesure que le nombre de projets augmente.

## Recherche documentée

### Pratiques observées
Les contenus d’initiation à la révision/réparation horlogère rappellent qu’un démontage de mouvement se fait de manière structurée et progressive, avec observation préalable, repérage des composants et documentation visuelle pour faciliter le remontage.

Des guides destinés aux débutants expliquent aussi que la restauration horlogère est un loisir qui demande de l’organisation, de la patience et des repères clairs sur les pièces et les étapes.

### Indices de besoin

- Ressources de formation horlogère décrivant le démontage et le désassemblage d’un mouvement comme une succession d’opérations précises à effectuer dans un ordre logique.
- Témoignage direct de l'auteur du projet (frustration personnelle, usage actuel limité aux photos du téléphone).
- Fils de discussion identifiés sur WatchUSeek et NAWCC où des amateurs bricolent des spreadsheets pour ce même besoin.
- Existence commerciale de ChronoLog et WatchGrid, qui valident chacun une partie de la demande en la monétisant.

**Ce que cela suggère**
Le besoin principal est de soutenir le travail de l’horloger amateur pendant une activité minutieuse.

Le bon produit est donc un outil de suivi personnel : créer une restauration, enregistrer des étapes, ajouter des photos, annoter les difficultés, puis retrouver l’ensemble plus tard pour s’en servir comme référence.

### Solutions actuelles ("ce qui est en concurrence avec le produit")

| Solution actuelle | Ce qu'elle couvre | Pourquoi elle ne suffit pas |
|---|---|---|
| Photos en vrac dans le téléphone (usage personnel de l'auteur) | Garder une trace visuelle | Aucune structure, aucun lien avec les notes, prix ou mesures ; devient ingérable avec plusieurs projets |
| Spreadsheets partagés / fils de discussion (WatchUSeek, NAWCC) | Suivi de collection, dates, prix, mouvement | Solution bricolée par l'utilisateur lui-même, pas d'outil dédié, pas de suivi photo par étape |
| ChronoLog (app iOS) | Précision du mouvement (beat error, amplitude, dérive), photos, prix/date d'achat | Pas de gestion de revente/rentabilité, pas de documentation de restauration par étape |
| WatchGrid (app iOS) | Achat/revente, calcul de gains/pertes, photos, documents | Suivi de précision plus basique, pas de workflow de restauration structuré |

Aucune solution existante ne combine les trois piliers (documentation de restauration + finances + performance du mouvement dans le temps).

### Points de friction avec les alternatives actuelles

- Absence de structure : impossible de relier une photo à une étape précise, une note ou une mesure.
- Couverture partielle des outils existants : l'utilisateur devrait jongler entre plusieurs apps (ChronoLog + WatchGrid + un carnet quelconque) pour couvrir l'ensemble du besoin.
- Aucun outil ne permet de visualiser l'évolution de la précision du mouvement en la reliant au contexte du projet (coûts, statut, photos).
### Hypothèses à tester
- La prise de photos par étape réduit le risque d’erreur, soutien le réassemblage correct, et rassure pendant l’action.
- Un horloger amateur qui débute peu avoir du mal à retrouver l’ordre exact des opérations au moment du remontage (à fortiori dans le cas d'un mouvement comportant une complication particulière).
- Un journal de restauration simple est plus utile qu’un outil trop complet ou trop technique.
- Les utilisateurs veulent conserver une trace claire de leurs restaurations, même s’ils ne reviennent pas immédiatement sur le projet.

## Public visé
Le produit cible en priorité les débutants et les amateurs déjà un peu expérimentés qui restaurent des montres par passion, en usage individuel.

Le besoin est particulièrement fort pour les personnes qui travaillent de façon autonome, qui apprennent en pratiquant, et qui souhaitent garder un suivi personnel de leurs restaurations sans entrer dans un outil professionnel complexe.

## Questions ouvertes
- L’utilisateur veut-il suivre surtout le démontage et le remontage du mouvement, ou aussi les opérations sur le boîtier, le cadran et le bracelet ?
- Les étapes doivent-elles être entièrement libres ou guidées par un modèle de restauration ?
- Faut-il permettre de dupliquer une restauration pour une montre similaire ?
- Les photos doivent-elles être simples à joindre, ou aussi annotables dans la V1 ?
- Faut-il proposer une synthèse finale automatique de la restauration ?