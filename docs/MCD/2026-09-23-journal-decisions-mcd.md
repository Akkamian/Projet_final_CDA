# Journal de décisions — Évolution du MCD

**Date :** 2026-09-23 (complété le 2026-10-07 : Q23 à Q32, issues du recensement des règles de gestion)
**Résultat :** spec `docs/MCD/2026-09-23-mcd-montre-complications-design.md` ; règles de gestion `docs/REGLES-GESTION.md`

Ce document retrace le raisonnement qui a conduit au MCD actuel : les questions posées, les options envisagées, leurs pour et contre, et le choix retenu. Il sert de support pour justifier les choix de modélisation en soutenance.

---

## Point de départ

Le MCD initial (2026-07-02) reposait sur `PROJECT` (une montre = un projet) et sur des modèles de checklist figés (`CHECKLIST_TEMPLATE` → `CHECKLIST_TEMPLATE_STEP`) choisis selon le type de mouvement, stocké en texte libre sur le projet.

Deux envies ont lancé la réflexion :
1. faire figurer **au moins une association many-to-many**, pour présenter au jury un MCD qui couvre les différents types de relations — à condition qu'elle réponde à un vrai besoin ;
2. **générer automatiquement** les étapes de restauration, dans un ordre proposé, à partir du type de mouvement **et** des complications de la montre.

---

## Q1 — Quelle association many-to-many ?

| Option | Pour | Contre |
|---|---|---|
| **Statut** en N-N avec le projet | Entité simple | Un projet n'a qu'un statut à la fois : la N-N serait artificielle. Elle n'aurait de sens que pour un historique des statuts, dont on n'a pas besoin. |
| **Complication** en N-N | Besoin réel : une montre cumule plusieurs complications (chronographe + date), une complication se retrouve sur de nombreuses montres. Sert directement la génération des étapes. | Oblige à revoir la génération des étapes (voir Q3). |

**Choix :** Complication. Le statut reste un simple attribut énuméré.

## Q2 — « Chronographe » est-il un type de mouvement ?

La spec initiale le rangeait parmi les types de mouvement. C'est une confusion : le **type de mouvement** décrit le mode de remontage ou d'alimentation (manuel, automatique, quartz) ; une **complication** est une fonction supplémentaire (chronographe, date…).

**Choix :** le chronographe devient une complication. `MOVEMENT_TYPE` devient une entité de référence (manuel, automatique), et n'est plus un texte libre.

## Q3 — Que devient `CHECKLIST_TEMPLATE` ?

Avec la génération à partir du mouvement et des complications, l'utilisateur ne choisit plus un modèle figé : la checklist est **composée**. L'entité « modèle » n'a plus de raison d'être.

**Choix :** suppression de `CHECKLIST_TEMPLATE`. Une bibliothèque d'étapes types (`TEMPLATE_STEP`) est rattachée soit à un type de mouvement, soit à une complication.

## Q4 — Comment ordonner des étapes issues de plusieurs sources ?

Les étapes d'une complication ne s'ajoutent pas simplement à la fin : le mécanisme de chronographe se démonte *avant* le rouage et se remonte *après*. Il faut pouvoir **intercaler**.

| Option | Pour | Contre |
|---|---|---|
| **`step_order` sur une échelle commune espacée** (100, 200… ; 380 pour s'intercaler) | Simple, une seule colonne, le tri suffit | L'échelle commune est une convention de saisie, non garantie par la base |
| Entité **PHASE** (démontage, nettoyage, remontage, réglage) + ordre dans la phase | Plus parlant métier | Une entité et une jointure de plus pour un gain limité |

**Choix :** `step_order` espacé. Ordre de départage en cas d'égalité : étapes de mouvement d'abord, puis code de complication.

## Q5 — Les étapes d'une complication dépendent-elles du type de mouvement ?

Si c'était le cas, une étape devrait dépendre d'un **couple** (mouvement, complication), ce qui complique fortement le modèle.

**Choix :** non. Les étapes d'une complication sont identiques quel que soit le type de mouvement. Le **quartz est hors périmètre** v1 (c'est surtout là que la question se poserait : un chronographe quartz n'a rien à voir avec un chronographe mécanique).

## Q6 — Que se passe-t-il si l'on modifie les complications après la création ?

| Option | Pour | Contre |
|---|---|---|
| **A — Étapes générées une seule fois** ; ajustements par étapes personnalisées | Simple, aucun impact sur le MCD, cohérent avec le YAGNI et l'éco-conception | Pas de resynchronisation automatique |
| B — Ajouter ou retirer une complication ajoute ou retire ses étapes | Plus riche fonctionnellement | Oblige à tracer l'origine de chaque étape (`RESTORATION_STEP` → `TEMPLATE_STEP`) et à gérer la synchronisation |

**Choix :** A pour la v1. B reste une évolution possible.

## Q7 — Faut-il une entité MONTRE ?

**Constat :** un horloger peut réviser ou restaurer à nouveau une montre qu'il a gardée. Avec le modèle initial, il faudrait créer un nouveau projet, tout ressaisir, sans lien entre les deux.

**Arguments pour :**
- **Normalisation :** le type de mouvement, les complications, l'achat et la revente décrivent la montre et sa possession, pas une intervention. Les laisser sur `RESTORATION_PROJECT` les dupliquerait à chaque intervention.
- La N-N « comporte » a plus de sens sur la montre que sur le projet.
- Corriger les complications d'une montre n'affecte pas les étapes déjà copiées (cohérent avec Q6-A).
- Prépare la v2 (fiches par calibre de mouvement).
- Coût faible : aucun code n'est encore écrit.

**Contre / conséquences :**
- Le modèle financier change : **marge calculée par montre** (revente − achat − coûts de toutes ses interventions).
- « Vendu » n'est plus un statut de projet : l'état vendu se déduit de la date de revente de la montre.
- Le tableau de bord liste des montres et non plus des projets.

**Piège évité :** ajouter MONTRE en gardant l'achat et la revente sur le projet, ce qui aurait donné deux prix d'achat pour une même montre.

**Choix :** entité `WATCH` ajoutée. `RESTORATION_PROJECT` représente une intervention sur une montre. Une montre et son premier projet se créent en une fois ; un nouveau projet sur une montre existante regénère les étapes sans rien ressaisir (parcours précisé en Q15).

## Q8 — Faut-il un type d'intervention (restauration / révision) ?

**Choix :** non, pas utile en v1 (YAGNI).

## Q9 — Un mouvement automatique, n'est-ce pas « un manuel + une complication » ?

**Intuition :** en termes d'étapes, un automatique = un manuel + quelques étapes (masse oscillante ou bumper, pont d'automatique, roues d'inversion). On pourrait donc modéliser l'automatique comme une complication.

**Contre :**
- Le vocabulaire horloger ne le range pas ainsi : une complication est une fonction affichée en plus des heures, minutes et secondes ; l'automatique est un **système de remontage**. La fiche montre afficherait « Complications : automatique, date », ce qu'aucun collectionneur n'écrirait.
- On perdrait l'entité `MOVEMENT_TYPE` et sa relation 1-N.
- Le quartz obligerait à réintroduire le type de mouvement.

**Choix :** l'automatique reste un type de mouvement. En revanche, l'intuition soulève une vraie question de **duplication** des étapes communes entre manuel et automatique, traitée en Q10 et Q11.

## Q10 — Une « base commune » pour éviter la duplication ?

**Idée :** une étape sans type de mouvement ni complication (les deux NULL) serait une étape commune à tous ; le manuel n'aurait alors aucune étape propre, l'automatique seulement les siennes.

**Contre (rejetée) :**
- `NULL` y prend un **sens caché** (« s'applique à tous ») : une convention invisible dans le modèle, peu lisible.
- La base commune suppose que toutes les montres sont mécaniques : **l'arrivée du quartz la casse**.

## Q11 — Deux entités distinctes : `MOVEMENT_STEP` et `COMPLICATION_STEP` ?

**Idée :** une étape de mouvement est reliée en **N-N** aux types auxquels elle s'applique (« Nettoyage » ↔ manuel et automatique) ; une étape de complication appartient à une seule complication (1,1).

**Pour :**
- En Merise, une entité se définit aussi par ses **associations** : les deux types d'étapes ont des cardinalités différentes, donc des règles d'existence différentes.
- Des colonnes identiques ne font pas un concept identique (exemple classique : CLIENT et FOURNISSEUR).
- Pas de NULL, pas de `CHECK` : la structure interdit par construction une étape rattachée à rien ou aux deux.
- Pas de duplication de lignes, quartz possible, une deuxième N-N justifiée.

**Contre :**
- Colonnes répétées (`step_order`, `label`, `step_description`) : l'objection « pourquoi dupliquer ? » est attendue.
- La génération lit deux tables (union).
- Le `step_order` commun devient une convention partagée entre deux tables.
- Référencer « une étape type » quel que soit son type (si l'option B de Q6 revient) nécessiterait deux clés étrangères nullables.

## Q12 — L'héritage (généralisation / spécialisation Merise 2)

**Idée :** une entité mère `ÉTAPE_TYPE` porte les attributs communs ; deux sous-types, `ÉTAPE_MOUVEMENT` et `ÉTAPE_COMPLICATION`, portent chacun leurs associations, avec une **contrainte de partition XT** (exclusion + totalité). La question de la duplication disparaît au niveau conceptuel.

Au passage au MPD, trois traductions possibles :

| Stratégie | Conséquence |
|---|---|
| Table unique + discriminant / clés étrangères exclusives | NULL sur les clés étrangères, contrainte `CHECK` |
| Table mère + tables filles | Pas de duplication, jointure à chaque lecture ; utile si l'on doit référencer « une étape type » |
| Une table par sous-type | Pas de NULL ni de jointure, colonnes répétées |

**Pour :** point fort de modélisation (héritage, contrainte de partition, choix de traduction argumenté).
**Contre :** plus d'effort (Mermaid `erDiagram` ne sait pas dessiner l'héritage, il faut un outil comme Looping ; génération sur deux tables).

## Q13 — Choix final : table unique avec exclusivité (V1)

| | V1 — table unique XOR | Base commune (Q10) | Héritage, une table par sous-type (Q11/Q12) |
|---|---|---|---|
| Colonnes dupliquées | non | non | oui |
| Lignes dupliquées | oui (étapes communes, données de référence) | non | non |
| NULL chargé de sens | non | **oui** | pas de NULL |
| Quartz possible sans refonte | oui | **non** | oui |
| Garantie apportée par | `CHECK` | `CHECK` | la structure |
| Simplicité (explication et code) | ★★★ | ★★★ | ★★ |
| Démonstration jury | contrainte inter-associations XT | faible | héritage + choix de traduction |

**Choix retenu :** une table `TEMPLATE_STEP` rattachée **soit** à un type de mouvement, **soit** à une complication — exactement un des deux (contrainte d'exclusivité, traduite en `CHECK ((movement_code IS NULL) <> (complication_code IS NULL))`). Chaque type de mouvement possède sa liste d'étapes complète.

**Justification :**
- **Construction Merise standard :** deux associations (0,1), « définit » et « ajoute », reliées par une contrainte inter-associations d'exclusion et de totalité.
- **NULL garde son sens habituel** (« non concerné par cette association »), sans convention cachée.
- **Ouvert au quartz :** un nouveau type et sa propre liste.
- **Simplicité :** une table, une requête de génération.
- **La duplication de lignes est assumée :** elle ne concerne que des **données de référence** (seed, lecture seule, une dizaine de lignes rarement modifiées) ; elle ne crée aucun risque d'incohérence sur les données utilisateur, puisque les étapes sont **copiées** dans `RESTORATION_STEP` à la création ; et chaque liste peut s'affiner indépendamment (le « nettoyage » d'un automatique n'a pas à être identique à celui d'un manuel).
- **Lien avec l'héritage :** cette table unique à clés étrangères exclusives est l'une des traductions possibles d'une spécialisation. L'héritage a été étudié ; il a été écarté au profit de la simplicité, parce que rien, en v1, ne justifie son coût supplémentaire.

## Q14 — Où mène la carte d'une montre sur le tableau de bord ?

| Option | Pour | Contre |
|---|---|---|
| Vers la fiche montre, puis le projet | Montre l'historique d'emblée | Un clic de plus dans le cas le plus fréquent (une montre = un seul projet) |
| **Directement vers le projet le plus récent**, avec un lien « Fiche montre · historique » en en-tête | Parcours inchangé par rapport aux maquettes existantes, l'historique reste à un clic | La fiche montre est un peu moins visible |

**Choix :** la carte ouvre le projet le plus récent. *(Révisé en Q17 : la fiche montre et le détail projet fusionnent.)*

## Q15 — Comment créer un projet sur une montre qui existe déjà ?

**Constat :** avec un seul bouton « + Nouvelle montre » et une carte qui ouvre le projet, le bouton « Nouvelle intervention » de la fiche montre serait peu découvrable ; l'utilisateur risquerait de recréer la montre.

**Choix :** un **point d'entrée unique « + Nouveau projet »**, en deux temps : (1) quelle montre ? — existante (montres non vendues) ou nouvelle ; (2) étapes proposées, ajustables. Aucune route backend supplémentaire : le formulaire appelle `POST /watches` (nouvelle montre) ou `POST /watches/:id/projects` (montre existante). La fiche montre garde un raccourci « + Nouveau projet » avec la montre pré-sélectionnée. *(Affiné en Q17 : le formulaire s'ouvre sur « Nouvelle montre », la montre existante devient un lien secondaire.)*

**En UML :** « Créer un projet » *inclut* « Générer et ajuster les étapes » ; « Créer une nouvelle montre » *étend* « Créer un projet ».

**Vocabulaire :** « projet » dans l'interface, « intervention » dans la conception (c'est ce qu'est un `RESTORATION_PROJECT` dans le MCD).

## Q16 — Statut « À restaurer » et calibre

- **« À restaurer »** figurait dans la spec d'origine et les maquettes, mais pas dans les plans. **Choix :** abandonné — statuts « En cours » / « Terminé » pour un projet, « Vendue » pour une montre.
- **Calibre** affiché dans les maquettes sans exister dans le MCD. **Choix :** pas d'attribut dédié ; l'utilisateur l'inclut dans le modèle (`brand` = « Seiko », `model` = « 6119-8100 »). Les fiches calibre restent en backlog v2.

## Q17 — Deux écrans (fiche montre + détail projet) ou un seul ?

**Constat (2026-09-25) :** avec une fiche montre et un détail projet séparés, la rubrique Finances se retrouve répartie sur deux pages proches. C'est déroutant à la première utilisation et ça complique la navigation, alors que le cas le plus courant de la cible est **une montre → une restauration ou révision → revente**. L'interface calquait la structure des tables (une entité = un écran) au lieu de suivre la fréquence des usages.

| Option | Pour | Contre |
|---|---|---|
| Deux écrans (fiche montre, détail projet) | Reflète directement le MCD | Finances sur deux pages ; distinction montre/projet imposée même quand elle n'apporte rien |
| **Un seul écran, divulgation progressive** | Cas courant identique au détail projet maquetté à l'origine ; une seule rubrique Finances, à un seul endroit ; l'historique n'apparaît que s'il existe | Écran un peu plus riche dans le cas ≥ 2 projets (sélecteur de projet) |

**Choix :** un seul écran « détail » (`/watches/:id`, projet le plus récent par défaut).
- **1 projet :** en-tête de la montre, checklist, performances, Finances complètes (achat, coûts, revente, marge), avant/après — aucune notion de « fiche montre » ni d'historique visible.
- **≥ 2 projets :** même écran + un sélecteur de projet ; checklist, performances et avant/après suivent le projet choisi ; les Finances restent au niveau montre, au même endroit (coûts regroupés par projet).
- **« Nouvelle révision sur cette montre »** : discrète tant qu'un projet est en cours, mise en avant quand le projet le plus récent est terminé et la montre non vendue.
- **Création :** « + Nouveau projet » s'ouvre sur « Nouvelle montre » (cas courant) ; « Sur une montre déjà suivie ? » est un lien secondaire.

**Argument de soutenance :** le MCD reste normalisé (montre 1-N projets, finances portées par la montre) ; c'est la couche de présentation qui s'adapte à l'usage. Modèle de données et modèle d'interface n'ont pas à être calqués l'un sur l'autre.

## Q18 — Quels identifiants : UUID ou entier auto-généré ?

**Constat (2026-10-06) :** la spec prévoyait des clés `uuid`. PostgreSQL propose `INTEGER GENERATED ALWAYS AS IDENTITY` (norme SQL, remplaçant de `SERIAL`).

| Option | Pour | Contre |
|---|---|---|
| `UUID` | Non devinable dans les URLs (défense en profondeur contre l'IDOR) ; génération possible côté client ; fusion de bases sans conflit | 16 octets : index et clés étrangères plus lourds ; avec `gen_random_uuid()`, insertions dispersées dans l'index |
| **`INTEGER … IDENTITY`** | 4 octets : index et jointures plus légers, insertions en fin d'index ; lisible ; cohérent avec l'éco-conception | Ids devinables (`/watches/12`) : le contrôle d'accès côté backend est la seule protection (il est de toute façon obligatoire) |

**Choix :** identity partout pour les tables de données (`GENERATED ALWAYS`, pas d'id explicite dans les `INSERT`). Les deux tables de référence `MOVEMENT_TYPE` et `COMPLICATION` ont pour clé primaire leur **code métier** (stable, alimenté par le seed), et `movement_code` est un `ENUM` PostgreSQL : le quartz s'ajoutera par une migration `ALTER TYPE … ADD VALUE`, sans réécrire de contrainte.

**Conséquence :** le test d'autorisation (accès à la montre d'un autre utilisateur refusé) est le garde-fou central contre l'IDOR, plus encore qu'avec des UUID.

## Q19 — Ajustements du modèle financier et du compte

**Constat (2026-10-06) :** trois attributs revus au passage du MCD au LDD.

| Sujet | Choix | Raison |
|---|---|---|
| `EXPENSE.type` (pièce / consommable) | **Supprimé** | Aucune fonctionnalité v1 n'exploite la distinction ; c'est une saisie de plus pour l'utilisateur (YAGNI). Réintroductible plus tard par migration. |
| `WATCH.purchase_price` / `purchase_date` | **Facultatifs** | Une montre conservée de longue date peut n'avoir ni prix ni date d'achat connus. Conséquence : la marge n'est pas calculable si le prix d'achat est inconnu (règle ajoutée à la spec et aux tests). |
| `USER.password_changed_at` | **Conservé** | Les jetons de vérification d'email et de réinitialisation sont des JWT sans état, dont la validité dépend de `email_verified_at` / `password_changed_at` : usage unique garanti sans table de jetons. |

**Rappel de méthode :** le MCD identifie les entités par des propriétés métier (parfois par identification relative, ex. une mesure = projet + date de mesure) ; les identifiants techniques `INTEGER GENERATED ALWAYS AS IDENTITY` ne sont ajoutés qu'au passage au MLD/MPD (voir Q18).

## Q20 — Un libellé d'étape peut-il se répéter dans une même liste ?

**Constat (2026-10-06) :** la XT (Q13) garantit qu'une étape type a exactement une origine, et les `UNIQUE` sur le rang évitent deux étapes au même rang. Rien n'empêchait encore deux étapes de même libellé dans la liste d'un même mouvement ou d'une même complication.

**Choix :** `UNIQUE (movement_code, label)` et `UNIQUE (complication_code, label)` sur `template_steps`. Les lignes à `NULL` ne se comparent pas en PostgreSQL : chaque contrainte ne vise que les étapes de sa propre origine.

**Écarté :** `UNIQUE (label)` global, trop strict : un même geste (« Nettoyer le mécanisme ») peut légitimement figurer dans deux listes. Les doublons entre listes relèvent de la rigueur du seed et de la règle de génération.

## Q21 — Peut-on réordonner les étapes d'un projet après sa création ?

**Constat (2026-10-06) :** l'aperçu des étapes est ajustable (ajout, suppression, réordonnancement) avant la création du projet, mais rien n'était prévu une fois le projet créé. Or un démontage réel s'écarte souvent de l'ordre type : l'utilisateur déplace une étape après coup.

| Option | Pour | Contre |
|---|---|---|
| Ordre figé après création | Aucun développement | Le journal ne reflète plus l'ordre réellement suivi ; contournement par suppression et recréation, qui fait perdre notes et photos |
| **Réordonnancement possible à tout moment** | Le journal reste fidèle au geste réel ; notes et photos suivent l'étape (elles sont rattachées à son `id`) | Une opération d'écriture de plus |

**Choix :** réordonnancement en v1. Aucun changement de schéma : `restoration_steps.step_order` n'a pas de contrainte d'unicité sur `(project_id, step_order)`, donc la renumérotation 1, 2, 3… d'un projet se fait en une seule écriture atomique, sans état transitoire conflictuel. Il reste à l'ajouter au plan « checklists et étapes ».

## Q22 — Contenu et granularité du référentiel d'étapes

**Constat (2026-10-06) :** le seed du plan « backend » comptait 10 étapes de base, très grossières, contre 20 à 26 dans le document de parcours d'origine. À ce niveau de détail, la checklist n'aide pas vraiment un débutant à ne pas perdre le fil.

**Choix :**
- **Granularité** : environ 20 étapes de base (22 pour un mouvement manuel, 24 pour un automatique), complications en plus.
- **Module automatique** : déposé avant les aiguilles et le cadran (rang 250), reposé avant le cadran (rang 1770). Avant ou après est équivalent sur le plan horloger ; ce parti pris est ajustable dans l'aperçu.
- **Complications seedées** : chronographe, date, jour/date, petite seconde, réserve de marche. GMT, présent dans le tout premier jet du seed, est abandonné.
- **Étapes ajoutées** par rapport au document d'origine : « Contrôler, trier et nettoyer », « Lubrifier » et « Régler et mesurer la marche », qui relient la checklist au suivi des performances.
- **Symétrie** : chaque dépose d'une complication a son pendant en remontage, dans l'ordre inverse.
- **Source unique** : `db/seed_reference_data.sql` (dépôt du projet) et le document `Etapes-desassemblage-reassemblage.md`.

## Q23 — Les étapes doivent-elles être validées dans un ordre imposé ?

**Constat (2026-10-07) :** le recensement des règles de gestion a relevé une contradiction : les spécifications parlaient de « valider les étapes dans l'ordre », alors que le scénario de validation n'imposait rien et que le réordonnancement est possible à tout moment (Q21).

| Option | Pour | Contre |
|---|---|---|
| **Ordre libre** | Cohérent avec le réordonnancement et avec un démontage réel qui s'écarte de l'ordre type ; aucune règle de plus | Rien n'empêche de sauter une étape par inadvertance |
| Ordre imposé (seule la première étape non terminée est validable) | Protège contre l'oubli d'une étape | Bloque l'utilisateur dès qu'il fait autrement ; complique le cas d'une étape sautée volontairement |

**Choix :** ordre libre. La formulation « dans l'ordre » est retirée des spécifications ; la checklist reste une aide de suivi, pas un déroulé imposé.

## Q24 — Une montre peut-elle avoir plusieurs projets « en cours » ?

**Constat (2026-10-07) :** rien ne l'interdisait. Pourtant, le tableau de bord ne montre que le projet le plus récent, « Nouvelle révision » suppose que le projet le plus récent est terminé, et la revente est refusée tant qu'un projet est en cours.

| Option | Pour | Contre |
|---|---|---|
| **Un seul projet en cours par montre** | Cohérent avec le tableau de bord, la revente et le parcours « Nouvelle révision » ; aucun projet en cours masqué par un plus récent | Une règle de plus |
| Plusieurs autorisés | Aucune règle à ajouter | Le « projet le plus récent » peut cacher un projet encore en cours |

**Choix :** un seul projet en cours, garanti **par la base** : index unique partiel `ON restoration_projects (watch_id) WHERE status = 'in_progress'`.

**Pourquoi par la base et non par le seul service :** un contrôle applicatif (« existe-t-il déjà un projet en cours ? ») puis une insertion peuvent être contournés par deux requêtes simultanées ; l'index les départage. Le service garde un contrôle explicite pour renvoyer un message clair.

**Conséquence :** comme le XOR (Q13), cette contrainte n'est pas exprimable dans le schéma Prisma : elle passe par une migration SQL manuelle. Elle a été vérifiée sur un PostgreSQL jetable : un second projet en cours est refusé, plusieurs projets terminés restent permis.

## Q25 — Peut-on rouvrir un projet terminé, et sur une montre vendue ?

**Constat (2026-10-07) :** un projet terminé trop tôt, ou une mesure finale à ajouter, sont des situations courantes. La question se pose aussi pour une montre vendue dont l'acheteur demande une révision.

| Option | Pour | Contre |
|---|---|---|
| Projet terminé figé | Protège le journal | Empêche d'ajouter la photo finale ou une dernière mesure sans contournement |
| Modifiable, sans réouverture | Simple | Un projet terminé par erreur reste terminé |
| **Modifiable et réouvrable** | Corrige l'erreur sans contournement | Une règle, un scénario et des tests de plus |

**Choix :** modifiable et réouvrable. La réouverture efface `completed_at` ; elle est refusée si un autre projet est en cours (Q24).

**Montre vendue :** réouverture et ouverture de projet **refusées en v1** ; la revente peut d'abord être annulée. La marge se calcule en additionnant les coûts de **tous** les projets de la montre (Q7) : une intervention après la vente ajouterait des coûts sans recette et fausserait la marge d'une vente déjà conclue.

**Piste ultérieure :** permettre une intervention sur une montre vendue en créant une entité « prestation » portant le montant facturé à l'acheteur. Elle ajouterait une recette et corrigerait ce déséquilibre. Reportée : hors périmètre v1.

## Q26 — Quelles corrections et suppressions admet-on en v1 ?

**Constat (2026-10-07) :** le plan initial ne prévoyait que des ajouts : aucune route pour décocher une étape, supprimer une étape d'un projet existant, corriger une revente, modifier ou supprimer un coût, une mesure ou une photo, ni supprimer un projet ou une montre. Le journal (Q21) évoquait même une « suppression et recréation » d'étapes qui n'existait pas.

| Option | Pour | Contre |
|---|---|---|
| Hors périmètre v1 | Reste simple | Une faute de frappe sur un coût ou une revente est irréparable |
| Corrections légères (décocher, corriger la revente) | Couvre les erreurs les plus probables | Frontière arbitraire |
| **Corrections et suppressions complètes** | Journal et finances corrigeables ; outil utilisable au quotidien | Une dizaine de routes, de scénarios et de tests en plus |

**Choix :** corrections et suppressions complètes, y compris la suppression d'un **projet** et d'une **montre**. « Modifier une photo » signifie remplacer ou retirer ; une photo d'étape se supprime et se rajoute.

**Conséquences prises en compte :**
- **Montre sans projet :** après suppression de son dernier projet, une montre reste visible (statut « Sans projet », sans miniature) et peut recevoir un nouveau projet si elle n'est pas vendue.
- **Marge :** calculée à la lecture (Q7), donc recalculée après toute suppression de coût ou de projet ; aucune donnée dérivée à corriger.
- **Cascade :** les clés étrangères `ON DELETE CASCADE` existaient déjà ; le service doit en plus effacer les fichiers photos du stockage, que la base ne connaît pas. Cascade vérifiée sur un PostgreSQL jetable.
- **Confirmation :** les suppressions sont définitives, elles demandent donc une confirmation explicite.

## Q27 — Contraintes de valeur : en base ou dans le code ?

**Constat (2026-10-07) :** le scénario de mesure refuse un beat error ou une amplitude négatifs, mais le script SQL n'avait aucune contrainte sur ces colonnes, contrairement aux coûts et aux prix. Les dates, elles, n'étaient pas contrôlées.

| Option | Pour | Contre |
|---|---|---|
| Validation applicative seule | Un seul endroit à écrire | Une erreur de code ou un accès direct à la base contourne la règle |
| **`CHECK` en base pour ce qui est déterministe, validation applicative en plus** | Garantie indépendante du code ; cohérent avec les coûts et les prix | Deux endroits à maintenir |

**Choix :**
- `CHECK (beat_error_ms >= 0)` et `CHECK (amplitude_degrees >= 0)`. La marche reste libre : une valeur négative signifie que la montre retarde.
- `CHECK (resale_date >= purchase_date)` : sans effet si l'une des deux dates est inconnue, puisque `NULL` ne fait pas échouer un `CHECK`.
- **Dates futures refusées par l'application seulement** : PostgreSQL attend d'une contrainte `CHECK` une expression qui ne change pas avec le temps ; une comparaison avec la date du jour n'en est pas une.
- **Longueurs :** 255 caractères pour tous les champs texte courts, notes sans limite, pour aligner la validation sur le `VARCHAR(255)` de la base. Le plafond de 200 d'un ancien plan est abandonné.

## Q28 — Adresse email : normalisation et refus d'une adresse déjà utilisée

**Constat (2026-10-07) :** l'adresse n'était pas normalisée (`Jean@x.fr` et `jean@x.fr` auraient été deux comptes). Et l'inscription répond « adresse déjà utilisée », ce qui révèle l'existence d'un compte, alors que la réinitialisation et le renvoi du lien répondent toujours de la même façon (anti-énumération).

| Option | Pour | Contre |
|---|---|---|
| **Normaliser + refus explicite** | Message clair pour l'utilisateur qui a déjà un compte ; peu de code | Divulgue l'existence d'un compte à l'inscription |
| Normaliser + réponse neutre | Aucune divulgation | Plus de code (email au compte existant) et parcours moins clair |
| Ne rien changer | Rien à faire | Comptes en double selon la casse |

**Choix :** adresse enregistrée en minuscules, sans espaces superflus ; refus explicite à l'inscription, assumé comme **exception** à l'anti-énumération. Le risque est faible pour un outil personnel, et l'inscription est la seule route concernée.

## Q29 — Comment limiter les tentatives répétées ?

**Constat (2026-10-07) :** aucune protection contre les essais répétés de mot de passe, ni contre l'envoi massif d'emails de réinitialisation ou de vérification.

| Option | Pour | Contre |
|---|---|---|
| Hors périmètre v1 | Rien à développer | Connexion exposée à la force brute ; envoi d'emails sans plafond |
| **Limitation de débit par adresse IP sur trois routes** (connexion, mot de passe oublié, renvoi du lien) | Peu de code ; protège les routes réellement sensibles | Une adresse IP partagée (réseau d'entreprise) peut bloquer un utilisateur légitime |

**Choix :** limitation de débit sur ces trois routes seulement. La valeur du plafond est un paramètre de configuration, à fixer à l'implémentation. Ce n'est pas un cas d'utilisation (UML) : c'est un comportement du système qui s'applique à des cas existants.

## Q30 — Faut-il pouvoir supprimer son compte ?

**Constat (2026-10-07) :** aucune suppression de compte n'était prévue, et aucune règle ne traitait le droit à l'effacement (RGPD, article 17). Or la cascade en base existait déjà.

| Option | Pour | Contre |
|---|---|---|
| Hors périmètre v1, justifié | Rien à développer | Droit à l'effacement non couvert ; question probable du jury |
| **Suppression de compte en v1** | Répond au droit à l'effacement ; la cascade existe | Un scénario, une route, l'effacement des fichiers et un test en plus |

**Choix :** suppression de compte avec confirmation du mot de passe : toutes les données sont supprimées, fichiers photos compris, et la session est fermée.

## Q31 — Photos : accès aux fichiers et nombre par étape

**Constat (2026-10-07) :** les fichiers sont servis par une URL, sans contrôle de propriété à chaque requête, alors que les données sont strictement privées (RG-SEC-01). Le nombre de photos par étape n'était pas limité.

| Option | Pour | Contre |
|---|---|---|
| **URL à identifiant aléatoire (UUID), sans contrôle de propriété** | Simple ; une balise image suffit à l'afficher | La confidentialité repose sur l'impossibilité de deviner l'URL |
| Route authentifiée avec contrôle de propriété | Confidentialité complète | Le jeton n'est pas envoyé par une simple balise image : traitement spécifique côté interface |
| Limite du nombre de photos par étape | Borne l'espace de stockage (éco-conception) | Une valeur de plus à justifier |

**Choix :** URL non devinable, sans contrôle de propriété ni limite de nombre. Le compromis est assumé et ne s'applique qu'aux **fichiers**, jamais aux données : l'accès aux photos d'un autre reste impossible tant que son URL est inconnue, mais il n'est pas protégé par une vérification d'identité. À citer comme nuance, et non comme garantie absolue.

## Q32 — Faut-il conserver les complications d'une montre au moment de chaque projet ?

**Constat (2026-10-07) :** modifier les complications d'une montre n'affecte pas les projets passés (Q6). En revanche, rien ne garde la liste des complications que la montre avait lors d'un projet donné.

| Option | Pour | Contre |
|---|---|---|
| **Non, les étapes copiées suffisent** | Aucun changement du MCD ; le projet garde ce qui a été fait | On ne sait plus quelles complications ont généré les étapes |
| Tracer par projet | Historique complet | Nouvelle association et nouvelle table pour un besoin que rien n'exprime |

**Choix :** pas de trace. Décision cohérente avec Q6 et le YAGNI ; réintroductible plus tard par migration si le besoin apparaît.

---

## Réponses préparées pour la soutenance

- **« Pourquoi une N-N entre montre et complication ? »** Une montre peut cumuler plusieurs complications, et une complication équipe de nombreuses montres. La table d'association `comporte` a une clé primaire composite.
- **« Pourquoi l'automatique n'est-il pas une complication ? »** Voir Q9 : c'est un système de remontage, pas une fonction affichée ; le modèle suit le vocabulaire du domaine.
- **« Vos étapes communes sont dupliquées entre manuel et automatique. »** Voir Q13 : ce sont des données de référence en lecture seule, copiées dans les projets ; la base commune (Q10) et l'héritage (Q12) ont été étudiés et écartés, et je sais expliquer pourquoi.
- **« Pourquoi copier les étapes plutôt que les référencer ? »** Adapter la checklist d'un projet ne doit jamais modifier la bibliothèque ni les autres projets.
- **« Pourquoi une entité montre ? »** Voir Q7 : historique des interventions et normalisation (les caractéristiques et la possession appartiennent à la montre, pas à l'intervention).
- **« Comment l'utilisateur crée-t-il un projet sur une montre qu'il possède déjà ? »** Voir Q15 et Q17 : « Nouvelle révision sur cette montre » depuis son écran, ou « Nouveau projet » → « Sur une montre déjà suivie ? ».
- **« Pourquoi pas une page par entité (montre, projet) ? »** Voir Q17 : l'interface suit la fréquence des usages ; dans le cas courant (un seul projet), distinguer montre et projet n'apporte rien à l'utilisateur.
- **« Pourquoi des entiers auto-générés plutôt que des UUID ? »** Voir Q18 : index plus légers, insertions séquentielles ; le risque d'ids devinables est couvert par le contrôle d'appartenance sur chaque requête, testé.
- **« Que se passe-t-il si les complications changent ? »** Voir Q6 : sans effet sur les interventions existantes ; la synchronisation est une évolution identifiée (option B).
- **« Peut-on réordonner les étapes ? »** Voir Q21 : oui, à tout moment ; pas de contrainte d'unicité sur le rang d'une étape de projet, donc une renumérotation atomique suffit.
- **« Doit-on valider les étapes dans l'ordre ? »** Voir Q23 : non, l'ordre est libre ; la checklist est une aide, pas un déroulé imposé.
- **« Pourquoi un seul projet en cours par montre, et pourquoi dans la base ? »** Voir Q24 : cohérence avec le tableau de bord et la revente ; un index unique partiel garantit la règle même si deux requêtes arrivent en même temps.
- **« Peut-on rouvrir un projet, ou réviser une montre déjà vendue ? »** Voir Q25 : réouverture oui, sauf montre vendue, car des coûts sans recette fausseraient la marge ; une entité « prestation » est une piste ultérieure.
- **« Que devient la marge quand on supprime un projet ? »** Voir Q26 : elle est calculée à la lecture, donc toujours à jour ; la montre reste, même sans projet.
- **« Pourquoi des contraintes en base plutôt que dans le code ? »** Voir Q27 : la base garantit la règle indépendamment du code ; les dates futures restent applicatives, car un `CHECK` ne peut pas dépendre de la date du jour.
- **« Comment protégez-vous la connexion contre la force brute ? »** Voir Q29 : limitation de débit par adresse IP sur la connexion, le mot de passe oublié et le renvoi du lien.
- **« Comment gérez-vous le droit à l'effacement ? »** Voir Q30 : suppression de compte avec confirmation du mot de passe, cascade en base et effacement des fichiers.
- **« Les photos sont-elles vraiment privées ? »** Voir Q31 : leur URL est non devinable mais n'est pas protégée par une vérification d'identité ; compromis assumé, limité aux fichiers.
