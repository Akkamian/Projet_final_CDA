# Justification des choix techniques — Du MCD au MPD PostgreSQL

| | |
|---|---|
| **Projet** | Watch Restoration Tracker |
| **Objet** | Traçabilité des choix d'implémentation technique entre le modèle conceptuel (MCD) et le modèle physique de données (MPD) |
| **Contexte** | Support de présentation orale — justifier les écarts entre le MCD (sémantique) et le script SQL (`db/script_db.sql`) |
| **Outils** | Looping (MCD) → PostgreSQL 16/18 (MPD) |

---

## 1. Contexte et objectif

Le modèle conceptuel (MCD) décrit **les règles métier et la sémantique** du domaine : quelles entités existent, quelles associations les relient, quels attributs les décrivent. Il privilégie naturellement des **identifiants sémantiques** — c'est-à-dire des attributs porteurs de sens métier.

Le modèle physique de données (MPD) décrit **l'implémentation réelle dans un SGBD**. Il doit garantir l'intégrité, la stabilité et la performance, ce qui impose parfois des adaptations par rapport au MCD : ajout d'identifiants techniques, ajout de contraintes, restructuration de clés étrangères.

Ce document recense **spécifiquement chaque adaptation issue d'un choix d'implémentation technique**, avec la justification associée. Il répond à la question : *« pourquoi le schéma SQL diffère-t-il du MCD, et pourquoi ces écarts sont-ils justifiés ? »*

---

## 2. Posture de conception : MCD vs MPD

### 2.1 Le principe directeur

> **Favoriser l'identifiant sémantique (celui du MCD) tant qu'il est acceptable pour le SGBD. N'ajouter un identifiant technique que lorsqu'un critère technique l'exige — et dans ce cas, protéger la sémantique par des contraintes d'unicité.**

### 2.2 L'arbre de décision appliqué pour chaque identifiant

Pour chaque identifiant candidat au MCD, trois critères sont évalués :

| Critère | Question posée | Conséquence si non respecté |
|---|---|---|
| **Stabilité** | L'attribut ne change-t-il **jamais** de valeur dans la vie de l'entité ? | Un identifiant qui change doit être propagé partout (FK), c'est une source d'erreurs |
| **Unicité** | L'attribut est-il **toujours** unique dans tous les cas d'usage ? | Un identifiant non unique est inutilisable comme clé |
| **Report dans les tables filles** | L'attribut est-il **léger à reporter** (FK) dans les tables dépendantes ? | Une clé trop large/instable alourdit toutes les FK |

Résultat possible pour chaque identifiant :

- ✅ **Sémantique conservé** (les trois critères sont satisfaits) ;
- 🔧 **Sémantique conservé + contrainte UNIQUE de protection** (l'identifiant reste, mais on garantit son unicité en base) ;
- ⚙️ **Identifiant technique ajouté** (la sémantique ne répond pas aux critères → on ajoute un `Id` stable, et on protège la sémantique par des contraintes).
---

## 3. Tableau synthétique des modifications MCD → MPD

C'est le cœur du document : pour chaque entité, on compare l'identifiant du MCD à l'implémentation du MPD et on justifie.

| Entité | Identifiant au MCD | Implémentation au MPD | Décision | Justification technique |
|---|---|---|---|---|
| `restoration_processes` | `(movement_type, complication_type)` | `(movement_type, complication_type)` PK | ✅ Sémantique conservé | Couple stable et unique ; **aucun id ajouté** — exemple même de l'identifiant sémantique honnête |
| `restoration_process_steps` | *Aucun identifiant sémantique stable* | **+ `Id SERIAL` PK** + `UNIQUE (movement_type, complication_type, step_order)` deferrable + `UNIQUE (…, label)` | ⚙️ Id technique ajouté | L'identifiant sémantique naturel (`processus + position`) est **instable par construction** : `step_order` change dès qu'on réordonne, `label` peut être modifié → voir §4.1 |
| `restoration_projects` | `(name, created_at)` | `(name, created_at)` PK **+ `movement_type`, `complication_type` (FK)** | 🔧 Sémantique conservé + ajout | L'association du MCD « un projet instancie un processus » n'était **pas matérialisée** → le MPD l'enrichit d'une FK composite qui garantit que le projet référence un processus existant (voir §4.4) |
| `restoration_steps` | `(label, created_at)` | **+ `Id BIGSERIAL` PK** + `UNIQUE (name, created_at_1, step_order)` deferrable + `UNIQUE (…, label)` | ⚙️ Id technique ajouté | `label` est modifiable par l'utilisateur, `created_at` n'est pas discriminant lors d'un **clonage en masse** (toutes les étapes reçoivent le même timestamp) → la PK sémantique est instable et non garantie unique (voir §4.1 et §4.2) |
| `step_pics` | `url` | `url` PK **+ `step_id` FK → `restoration_steps(Id)` `ON DELETE CASCADE`** | 🔧 Sémantique conservé + restructuration | La FK pointait vers `(label, created_at)`, ce qui n'est plus possible (PK instable). On référence l'**id technique stable** de l'étape (voir §4.5) |
| `users` | `mail` | `mail` PK | ✅ Sémantique conservé | Stable en pratique. À surveiller (mail modifiable) — voir §6 |
| `expenses` | `(label, expense_date)` | inchangé | ✅ Sémantique conservé | Reporté en FK sur le projet, fonctionnel |
| `performance_measurements` | `created_at` | inchangé | ✅ Sémantique conservé | À surveiller, voir §6 |
---

## 4. Focus sur les choix techniques structurants

### 4.1 Pourquoi ajouter des identifiants techniques `Id SERIAL` / `Id BIGSERIAL`

**Le concept clé : la stabilité d'un identifiant.**

Un identifiant **doit être immuable** : s'il change de valeur, toutes les références (FK, liens applicatifs) doivent être mises à jour, avec un risque élevé de corruption. Or :

- **`step_order` est réordonnable par définition.** Le besoin métier central est de pouvoir *« déplacer l'étape 1 après l'étape 4 »* → `step_order` passe de `1` à `4`. L'identifiant sémantique naturel d'une étape de processus (`processus + position`) **change donc de valeur dans la vie normale de l'entité**.
- **`label` est modifiable.** Un utilisateur peut corriger le titre d'une étape, ou l'admin renommer une étape d'un processus système.

On ajoute donc bien :

```
restoration_process_steps :: Id SERIAL    (PK technique)
restoration_steps        :: Id BIGSERIAL (PK technique)
```

mais **on ne jette pas la sémantique** : l'unicité métier est exprimée par des contraintes `UNIQUE` (tableau en §5). C'est exactement la nuance *« identifiant sémantique au MCD, id technique au MPD quand le critère de stabilité l'exige »*.

### 4.2 Pourquoi la PK `(label, created_at)` de `restoration_steps` a été abandonnée

Deux défauts rédhibitoires au niveau physique :

1. **Instabilité** : `label` est modifiable par l'utilisateur → une modification de titre aurait dû être propagée à toutes les FK (dont `step_pics`).
2. **Non-unicité dans le cas du clonage** : lors de la création d'un projet, les étapes sont **copiées en masse depuis le processus système** et reçoivent toutes le **même `created_at`** (`NOW()` d'une transaction). Deux étapes synonymes dans un même processus (démontage vs remontage) auraient produit une **collision de PK**.

La nouvelle PK `Id BIGSERIAL` gère ces deux cas ; l'unicité métier « un seul libellé par étape et par projet » est conservée par la contrainte `uq_project_steps_label`.

### 4.3 Pourquoi `UNIQUE … DEFERRABLE INITIALLY DEFERRED`

C'est le choix qui **rend le réordonnancement réellement fiable en une seule requête**.

Sans contrainte UNIQUE, deux étapes d'un même processus pourraient partager la même position → ordre ambigu. Avec une contrainte UNIQUE **normale (immédiate)**, le réordonnancement multi-lignes échoue : pendant l'exécution de l'`UPDATE`, chaque ligne est vérifiée immédiatement, et on passe forcément par un **état transitoire conflictuel** :

> Déplacer l'étape 1 après l'étape 4 : l'étape 1 devient 4, mais l'ancienne étape 4 est encore à 4 au moment de la vérification → violation UNIQUE.

Avec `DEFERRABLE INITIALLY DEFERRED`, PostgreSQL **reporte la vérification au `COMMIT`** : l'état final est garanti unique, sans conflit transitoire (démonstration en annexe A).
### 4.4 Pourquoi la FK `restoration_projects → restoration_processes`

Le MCD exprimait l'association *« un projet instancie une configuration de restauration »*, mais le script SQL initial **ne la matérialisait pas** : rien ne reliait `restoration_projects` au couple `(movement_type, complication_type)`, et un projet pouvait référencer un processus inexistant.

Le MPD a donc :
- ajouté les colonnes `movement_type` et `complication_type` (`NOT NULL`), report de l'identifiant sémantique par **association** (pas de table d'association intermédiaire — l'association n'apporte pas de données propres) ;
- créé une **FK composite** qui garantit l'intégrité référentielle.

C'est aussi le point d'ancrage du **clonage** : `restoration_projects` sait quel processus copier.

### 4.5 Pourquoi `step_pics` est reliée à `step_id` (et l'abandon du couplage aux libellés)

Dans le script initial, `step_pics` référençait l'étape par `(label, created_at)` — la PK composite d'origine. Dès lors que cette PK devient instable (voir §4.2), on branche les photos sur l'**id technique stable** de l'étape, avec `ON DELETE CASCADE` : la suppression d'une étape supprime ses photos, comportement métier attendu.

### 4.6 Pourquoi NE PAS avoir ajouté de lien de traçabilité modèle → projet (`process_step_id`)

Choix volontaire et assumé : le clonage à la création du projet rend les étapes de projet **totalement indépendantes** du processus système. Conserver une colonne de provenance (FK vers `restoration_process_steps(Id)` nullable) aurait été tentant, mais :

- la mise à jour d'un processus système par l'admin **ne doit jamais modifier** les projets existants (ni leur nom, ni leur liste, ni leur ordre) — c'est une exigence métier explicite ;
- une FK de traçabilité n'apporte rien pour la V1 et ajoute de la complexité (comportement en cas de modification/suppression du modèle).

Décision : **clonage simple + indépendance totale**. Les deux tables d'étapes sont volontairement **sans lien physique** entre elles.
---

## 5. Récapitulatif des contraintes ajoutées (spécifiques au MPD)

| Contrainte | Table | Colonnes | Problème résolu | Lien avec le besoin métier |
|---|---|---|---|---|
| `uq_process_steps_order` | `restoration_process_steps` | `(movement_type, complication_type, step_order)` — **deferrable** | Une seule étape par position dans un processus | Réordonnancement sans état transitoire conflictuel (§4.3) |
| `uq_process_steps_label` | `restoration_process_steps` | `(movement_type, complication_type, label)` | Pas de doublon de libellé dans un même processus | Checklists types lisibles et non ambiguës |
| `uq_project_steps_order` | `restoration_steps` | `(name, created_at_1, step_order)` — **deferrable** | Une seule étape par position dans un projet | Réordonnancement d'un projet (§4.3) |
| `uq_project_steps_label` | `restoration_steps` | `(name, created_at_1, label)` | Pas de doublon de libellé dans un projet | Journal de restauration lisible |
| FK projet → processus | `restoration_projects` | `(movement_type, complication_type)` | Un projet ne peut référencer qu'un processus existant | L'association MCD était absente du script initial (§4.4) |
| FK `step_pics` cascade | `step_pics` | `(step_id) → restoration_steps(Id)` | Les photos suivent l'étape, références stables | Suppression propre de la documentation photo (§4.5) |

---

## 6. Points de vigilance restants (choix assumés, à surveiller)

Pour être honnête face à un jury, voici les identifiants sémantiques **conservés tels quels** mais qui présentent des fragilités connues — non bloquantes pour la V1 :

| Élément | Fragilité | Arbitrage |
|---|---|---|
| `users.mail` en PK | Un changement d'adresse e-mail forcerait à propager la FK (projets). | Accepté en V1 (le mail est stable en pratique). Alternative future : `User Id UUID`. |
| `restoration_projects(name, created_at)` en PK | `name` est modifiable par l'utilisateur ; la PK composite est **lourde à reporter** (les tables filles portent `(name, created_at_1)`). | Conservé par cohérence avec le MCD et pour limiter le chantier. Alternative future : `Id BIGSERIAL`. |
| `performance_measurements(created_at)` en PK | Deux mesures dans la **même microseconde** collideraient (improbable en pratique). | Accepté : la saisie est manuelle, risque négligeable. |
| `expenses(label, expense_date)` en PK | `label` modifiable ; deux dépenses au même libellé au même instant interdites par construction. | Accepté : cohérent avec le MCD, faible risque métier. |

> **Principe général pour l'oral** : le MCD **choisit** les identifiants sémantiques ; le MPD **corrige** ce que la technique ne peut pas accepter (instabilité, unicité, lourdeur de FK), en protégeant systématiquement la sémantique par des contraintes. Ce n'est pas un conflit entre les deux modèles : c'est **leur complémentarité naturelle**.
---

## Annexe A — Démonstration du réordonnancement grâce à la contrainte deferrable

Cas : *« déplacer l'étape 1 après l'étape 4 »* dans un processus.

```sql
BEGIN;
UPDATE restoration_process_steps
   SET step_order = CASE
         WHEN step_order = 1 THEN 4               -- l'étape déplacée reçoit sa nouvelle position
         WHEN step_order BETWEEN 2 AND 4
              THEN step_order - 1                 -- les étapes 2, 3, 4 remontent d'un cran
         ELSE step_order
       END
 WHERE movement_type   = 'mecanique_manuel'
   AND complication_type = 'simple'
   AND step_order BETWEEN 1 AND 4;
COMMIT;
```

Résultat : les ordres passent de `1,2,3,4` à `2,3,4,1`. Sans `DEFERRABLE INITIALLY DEFERRED`, l'`UPDATE` échouerait dès l'assignation de l'étape 1 à la position 4 (encore occupée momentanément par l'étape 4) ; avec, la vérification d'unicité est reportée au `COMMIT`, après le dernier `UPDATE`.

Le **même patron** s'applique à `restoration_steps` avec `(name, created_at_1)` comme filtre parent.

---

## Annexe B — Autres opérations d'entretien de l'ordre (patterns documentés dans `script_db.sql`)

```sql
-- Insérer une nouvelle étape en position k (décale k..n vers le bas)
BEGIN;
UPDATE restoration_process_steps SET step_order = step_order + 1
 WHERE movement_type=$m AND complication_type=$c AND step_order >= $k;
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES ($label, $k, $desc, $m, $c);
COMMIT;

-- Supprimer l'étape de position k (décale k+1..n vers le haut)
BEGIN;
DELETE FROM restoration_process_steps WHERE Id = $id;
UPDATE restoration_process_steps SET step_order = step_order - 1
 WHERE movement_type=$m AND complication_type=$c AND step_order > $k;
COMMIT;
```

Ces deux opérations (et le `MOVE` de l'annexe A) sont les composants qui rendent le schéma **conforme au cas d'usage métier** : *« ajouter, intervertir, déplacer des étapes facilement »*.