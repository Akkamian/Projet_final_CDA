# Guide de déploiement — Watch Restoration Tracker (v1)

> Cible : hébergement mutualisé **PlanetHoster (N0C)**, sans Docker : front statique, API Node.js lancée par **Passenger**, PostgreSQL de l'hébergement, photos dans un stockage objet compatible S3.
> Ce guide décrit ce qui a été vérifié sur le poste de développement et signale ce qui reste **à confirmer auprès de PlanetHoster** avant le premier déploiement (section 2). Rien de ce qui concerne l'hébergeur lui-même n'a été éprouvé.

## 1. Ce qui est vérifié en local

| Vérification | Résultat |
|---|---|
| `npm run build -w apps/web` | Succès, sans erreur de type (`vue-tsc -b`), `apps/web/dist/` statique |
| Compilation de l'API (`tsc` avec `tsconfig.build.json`, même sortie que `nest build`) | Succès, sans erreur de type |
| API compilée lancée avec `NODE_ENV=production` et `COOKIE_SECURE=true` | `GET /health` répond 200 ; inscription, vérification, connexion (200 avec jeton d'accès) ; le cookie de renouvellement porte `HttpOnly; Secure; SameSite=Lax; Path=/auth` ; un mauvais mot de passe donne 401 ; une route sans jeton donne 401 |
| Parcours de bout en bout (`npm run test:e2e`) | 5 parcours au vert (voir tâche 32) |

`npm run build -w apps/api` (`nest build`) efface puis recrée `apps/api/dist/` : c'est la commande à lancer sur le serveur ou avant d'envoyer le dossier.

## 2. Points à confirmer auprès de PlanetHoster

À vérifier **avant** de figer le déploiement. Chacun est une question à poser ou une case à contrôler dans l'espace client N0C.

| # | Point | Pourquoi |
|---|---|---|
| 1 | **Version de Node disponible** (le poste est en Node 24) | NestJS 12 et Prisma 7 exigent une version récente ; si l'hébergeur propose moins, le déploiement est bloqué. |
| 2 | **Fichier de démarrage Passenger et modules ES** | L'API est en modules ES (`"type": "module"`, démarrage par `dist/main.js`, qui utilise un `await` de premier niveau). Confirmer que Passenger accepte ce point d'entrée tel quel, ou s'il faut un fichier de démarrage intermédiaire. |
| 3 | **Port d'écoute** | `main.ts` lit `PORT` (3000 par défaut). Confirmer comment Passenger transmet le port. |
| 4 | **Prisma sur le mutualisé** | Prisma 7 utilise l'adaptateur `pg` (pas de moteur binaire de requête), mais `prisma generate` doit tourner au build. Confirmer que la compilation (`npm ci` puis `npm run build -w apps/api`) est possible sur le serveur, sinon compiler ailleurs et envoyer `dist/` avec `node_modules`. |
| 5 | **Sous-domaine `api.` et certificat SSL** | Création dans N0C du sous-domaine (ex. `api.example.com`) et certificat associé : le cookie de renouvellement est `Secure` et n'est envoyé qu'en HTTPS. |
| 6 | **PostgreSQL** | Version proposée (la cible est 16), accès en `127.0.0.1` depuis l'application, nom de base, utilisateur et mot de passe. |
| 7 | **Fournisseur SMTP de production** (point ouvert D4) | SMTP de PlanetHoster ou service transactionnel : hôte, port, identifiants, expéditeur autorisé. Le code n'en dépend pas (variables `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`). Sans lui, ni vérification d'adresse ni mot de passe oublié. |
| 8 | **Stockage objet S3** | Fournisseur, point d'accès, bucket, clés ; le bucket doit permettre la lecture publique des photos (les URL sont enregistrées en base). Le disque de l'hébergement n'est pas utilisé en production (`STORAGE_DRIVER=s3`). |
| 9 | **IP vue par l'API derrière le proxy** | La limitation des tentatives compte par IP. Si l'API ne reçoit que l'IP du proxy, tous les utilisateurs partagent un compteur : il faudrait activer `trust proxy` (non fait, voir « Limites connues »). |
| 10 | **Pages CGV et Politique de confidentialité** | Le lien existe dans l'inscription ; le contenu reste à rédiger (hors plan). |

## 3. Préparer l'hébergement

1. **Sous-domaine et certificat** : créer `api.<domaine>` dans N0C et activer son certificat SSL. Le front sera servi par le domaine principal (ou `app.<domaine>`), en HTTPS lui aussi.
2. **Base PostgreSQL** : créer la base et son utilisateur dans N0C ; noter l'URL de connexion en `127.0.0.1`.
3. **Bucket S3** : créer le bucket et une clé d'accès limitée à ce bucket.
4. **Application Node** : créer l'application Node.js (version confirmée au point 1), racine de l'application dans un dossier à part (ex. `~/watch-tracker/apps/api`), URL = `https://api.<domaine>`.

## 4. Déployer l'API

Sur le serveur (ou en local si le point 4 l'impose), depuis la racine du dépôt :

```sh
npm ci                          # dépendances (les outils de build et Prisma sont des dépendances de développement)
npm run build -w apps/api       # prisma generate, puis nest build : apps/api/dist/
```

Renseigner les variables d'environnement de l'application dans l'interface de l'hébergeur, d'après `apps/api/.env.production.example` : `NODE_ENV=production`, `DATABASE_URL`, `WEB_ORIGIN` (l'origine exacte du front), `JWT_SESSION_SECRET` et `JWT_LINK_SECRET` (deux secrets distincts, longs et aléatoires), **`COOKIE_SECURE=true`**, `THROTTLE_*`, SMTP, `STORAGE_DRIVER=s3` et les quatre variables `S3_*`. En production l'API ne lit aucun fichier `.env`.

Démarrage : Passenger lance `dist/main.js` depuis `apps/api` (équivalent de `npm run start:prod`, soit `node dist/main`). Vérifier ensuite `https://api.<domaine>/health` : la réponse attendue est `{"status":"ok"}`.

## 5. Base de données : migrations puis référentiel

Depuis `apps/api`, avec `DATABASE_URL` pointant la base de production :

```sh
npm run db:migrate   # prisma migrate deploy : crée le schéma
npm run db:seed      # charge le référentiel (types de mouvement, complications, étapes types)
```

- Le référentiel n'est **pas idempotent** : à exécuter **une seule fois**, sur une base vide. Il n'est pas relu par un horloger (premier jet, hors plan).
- `prisma` et `tsx` sont des dépendances de développement : si le serveur est installé sans elles, lancer ces deux commandes depuis le poste, avec une `DATABASE_URL` joignable (tunnel SSH vers le PostgreSQL de l'hébergement), ou installer les dépendances de développement sur le serveur.

## 6. Publier le front

1. Définir l'adresse de l'API **avant** le build, car elle est incorporée au code : copier `apps/web/.env.production.example` en `.env.production` à la racine du dépôt (Vite lit les `.env` de la racine) et renseigner `VITE_API_URL=https://api.<domaine>`, ou exporter cette variable dans le shell.
2. `npm run build -w apps/web` produit `apps/web/dist/`.
3. Copier **le contenu** de `apps/web/dist/` dans `public_html` (ou le dossier du domaine du front). Le fichier `.htaccess` (copié depuis `apps/web/public/`) renvoie les URL comme `/watches/7` vers `index.html` ; sans lui, recharger une page autre que l'accueil donne une erreur 404.
4. Vérifier que `WEB_ORIGIN` côté API est exactement l'origine du front (schéma et domaine, sans barre finale) : c'est ce qui autorise les requêtes et le cookie entre les deux domaines.

## 7. Vérification après déploiement

1. `https://api.<domaine>/health` répond 200.
2. Créer un compte depuis le front : le mail de vérification arrive (SMTP), le lien ouvre bien la page de vérification du front.
3. Se connecter, créer une montre, ajouter une photo à une étape (vérifie le stockage S3 et l'URL publique).
4. « Mot de passe oublié » : le lien reçu ouvre la page de réinitialisation.
5. Recharger une page profonde (`/watches/<id>`) : pas de 404 (le `.htaccess`).

## 8. Limites connues

- **Limitation des tentatives** : compteur en mémoire par IP, remis à zéro à chaque redémarrage de l'application et non partagé entre instances. Derrière un proxy, l'IP vue peut être celle du proxy (point 9 de la section 2).
- **Suppression de compte et changement de mot de passe** ne sont pas limités en tentatives.
- Aucun journal ni surveillance n'est mis en place au-delà des journaux de l'application.
