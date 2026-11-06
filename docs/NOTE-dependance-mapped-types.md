# Note — Ajouter une dépendance ou dupliquer du code : le cas du DTO de modification

> Écrite le 2026-11-04. Matière pour la présentation orale et le dossier de fin de formation : une petite décision d'architecture où deux solutions sont acceptables, et la façon de la justifier. Elle a été prise lors de la tâche 17 (modifier une montre).

## 1. Le besoin

Pour modifier une montre (`PATCH /watches/:id`), l'API valide le corps de la requête avec un **DTO** (Data Transfer Object : une classe dont les décorateurs `class-validator` décrivent les règles). Les règles sont celles de la création : marque et modèle de 255 caractères au plus, prix entre 0 et 99 999 999,99 avec deux décimales au plus (RG-MON-07), date d'achat au format AAAA-MM-JJ et jamais dans le futur (RG-GEN-01), etc. Elles sont déjà écrites dans `CreateWatchDto` (une quarantaine de lignes de décorateurs).

À la modification, deux choses changent :
- **tous les champs deviennent facultatifs** : un champ absent reste inchangé (S10) ;
- **il n'y a pas d'étapes** : elles appartiennent aux projets, pas à la montre (RG-MON-08).

## 2. Les deux solutions

| | Recopier les décorateurs | Dériver le DTO avec `@nestjs/mapped-types` |
|---|---|---|
| Code | ~40 lignes dupliquées dans `UpdateWatchDto` | 1 ligne |
| Dépendance nouvelle | aucune | un paquet officiel Nest |
| Risque | une règle modifiée à un endroit mais pas à l'autre : la création et la modification divergent | aucun : la règle est écrite une seule fois |
| Lisibilité | toutes les règles visibles dans le fichier | il faut savoir ce que font `PartialType` et `OmitType` |

`@nestjs/mapped-types` est une petite bibliothèque publiée par l'équipe NestJS, qui fabrique un DTO à partir d'un autre en gardant ses validations :

```ts
export class UpdateWatchDto extends PartialType(OmitType(CreateWatchDto, ['steps'] as const)) {}
```

- `OmitType(CreateWatchDto, ['steps'])` : le DTO de création sans le champ `steps` ;
- `PartialType(...)` : tous les champs deviennent facultatifs, validations conservées.

## 3. La décision

J'ai retenu **la dérivation**, parce que :
- la règle « une seule source de vérité » pèse plus que le coût d'un paquet : si le prix maximum change, il change à un seul endroit ;
- le paquet est officiel (même éditeur que le framework), sans nouvelle sous-dépendance (`class-validator`, `class-transformer` et `reflect-metadata` étaient déjà installés), et sa version est figée (`12.0.1`) dans `package-lock.json` ;
- il s'agit de la méthode que la documentation de Nest recommande pour ce besoin.

Ce que cela coûte : une dépendance de plus à maintenir et à surveiller (mises à jour, failles). Si le projet voulait zéro dépendance supplémentaire, recopier les décorateurs reste une option valable, au prix d'une duplication.

## 4. Un piège rencontré en route

`PartialType` ajoute `@IsOptional()` à chaque champ, et `@IsOptional()` accepte aussi **`null`**, pas seulement l'absence. Or la marque, le modèle et le type de mouvement sont obligatoires en base (RG-MON-01) : un `null` aurait provoqué une erreur 500. Pire, `complicationCodes: null` effaçait **silencieusement toutes les complications** en répondant 200 (trouvé par la relecture finale).

Le service refuse donc `null` pour ces quatre champs (réponse 400, un test pour chacun). Pour retirer toutes les complications, il faut envoyer une liste vide `[]`. Pour le prix et la date d'achat, `null` est au contraire voulu : il efface la valeur (RG-MON-06).

À retenir : un outil qui « rend tout facultatif » change aussi le sens de `null` ; il faut le vérifier au lieu de le supposer.

## 5. Pour l'oral

- Un exemple concret de **compromis** : ajouter une dépendance contre dupliquer du code, avec des critères nommés (source de vérité unique, origine du paquet, coût de maintenance).
- Un exemple de **vigilance sur un outil** : le comportement de `@IsOptional` avec `null` n'était pas évident, et ce sont les tests et la relecture qui l'ont révélé.
- Pour les questions du jury : « Pourquoi ce paquet ? » (réponse : section 3) ; « Qu'est-ce qui se passe si on envoie `null` ? » (réponse : section 4).

Références : `apps/api/src/watches/dto/update-watch.dto.ts`, `apps/api/src/watches/watches.service.ts` (méthode `update`), `apps/api/test/watches-update.int-spec.ts`, tâche 17 du plan.
