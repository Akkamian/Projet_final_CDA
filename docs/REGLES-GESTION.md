# Règles de gestion

**Date :** 2026-10-07
**Périmètre :** v1 (mouvements manuel et automatique ; quartz et fonctionnalités reportées exclus).

Ce document recense les règles de gestion de l'application Watch Restoration Tracker, numérotées `RG-xx`. Il fait le lien entre les besoins métier et leur traduction technique : chaque règle indique le ou les scénarios qui la motivent, l'endroit où elle est appliquée (base de données, service, validation, interface) et le test qui la vérifie.

Il sert à vérifier que les besoins formulés dans les spécifications ont bien été traduits dans le modèle de données, et à garder la trace des arbitrages pris (section 10).

## 1. Sources et conventions de lecture

| Source | Contenu | Référence dans ce document |
|---|---|---|
| `docs/SPECS.md` | scénarios Gherkin S1 à S39, critères d'acceptation (§4), ancien §5 des règles métier (§5.1 à §5.6, désormais remplacé par un renvoi vers ce document) | « S5 », « S23 », « §4 », « §5.2 »… |
| `docs/MCD/2026-09-23-mcd-montre-complications-design.md` | décisions et contraintes du MCD, règle de génération des étapes, tests prévus | « MCD » |
| `docs/MCD/2026-09-23-journal-decisions-mcd.md` | raisonnement derrière chaque décision | « Q6 », « Q21 »… |
| `db/script_db.sql` | modèle physique, référence des contraintes en base | « BDD » |
| Plans de l'ancien dépôt `watch-restoration-tracker` | règles d'implémentation (validation, sécurité) absentes des spécifications | « plan AUTH », « plan PRJ »… |

**Niveaux d'application** (colonne « Application »)

- **BDD** : garantie par le schéma (type, `NOT NULL`, `CHECK`, `UNIQUE`, clé étrangère). Aucune erreur de code ne peut la contourner.
- **Service** : garantie par le code métier (NestJS). À protéger par des tests.
- **DTO** : garantie par la validation des données reçues par l'API.
- **Interface** : règle d'affichage ou de parcours, côté application web.

**Origine** : lorsqu'une règle ne figure que dans les plans de l'ancien dépôt et pas dans `SPECS.md`, la mention « plan … » le signale. Ces règles ont été confirmées le 2026-10-07 (section 10).

**Tests** : l'application n'étant pas encore écrite, la colonne cite les tests déjà prévus dans le design du MCD (section « Tests unitaires ajoutés ») ; les autres sont marqués « à écrire ».

## 2. Compte (`RG-CPT`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-CPT-01 | Une adresse email ne peut être utilisée que par un seul compte ; l'inscription avec une adresse déjà utilisée est refusée avec un message explicite. | S1 ; plan AUTH | BDD : `users.email UNIQUE` ; Service : refus si déjà prise | à écrire |
| RG-CPT-02 | L'adresse email saisie doit avoir un format valide. | S1 | DTO | à écrire |
| RG-CPT-03 | Un mot de passe contient au moins 8 caractères (inscription, réinitialisation, changement). | S1, S3, S4 ; plan AUTH, plan ACC | DTO | à écrire |
| RG-CPT-04 | Le mot de passe n'est jamais stocké en clair : seul son hachage (bcrypt) l'est. | S1 ; plan AUTH | BDD : `password_hash NOT NULL` ; Service | à écrire |
| RG-CPT-05 | L'inscription crée le compte sans ouvrir de session et envoie un email de vérification. | S1 | Service | à écrire |
| RG-CPT-06 | La connexion est refusée tant que l'adresse n'est pas vérifiée (`email_verified_at` vide), avec un message distinct de « identifiants invalides ». | S2 | Service | à écrire |
| RG-CPT-07 | Un email inconnu et un mauvais mot de passe produisent le même message d'erreur. | S2 ; plan AUTH | Service | à écrire |
| RG-CPT-08 | Le lien de vérification d'adresse est à durée limitée (24 h) et à usage unique : il n'est accepté que tant que l'adresse n'est pas déjà vérifiée. | S1, S39, §5.1 ; plan ACC | Service (jeton JWT daté, comparé à `email_verified_at`) | à écrire |
| RG-CPT-09 | Le lien de réinitialisation est à durée limitée (1 h) et à usage unique : il est invalidé dès que le mot de passe change (`password_changed_at`). | S3, §5.1 ; plan ACC | Service (jeton JWT daté, comparé à `password_changed_at`) | à écrire |
| RG-CPT-10 | La demande de réinitialisation et le renvoi du lien de vérification répondent de la même façon, que l'adresse corresponde ou non à un compte. L'inscription fait exception (RG-CPT-01), compromis assumé au profit de l'utilisateur. | S3, S39, §5.1 ; arbitrage A9 | Service | à écrire |
| RG-CPT-11 | Changer son mot de passe exige le mot de passe actuel correct ; le changement met à jour `password_changed_at`. | S4 | Service | à écrire |
| RG-CPT-12 | La session utilise un jeton d'accès de 15 minutes et un jeton de renouvellement de 7 jours. | plan AUTH | Service (configuration JWT) | à écrire |
| RG-CPT-13 | L'adresse email est enregistrée en minuscules, sans espace superflu, avant tout enregistrement ou toute recherche. | S1 ; arbitrage A9 | DTO / Service (normalisation) | à écrire |
| RG-CPT-14 | Les tentatives répétées sur la connexion, la demande de réinitialisation et le renvoi du lien de vérification sont limitées par adresse IP ; au-delà du plafond, les requêtes sont refusées temporairement. | S36, S39 ; arbitrage A8 | Service (limitation de débit ; plafond fixé en configuration) | à écrire |
| RG-CPT-15 | L'utilisateur peut supprimer son compte après confirmation de son mot de passe : toutes ses données sont supprimées, y compris les fichiers photos du stockage, et sa session est fermée. | S35 ; arbitrage A7 | Service ; BDD : `ON DELETE CASCADE` | à écrire |
| RG-CPT-16 | À l'inscription, la confirmation du mot de passe doit être identique au mot de passe saisi ; sinon l'inscription est refusée avec un message explicite. | S1 ; arbitrage C5 | Interface (comparaison à la saisie) | à écrire |
| RG-CPT-17 | L'inscription exige l'acceptation des Conditions Générales de Vente et de la Politique de Confidentialité ; sans cette acceptation, le compte n'est pas créé. | S1 ; arbitrage C5 | Interface ; DTO (acceptation obligatoire) | à écrire |

## 3. Montre (`RG-MON`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-MON-01 | Une montre possède obligatoirement une marque, un modèle et un type de mouvement. | S5, §5.2 | BDD : `brand`, `model`, `movement_code` `NOT NULL` ; DTO | à écrire |
| RG-MON-02 | Le type de mouvement est « manuel » ou « automatique ». Le quartz est hors périmètre v1. | S5, S6, §5.2, Q5 | BDD : type `movement_code_enum` et clé étrangère vers `movement_types` | à écrire |
| RG-MON-03 | Le calibre n'a pas d'attribut propre : l'utilisateur l'inscrit dans le modèle. | §5.2, Q16 | Interface | sans objet |
| RG-MON-04 | Une montre peut avoir zéro, une ou plusieurs complications, et une complication peut équiper plusieurs montres ; une même complication ne peut être associée qu'une fois à la même montre. | S5, S7, §5.2 | BDD : table `comporte`, clé primaire `(watch_id, complication_code)` | à écrire |
| RG-MON-05 | Une montre appartient à un seul utilisateur. | S27 | BDD : `watches.user_id NOT NULL`, clé étrangère vers `users` | à écrire |
| RG-MON-06 | Le prix et la date d'achat sont facultatifs : une montre gardée de longue date peut ne plus les avoir. | S5, Q19 | BDD : colonnes nullables | à écrire |
| RG-MON-07 | Le prix d'achat, lorsqu'il est connu, est positif ou nul. | S5 | BDD : `chk_watches_purchase_price` ; DTO | à écrire |
| RG-MON-08 | Modifier les informations d'une montre, dont ses complications, n'affecte pas les étapes des projets existants ; seules les nouvelles révisions utilisent les complications modifiées. | S10, §5.4, Q6 | Service | à écrire |
| RG-MON-09 | Une montre est « vendue » lorsque sa date de revente est renseignée. | §5.2 | BDD : `resale_date` ; Service | à écrire |
| RG-MON-10 | Une montre a zéro, un ou plusieurs projets. | §2, §5.3 | BDD : `restoration_projects.watch_id` | sans objet |
| RG-MON-11 | Une montre, vendue ou non, peut être supprimée avec ses complications associées, tous ses projets et toutes leurs données ; les fichiers photos sont effacés du stockage. | S38 ; arbitrage C3 | Service ; BDD : `ON DELETE CASCADE` | à écrire |

## 4. Projet (`RG-PRJ`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-PRJ-01 | Un projet est toujours rattaché à une montre. | §5.3 | BDD : `watch_id NOT NULL`, clé étrangère | à écrire |
| RG-PRJ-02 | Un projet est « en cours » (par défaut) ou « terminé ». Il n'y a pas de type d'intervention en v1. | S5, S11, §5.3, Q8 | BDD : `chk_restoration_projects_status`, valeur par défaut `in_progress` | à écrire |
| RG-PRJ-03 | La création d'une montre, de ses complications, de son premier projet et de ses étapes est atomique : si une partie échoue, rien n'est enregistré. | S5, critères d'acceptation | Service (écriture imbriquée unique) | Transaction de création (design MCD) |
| RG-PRJ-04 | Un nouveau projet peut être ouvert sur une montre déjà suivie sans en ressaisir les informations. | S9 | Service ; Interface | à écrire |
| RG-PRJ-05 | Aucun projet ne peut être ouvert sur une montre vendue. | S9, S22, §5.3 | Service | à écrire |
| RG-PRJ-06 | Un projet « en cours » peut être marqué « terminé » : son statut change et sa date de fin est renseignée. Un projet déjà terminé ne peut pas l'être une seconde fois. | S11, Q19 | Service | à écrire |
| RG-PRJ-07 | Un projet peut avoir une photo d'état initial et une photo d'état final, distinctes des photos d'étape. | S18, §5.3 | BDD : `photo_before`, `photo_after` nullables | à écrire |
| RG-PRJ-08 | Le projet « le plus récent » d'une montre est celui dont la date de création est la plus récente. | S25, MCD | Service (tri sur `created_at`) | à écrire |
| RG-PRJ-09 | Une montre n'a qu'un seul projet « en cours » à la fois : ouvrir un projet est refusé tant qu'un autre est en cours sur la même montre. | S9 ; arbitrage A4 | BDD : index unique partiel `uq_restoration_projects_one_in_progress` ; Service | à écrire |
| RG-PRJ-10 | Un projet terminé peut être rouvert : son statut repasse à « en cours » et sa date de fin est effacée. La réouverture est refusée si la montre est vendue (la revente doit d'abord être annulée) ou si un autre projet est en cours sur la même montre. | S28 ; arbitrage A5 | Service ; BDD : l'index de RG-PRJ-09 refuse un second projet en cours | à écrire |
| RG-PRJ-11 | Un projet, en cours ou terminé, peut être supprimé avec ses étapes, notes, photos, mesures et coûts ; ses fichiers photos sont effacés du stockage. La montre est conservée, même sans projet, et sa marge est recalculée. | S37 ; arbitrage C3 | Service ; BDD : `ON DELETE CASCADE` | Marge (design MCD) pour le recalcul ; à écrire pour le reste |

## 5. Étapes et génération de la checklist (`RG-ETP`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-ETP-01 | Une étape type est rattachée soit à un type de mouvement, soit à une complication, jamais aux deux ni à aucun. | MCD, Q13 | BDD : `chk_template_steps_xor` | Contrainte XOR (design MCD) |
| RG-ETP-02 | Dans une même liste (un mouvement ou une complication), deux étapes types ne peuvent avoir ni le même rang ni le même libellé. | MCD, Q20 | BDD : quatre contraintes `UNIQUE` sur `template_steps` | Contrainte XOR (design MCD) pour le volet BDD ; à écrire pour les `UNIQUE` |
| RG-ETP-03 | Les types de mouvement, les complications et les étapes types sont des données de référence : alimentées par le seed, en lecture seule pour les utilisateurs. | MCD | Service (aucune route d'écriture) | à écrire |
| RG-ETP-04 | La checklist proposée réunit les étapes du type de mouvement et celles des complications de la montre, triées par rang croissant ; à égalité, les étapes de base passent avant celles des complications, puis l'ordre suit le code de la complication. | S6, S7, MCD | Service (génération) | Génération (design MCD) |
| RG-ETP-05 | Les étapes d'une complication sont les mêmes quel que soit le type de mouvement ; chaque étape issue d'une complication indique le nom de cette complication. | S7, Q5 | Service ; Interface | Génération (design MCD) |
| RG-ETP-06 | L'aperçu des étapes peut être ajusté (ajout, suppression, déplacement) avant la création du projet ; il n'est pas enregistré et ne modifie ni le référentiel ni les autres projets. | S8 | Service (l'aperçu ne persiste rien) ; Interface | à écrire |
| RG-ETP-07 | À la création du projet, les étapes de l'aperçu ajusté sont copiées une seule fois, renumérotées 1, 2, 3…, avec une note vide et le statut « non terminé ». | S5, S8, §5.4, Q6 | Service | Transaction de création (design MCD) |
| RG-ETP-08 | Une étape possède un libellé obligatoire. | §5.4 | BDD : `label NOT NULL` ; DTO | à écrire |
| RG-ETP-09 | Une étape personnalisée ajoutée à un projet est placée à la suite des étapes existantes. | S13 | Service (rang = dernier rang + 1) | à écrire |
| RG-ETP-10 | Une étape « à faire » peut être marquée « terminée », dans n'importe quel ordre ; sa date de réalisation est alors renseignée. | S12 ; arbitrage A1 | Service | à écrire |
| RG-ETP-11 | Le libellé, la note et les photos d'une étape peuvent être modifiés après coup sans effacer l'historique du projet. | S14, S16 | Service | à écrire |
| RG-ETP-12 | Réordonner les étapes d'un projet se fait à tout moment, en une seule opération atomique, et l'ordre précédent est conservé en cas d'échec ; notes, photos et statut suivent chaque étape. | S15, Q21 | Service (transaction) ; BDD : pas d'unicité sur `(project_id, step_order)`, volontairement | à écrire |
| RG-ETP-13 | Les rangs des étapes d'un projet sont toujours 1, 2, 3…, sans trou ni doublon. | S15, §5.4 | Service | à écrire |
| RG-ETP-14 | Une étape terminée peut être remise « à faire » : sa date de réalisation est effacée. | S29 ; arbitrage A6 | Service | à écrire |
| RG-ETP-15 | Une étape d'un projet existant peut être supprimée avec sa note et ses photos ; les étapes restantes sont renumérotées 1, 2, 3… en une seule opération atomique. | S30 ; arbitrage A6 | Service (transaction) ; BDD : photos supprimées en cascade | à écrire |

## 6. Photos (`RG-PHO`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-PHO-01 | Seuls les fichiers JPEG, PNG et WebP sont acceptés. | S17, §5.6 | DTO / contrôleur (type de fichier) ; Service (extension déduite du type) | à écrire |
| RG-PHO-02 | Un fichier de plus de 10 Mo est refusé. | S17, §5.6 | DTO / contrôleur (taille maximale) | à écrire |
| RG-PHO-03 | Les fichiers sont renommés à l'enregistrement : le nom d'origine n'est jamais conservé. | §5.6 | Service (stockage) | à écrire |
| RG-PHO-04 | Une étape peut recevoir plusieurs photos. | S17 | BDD : `step_pics.restoration_step_id` (1-N) | à écrire |
| RG-PHO-05 | Une photo appartient à une seule étape et disparaît avec elle. | MCD | BDD : clé étrangère `ON DELETE CASCADE` | à écrire |
| RG-PHO-06 | Une photo d'étape peut être supprimée : elle n'est plus associée à l'étape et son fichier est effacé du stockage. | S34 ; arbitrage A6 | Service | à écrire |
| RG-PHO-07 | La photo d'état initial ou final d'un projet peut être remplacée ou retirée ; l'ancien fichier est alors effacé du stockage. | S34 ; arbitrage A6 | Service | à écrire |

## 7. Performances du mouvement (`RG-PER`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-PER-01 | Une mesure est rattachée à un projet. | S19, MCD | BDD : `project_id NOT NULL`, clé étrangère | à écrire |
| RG-PER-02 | Une mesure comporte obligatoirement une date, une marche (en secondes par jour, négative en cas de retard), un beat error et une amplitude ; la position de la montre est facultative. | S19 | BDD : colonnes `NOT NULL` ; DTO | à écrire |
| RG-PER-03 | Un beat error ou une amplitude négatifs sont refusés. | S19 ; arbitrage A2 | BDD : `chk_performance_measurements_beat_error`, `chk_performance_measurements_amplitude` ; DTO | à écrire |
| RG-PER-04 | Les mesures d'un projet sont présentées dans l'ordre chronologique. | S20 | Service (tri sur `measured_at`) ; Interface | à écrire |
| RG-PER-05 | Une mesure peut être modifiée ou supprimée ; les mêmes contrôles qu'à la saisie s'appliquent. | S33 ; arbitrage A6 | Service ; DTO ; BDD | à écrire |

## 8. Finances (`RG-FIN`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-FIN-01 | Un coût comporte un libellé, un montant et une date, et est rattaché à un projet. | S21, §5.5 | BDD : colonnes `NOT NULL`, clé étrangère | à écrire |
| RG-FIN-02 | Le montant d'un coût est positif ou nul ; un montant négatif est refusé. | S21, §5.5 | BDD : `chk_expenses_amount` ; DTO | à écrire |
| RG-FIN-03 | Le prix et la date de revente sont renseignés ensemble ou pas du tout. | S22, §4 | BDD : `chk_watches_resale` ; DTO | à écrire |
| RG-FIN-04 | Le prix de revente est positif ou nul. | S22 | BDD : `chk_watches_resale_price` ; DTO | à écrire |
| RG-FIN-05 | La revente est refusée tant qu'un projet de la montre est en cours, ou si la montre est déjà vendue. | S22, §4 | Service | à écrire |
| RG-FIN-06 | Marge d'une montre = prix de revente − prix d'achat − somme des coûts de tous ses projets. Elle est calculée à la lecture, jamais stockée. | S23, §5.5, Q7 | Service | Marge (design MCD) |
| RG-FIN-07 | Aucune marge n'est calculée si la montre n'est pas vendue ou si son prix d'achat est inconnu. | S24, §5.5, Q19 | Service | Marge (design MCD) |
| RG-FIN-08 | La marge est calculée par montre, et non par projet. | S23, S26, §5.5, Q7 | Service | Marge (design MCD) |
| RG-FIN-09 | Les finances restent au niveau de la montre, avec les coûts regroupés par projet. | S26 | Interface | à écrire |
| RG-FIN-10 | La date de revente ne peut pas précéder la date d'achat, lorsque celle-ci est connue. | S22 ; arbitrage A10 | BDD : `chk_watches_resale_after_purchase` ; DTO | à écrire |
| RG-FIN-11 | Un coût peut être modifié ou supprimé ; les mêmes contrôles qu'à la saisie s'appliquent et la marge est recalculée à la lecture. | S32 ; arbitrage A6 | Service ; DTO ; BDD | Marge (design MCD) pour le recalcul ; à écrire pour le reste |
| RG-FIN-12 | La revente peut être corrigée (prix et date modifiés ensemble) ou annulée : la montre n'est alors plus vendue, aucune marge n'est calculée, et elle peut de nouveau recevoir un projet. | S31 ; arbitrage A6 | Service ; BDD : `chk_watches_resale` | à écrire |

## 9. Confidentialité (`RG-SEC`), règles transversales (`RG-GEN`) et affichage (`RG-AFF`)

| ID | Règle | Origine | Application | Test |
|---|---|---|---|---|
| RG-SEC-01 | Un utilisateur n'accède jamais aux données d'un autre : montres, projets, étapes, photos, mesures, coûts. | S27, §5.1, §4 | Service : la propriété est vérifiée dans la requête elle-même | Autorisation, IDOR (design MCD) |
| RG-SEC-02 | Une ressource appartenant à un autre utilisateur reçoit la même réponse qu'une ressource inexistante (404), pour ne pas en révéler l'existence. | S27 ; plan PRJ | Service | Autorisation, IDOR (design MCD) |
| RG-SEC-03 | Toute route, hors inscription, connexion et gestion des liens par email, exige un utilisateur authentifié. | S27 ; plan AUTH | Garde d'authentification | à écrire |
| RG-SEC-04 | Les identifiants des données sont des entiers auto-générés : la protection contre l'accès aux données d'autrui repose donc uniquement sur RG-SEC-01. | Q18 | Service | Autorisation, IDOR (design MCD) |
| RG-SEC-05 | La suppression d'un utilisateur, d'une montre, d'un projet ou d'une étape entraîne celle de toutes les données qui en dépendent. | MCD | BDD : `ON DELETE CASCADE` sur toute la chaîne | à écrire |
| RG-SEC-06 | Les fichiers photos sont servis par une URL à identifiant aléatoire non devinable, sans contrôle de propriété à chaque requête ; ce compromis est assumé et ne s'applique qu'aux fichiers, pas aux données. Le nombre de photos par étape n'est pas limité. | S27 ; arbitrage A11 | Service (stockage) | à écrire |
| RG-GEN-01 | Aucune date saisie (achat, revente, mesure, coût) ne peut être dans le futur. | S5, S19, S21, S22 ; arbitrage A10 | DTO / Service (non exprimable en `CHECK` fiable) | à écrire |
| RG-GEN-02 | Les champs texte courts (marque, modèle, libellés d'étape et de coût) font au plus 255 caractères ; les notes n'ont pas de limite. | S5, S13, S21 ; arbitrage A3 | BDD : `VARCHAR(255)` et `TEXT` ; DTO : même limite | à écrire |
| RG-GEN-03 | La suppression d'un projet ou d'une montre exige une confirmation explicite de l'utilisateur et est définitive. | S37, S38 ; arbitrage C3 | Interface | à écrire |
| RG-AFF-01 | Le tableau de bord affiche une carte par montre : miniature (photo finale du projet le plus récent, sinon sa photo initiale), marque et modèle, mouvement et complications. | S25 | Interface | à écrire |
| RG-AFF-02 | La carte indique le statut du projet le plus récent (« En cours » ou « Terminé »), ou « Vendue » si la montre est vendue, et la marge si elle est vendue et calculable. | S25, §5.3 | Interface | à écrire |
| RG-AFF-03 | Le sélecteur de projet n'apparaît que si la montre a deux projets ou plus ; la checklist, les performances et l'avant / après suivent le projet sélectionné. | S26, Q17 | Interface | à écrire |
| RG-AFF-04 | La nouvelle révision d'une montre n'est pas proposée si la montre est vendue ou si un projet y est déjà en cours. | S9 ; arbitrage A4 | Interface ; Service (RG-PRJ-05, RG-PRJ-09) | à écrire |
| RG-AFF-05 | Une montre sans projet s'affiche sur le tableau de bord sans miniature, avec le statut « Sans projet », et reste consultable ; un nouveau projet peut y être ouvert si elle n'est pas vendue. | S25, S9 ; arbitrage C3 | Interface | à écrire |

## 10. Arbitrages du 2026-10-07

Le recensement avait fait apparaître douze points implicites, contradictoires ou absents du modèle. Chacun a été tranché ; la colonne « Impact » dit ce qui a été modifié.

| N° | Décision | Règles | Impact |
|---|---|---|---|
| A1 | Les étapes se valident dans l'ordre de son choix. | RG-ETP-10 | `SPECS.md` §1 et S12 mis à jour. |
| A2 | Deux `CHECK` en base : beat error et amplitude positifs ou nuls. La marche reste libre (négative en cas de retard). | RG-PER-03 | Script SQL : `chk_performance_measurements_beat_error` et `_amplitude`. |
| A3 | 255 caractères pour tous les champs texte courts, notes sans limite. | RG-GEN-02 | Le plafond de 200 du plan PRJ (aperçu des étapes) est à aligner à 255. |
| A4 | Un seul projet « en cours » par montre. | RG-PRJ-09, RG-AFF-04 | Script SQL : index unique partiel `uq_restoration_projects_one_in_progress`. `SPECS.md` S9. |
| A5 | Un projet terminé reste modifiable et peut être rouvert. | RG-PRJ-10 | `SPECS.md` S28. |
| A6 | Toutes les corrections sont admises : décocher et supprimer une étape, corriger ou annuler la revente, modifier ou supprimer un coût, une mesure, une photo. | RG-ETP-14, 15 ; RG-PHO-06, 07 ; RG-PER-05 ; RG-FIN-11, 12 | `SPECS.md` S29 à S34. |
| A7 | Suppression de compte avec ses données, en v1. | RG-CPT-15 | `SPECS.md` S35. La suppression des fichiers du stockage s'ajoute à la cascade en base. |
| A8 | Limitation de débit sur la connexion, la réinitialisation et le renvoi du lien. | RG-CPT-14 | `SPECS.md` S36. Valeur du plafond fixée à l'implémentation. |
| A9 | Email normalisé en minuscules ; refus explicite d'une adresse déjà utilisée à l'inscription. | RG-CPT-01, 10, 13 | `SPECS.md` S1. Exception assumée à l'anti-énumération. |
| A10 | La revente ne précède pas l'achat ; aucune date saisie n'est dans le futur. | RG-FIN-10, RG-GEN-01 | Script SQL : `chk_watches_resale_after_purchase`. Dates futures contrôlées par l'application seulement. `SPECS.md` S5, S19, S21, S22. |
| A11 | Photos servies par URL non devinable, sans limite de nombre par étape. | RG-SEC-06 | Aucun. Compromis à citer en soutenance. |
| A12 | Pas de trace des complications d'un projet passé : les étapes copiées suffisent. | (Q6) | Aucun. |

### Compléments apportés après relecture

| N° | Décision | Règles | Impact |
|---|---|---|---|
| C1 | La réouverture d'un projet sur une montre vendue reste refusée en v1. Elle pourrait être permise plus tard (révision demandée par l'acheteur), avec une entité « prestation » portant le montant facturé. | RG-PRJ-05, RG-PRJ-10 | `SPECS.md` §6 (hors périmètre v1). |
| C2 | « Modifier une photo » signifie « remplacer ou retirer » ; une photo d'étape se supprime et se rajoute. | RG-PHO-06, 07 | Aucun. |
| C3 | La suppression d'un projet et celle d'une montre sont incluses en v1. | RG-PRJ-11, RG-MON-11, RG-GEN-03, RG-AFF-05 | `SPECS.md` S37, S38, S9, S25. Cascade déjà en base, vérifiée sur PostgreSQL. Effacement des fichiers à ajouter au service. |
| C4 | Les règles reprises des plans de l'ancien dépôt sont conservées : mot de passe de 8 caractères minimum, hachage bcrypt, liens de 24 h et 1 h, session de 15 min et 7 jours, réponse 404 pour la donnée d'un autre, authentification obligatoire. | RG-CPT-03, 04, 07, 08, 09, 12 ; RG-SEC-02, 03 | Aucun. |
| C5 | À l'inscription (2026-10-09), le formulaire demande la confirmation du mot de passe et l'acceptation des CGV et de la Politique de Confidentialité, comme dans les maquettes Figma. L'acceptation n'est pas conservée en base à ce stade. | RG-CPT-16, RG-CPT-17 | `SPECS.md` S1. Maquettes `design/…-screen-auth-…`. Pages CGV et confidentialité à rédiger ; conservation de la date d'acceptation à décider (hypothèse ci-dessous). |

### Hypothèses restant à confirmer

Ces points découlent de C3 sans avoir été posés tels quels.

- **Confirmation avant suppression** : la suppression d'un projet ou d'une montre exige une confirmation explicite et est définitive (RG-GEN-03), par analogie avec la suppression de compte, qui demande le mot de passe.
- **Montre sans projet** : après suppression de son dernier projet, une montre reste visible avec le statut « Sans projet » (RG-AFF-05, repris de l'ancien frontend). Les spécifications ne prévoyaient pas ce cas.
- **Montre vendue** : supprimer un de ses projets est autorisé, ce qui modifie la marge calculée. Aucun blocage n'est prévu.
- **Preuve d'acceptation des CGV** (C5) : pour pouvoir démontrer le consentement, il faudrait conserver la date d'acceptation (par exemple une colonne `terms_accepted_at` sur `users`). Non retenu pour l'instant, car le script SQL et le MCD ne changent pas.

### Documents à aligner (non modifiés à ce stade)

- **Design du MCD** (`docs/MCD/2026-09-23-mcd-montre-complications-design.md`) : le parcours dit que « Nouvelle révision » reste proposée, de façon discrète, tant qu'un projet est en cours, et que « Sur une montre déjà suivie ? » liste les montres non vendues. Avec A4, l'action est indisponible tant qu'un projet est en cours, et la liste doit exclure ces montres.
- **`docs/UML.md`** : les cas d'utilisation correspondant à S28 à S38 sont à ajouter.
- **Plans de l'ancien dépôt** : plusieurs règles ne sont plus d'actualité (longueur 200, pas de suppression, pas de réouverture).

## 11. Matrice de couverture des scénarios

Chaque scénario de `SPECS.md` renvoie aux règles qui le mettent en œuvre. Sept règles ne sont rattachées à aucun scénario, car elles décrivent la structure du modèle ou la configuration plutôt qu'un parcours utilisateur : RG-CPT-12, RG-ETP-01, 02, 03 et 08, RG-MON-03 et 10.

| Scénario | Règles |
|---|---|
| S1 — S'inscrire et vérifier son adresse | RG-CPT-01, 02, 03, 04, 05, 08, 13, 16, 17 |
| S2 — Être refusé si l'adresse n'est pas vérifiée | RG-CPT-06, 07 |
| S3 — Réinitialiser un mot de passe | RG-CPT-03, 09, 10 |
| S4 — Changer son mot de passe | RG-CPT-03, 11 |
| S5 — Créer une montre et son premier projet | RG-MON-01, 02, 04, 05, 06, 07 ; RG-PRJ-01, 02, 03 ; RG-ETP-07 ; RG-GEN-01, 02 |
| S6 — Générer les étapes d'après le mouvement | RG-MON-02 ; RG-ETP-04 |
| S7 — Intégrer les complications | RG-ETP-04, 05 |
| S8 — Ajuster l'aperçu | RG-ETP-06, 07 |
| S9 — Nouvelle révision sur une montre suivie | RG-PRJ-04, 05, 09 ; RG-ETP-04 ; RG-AFF-04 |
| S10 — Modifier les informations d'une montre | RG-MON-08 |
| S11 — Marquer un projet terminé | RG-PRJ-06 |
| S12 — Valider une étape | RG-ETP-10 |
| S13 — Ajouter une étape personnalisée | RG-ETP-09 ; RG-GEN-02 |
| S14 — Modifier une étape | RG-ETP-11 |
| S15 — Réordonner les étapes | RG-ETP-12, 13 |
| S16 — Ajouter des notes | RG-ETP-11 |
| S17 — Ajouter des photos | RG-PHO-01, 02, 03, 04, 05 |
| S18 — Consulter l'avant / après | RG-PRJ-07 |
| S19 — Ajouter une mesure | RG-PER-01, 02, 03 ; RG-GEN-01 |
| S20 — Consulter l'évolution des mesures | RG-PER-04 |
| S21 — Ajouter un coût | RG-FIN-01, 02 ; RG-GEN-01, 02 |
| S22 — Renseigner la revente | RG-FIN-03, 04, 05, 10 ; RG-PRJ-05 ; RG-MON-09 ; RG-GEN-01 |
| S23 — Consulter la marge | RG-FIN-06, 08 |
| S24 — Ne pas afficher une marge incalculable | RG-FIN-07 |
| S25 — Consulter le tableau de bord | RG-AFF-01, 02, 05 ; RG-PRJ-08 |
| S26 — Historique des interventions | RG-AFF-03 ; RG-FIN-08, 09 |
| S27 — Refuser l'accès aux données d'un autre | RG-SEC-01, 02, 03, 04, 06 |
| S28 — Rouvrir un projet terminé | RG-PRJ-10, 05, 09 |
| S29 — Décocher une étape terminée | RG-ETP-14 |
| S30 — Supprimer une étape d'un projet | RG-ETP-15, 13 |
| S31 — Corriger ou annuler une revente | RG-FIN-12, 10 ; RG-GEN-01 |
| S32 — Modifier ou supprimer un coût | RG-FIN-11, 02 ; RG-GEN-01 |
| S33 — Modifier ou supprimer une mesure | RG-PER-05, 03 ; RG-GEN-01 |
| S34 — Supprimer ou remplacer une photo | RG-PHO-06, 07 |
| S35 — Supprimer mon compte | RG-CPT-15, 11 ; RG-SEC-05 |
| S36 — Être limité en cas de tentatives répétées | RG-CPT-14 |
| S37 — Supprimer un projet | RG-PRJ-11 ; RG-GEN-03 ; RG-FIN-08 ; RG-AFF-05 |
| S38 — Supprimer une montre | RG-MON-11 ; RG-GEN-03 ; RG-SEC-05 |
| S39 — Renvoyer le lien de vérification | RG-CPT-08 ; RG-CPT-10 ; RG-CPT-14 |

## 12. Matrice de couverture des contraintes SQL

Chaque contrainte du script `db/script_db.sql` se rattache à au moins une règle.

| Contrainte | Règle |
|---|---|
| `movement_code_enum`, clés étrangères vers `movement_types` | RG-MON-02 |
| `chk_template_steps_xor` | RG-ETP-01 |
| `uq_template_steps_*` (rang, libellé) | RG-ETP-02 |
| `users.email UNIQUE` | RG-CPT-01 |
| `users.password_hash`, `email_verified_at`, `password_changed_at` | RG-CPT-04, 06, 08, 09 |
| `watches` : `NOT NULL` sur marque, modèle, mouvement, propriétaire | RG-MON-01, 05 |
| `chk_watches_purchase_price` | RG-MON-07 |
| `chk_watches_resale_price` | RG-FIN-04 |
| `chk_watches_resale` | RG-FIN-03, RG-FIN-12 |
| `chk_watches_resale_after_purchase` | RG-FIN-10 |
| `comporte` : clé primaire composite | RG-MON-04 |
| `chk_restoration_projects_status` | RG-PRJ-02 |
| `uq_restoration_projects_one_in_progress` (index unique partiel) | RG-PRJ-09, RG-PRJ-10 |
| `restoration_projects.photo_before`, `photo_after` | RG-PRJ-07 |
| `restoration_steps` : pas d'unicité sur `(project_id, step_order)` | RG-ETP-12 |
| `step_pics` : clé étrangère | RG-PHO-04, 05 |
| `performance_measurements` : colonnes `NOT NULL` | RG-PER-02 |
| `chk_performance_measurements_beat_error`, `chk_performance_measurements_amplitude` | RG-PER-03 |
| `chk_expenses_amount` | RG-FIN-02 |
| `ON DELETE CASCADE` | RG-SEC-05, RG-CPT-15, RG-PRJ-11, RG-MON-11 |
| index sur les clés étrangères | sans objet (performance) |

## 13. Anomalies relevées dans l'ancien dépôt

Ces écarts ne sont pas des règles de gestion, mais il faut les connaître avant de reprendre les plans d'implémentation de l'ancien dépôt.

- Les plans `frontend` et `e2e-tests` supposent une connexion automatique après l'inscription et utilisent d'anciens libellés d'étapes. Ils sont dépassés par la vérification d'adresse (RG-CPT-05, RG-CPT-06) et par le seed actuel du référentiel.
- Le plan `checklists-and-steps` ajoute un champ `order` à la modification d'une étape, puis le retire plus loin dans le même plan : seul le réordonnancement global (RG-ETP-12) fait foi.
- Le frontend de l'ancien dépôt n'a pas d'écran pour la vérification d'adresse, la réinitialisation ni le changement de mot de passe, alors que les emails y renvoient.
- Le plan `photos` redéclare `ProjectsModule` sans importer `WatchesModule`, ce qui casserait l'injection prévue par le plan `projects`.
