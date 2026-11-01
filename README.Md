Projet final de la formation Concepteur Developpeur d'Applications - Simplon

Auteur: Clément MARTIN

## Démarrer en local

Prérequis : Node 24, npm, Docker.

```bash
cp .env.example .env                              # une seule fois
docker compose up -d                              # PostgreSQL 16 (port 5435) et MailDev (http://localhost:1080)
npm install
npm run db:migrate -w apps/api                    # crée les tables
npm run db:seed -w apps/api                       # charge le référentiel (mouvements, complications, étapes types)
npm run dev:api                                   # API sur http://localhost:3000
npm run dev:web                                   # web sur http://localhost:5173/apercu-etapes
```

La première fonctionnalité de bout en bout est l'**aperçu des étapes** : on choisit un type de mouvement et des
complications, l'API génère la checklist de démontage et de remontage correspondante.

## Tests

```bash
npm run test:api    # unitaires, puis intégration sur PostgreSQL (la base watch_tracker_test est recréée à chaque lancement)
npm run test:web
```

## Documentation

- `docs/CONCEPTION-TECHNIQUE.md` : choix techniques (décisions D1 à D10) et contrat d'API.
- `docs/superpowers/plans/` : plan d'implémentation de la v1 (33 tâches).
- `docs/SPECS.md`, `docs/REGLES-GESTION.md` : spécifications et règles de gestion.
