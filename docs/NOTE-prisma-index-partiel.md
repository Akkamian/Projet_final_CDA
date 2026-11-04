# Note — Un index partiel mal interprété par Prisma (correction manuelle du schéma)

> Écrite le 2026-11-04. Matière pour la présentation orale et le dossier de fin de formation : un cas concret où l'outil de génération ne reflète pas fidèlement le modèle de données voulu, et la façon dont je l'ai détecté, corrigé et verrouillé.

## 1. Le besoin métier

Une montre peut avoir **plusieurs projets de restauration** au fil du temps (RG-MON-10), mais **un seul projet « en cours » à la fois** (RG-PRJ-09). Les autres sont « terminés ».

## 2. Comment la règle est garantie dans la base

Un **index unique partiel** PostgreSQL (`db/script_db.sql`, repris dans la migration 0) :

```sql
CREATE UNIQUE INDEX uq_restoration_projects_one_in_progress
    ON restoration_projects (watch_id)
    WHERE status = 'in_progress';
```

Il n'est unique que **parmi les lignes dont le statut est `in_progress`**. Deux projets terminés sur la même montre sont donc permis, deux projets en cours ne le sont pas. La règle vit dans la base, donc aucun code applicatif ne peut la contourner.

## 3. Le problème

`prisma db pull` (introspection de la base) a produit dans `schema.prisma` :

```prisma
model restoration_projects {
  watch_id Int @unique(map: "uq_restoration_projects_one_in_progress", where: raw("..."))
}
model watches {
  restoration_projects restoration_projects?   // un seul projet, relation 1-1
}
```

Prisma a vu un `UNIQUE` sur `watch_id` et en a déduit une relation **un à un** : le client généré croit qu'une montre n'a qu'un projet. Or la base accepte plusieurs projets par montre. Le schéma Prisma **contredisait le modèle de données voulu**, alors que la base, elle, était correcte.

Conséquence concrète : la requête `include: { restoration_projects: true }` renvoie un objet au lieu d'une liste, donc il devient impossible de charger l'historique des projets d'une montre (fiche, tableau de bord, nouvelle révision).

## 4. Détection

Pas par un test, par une **relecture du schéma généré** pendant la tâche 14 (création d'une montre et de son premier projet). La création fonctionnait quand même, ce qui rend l'erreur sournoise : elle n'aurait explosé qu'à la tâche suivante.

## 5. Correction (manuelle, dans `apps/api/prisma/schema.prisma`)

1. Retirer le `@unique(...)` de `watch_id` (Prisma ne sait pas exprimer un index partiel).
2. Passer la relation en liste : `restoration_projects restoration_projects[]`.
3. `npm run db:generate -w apps/api`.
4. Adapter le code qui supposait un objet (`toWatchDetail`).

**La base ne change pas** : l'index partiel reste dans la migration SQL, qui est la source de vérité de la règle. Le schéma Prisma ne sert qu'à typer le client.

## 6. Verrouillage

Un test d'intégration sert de garde-fou (`apps/api/test/db-constraints.int-spec.ts`, « RG-MON-10 une montre a plusieurs projets : la relation Prisma est une liste ») : il crée deux projets sur une montre et vérifie que la relation est bien une liste. Il a été écrit **avant** la correction (rouge), puis la correction l'a fait passer (vert). Si un futur `prisma db pull` remet le `@unique`, ce test échoue, avec un commentaire qui indique quoi corriger.

## 7. Ce que j'en retiens

- **Un outil de génération n'est pas une source de vérité.** Le modèle (MCD, règles de gestion) prime. Ici, la base respecte la règle, le code généré la déformait.
- **Les règles d'intégrité qui dépassent ce que l'ORM exprime** (index partiels, `CHECK`, cascades) doivent être **testées sur un vrai PostgreSQL**, pas supposées, et gardées dans la migration SQL.
- **Un défaut silencieux** (qui ne casse rien tout de suite) se verrouille par un test, sinon il revient au prochain `db pull`.
- Conséquence sur le workflow : migration SQL d'abord, puis `schema.prisma` retouché à la main ; `db pull` seulement pour l'amorçage ou à vérifier au diff.

## 8. Formulations prêtes pour l'oral

- « Prisma a lu mon index partiel comme une contrainte d'unicité complète et a transformé ma relation un-à-plusieurs en un-à-un. J'ai corrigé le schéma à la main et ajouté un test qui échoue si l'erreur revient. »
- « La règle métier est garantie par la base, pas par l'ORM : l'ORM ne fait que la décrire, et il peut la décrire de travers. »

## Références

`docs/REGLES-GESTION.md` (RG-MON-10, RG-PRJ-09) · `db/script_db.sql` · `apps/api/prisma/schema.prisma` · `docs/CONCEPTION-TECHNIQUE.md` (D3, source de vérité du schéma) · commit `dcb7964`.
