# Fidélité aux maquettes, sous-projet E : compte et connexion

Date : 2026-11-06. Branche `feat/fidelite-maquettes`. Précédents : A structure commune, B tableau de bord, C fiche montre, D formulaires et confirmations.

## Objectif

Aligner l'écran « Mon compte » et les cinq écrans d'authentification sur les maquettes `design/2026-09-17-screen-account-desktop-…` et `design/2026-10-09-screen-auth-*`, sans changer les règles métier ni l'API. Périmètre décidé avec l'auteur : tout ce que montrent les maquettes est implémenté ; SPECS.md et CONCEPTION-TECHNIQUE.md sont mis à jour. Audit : sections 5 et 6 de `.superpowers/sdd/2026-11-05-fidelite-structure-commune/audit-ecarts-maquettes.md`.

Décision de l'auteur : les mentions « Conditions générales » et « Confidentialité » restent du texte sans lien (aucune de ces pages n'existe).

## Écran « Mon compte »

Colonne de `--settings-max` (720 px), cartes empilées :

1. **Compte** : avatar 52 px (composant `Avatar` existant), email, « Membre depuis <mois année> » (`createdAt`), « Adresse vérifiée le <date> » (`emailVerifiedAt`, ligne absente si null).
2. **Statistiques** : 4 tuiles (Montres, En cours, Terminées, Vendues) sur une ligne en desktop, 2×2 sous 640 px. Valeurs = compteurs globaux de `GET /watches` (`counts`), lus par un appel direct `apiFetch('/watches?page=1&pageSize=1')` pour ne pas modifier l'état du tableau de bord (le store `watches` garde ses filtres). En cas d'échec, les tuiles affichent « – » ; l'écran reste utilisable.
3. **Sécurité** : ligne « Mot de passe •••• » avec bouton « Modifier » ; ligne « Dernier changement » (`passwordChangedAt`, « Jamais modifié » si null). Le bouton ouvre une `Sheet` « Modifier le mot de passe » avec les trois champs (actuel, nouveau, confirmation), Annuler / Modifier. Règles inchangées (RG-CPT-03 : 8 caractères minimum, confirmation identique) ; l'erreur reste dans la feuille, le succès ferme la feuille et affiche « Mot de passe modifié. » dans la page (`role="status"`). Un enregistrement en cours rend la feuille non fermable (`busy`, comme en D).
4. **Session** : texte « La déconnexion ferme la session de cet appareil. » (on garde la formulation actuelle, pas « révoque le refresh token ») et bouton « Se déconnecter ».
5. **Suppression du compte** : texte actuel, bouton « Supprimer mon compte », `ConfirmDialog` actuel avec champ mot de passe (API et `data-test` inchangés).

Mobile : pas de maquette ; cartes empilées, feuilles du bas (comportement de `Sheet`). Le lien « ← Mes montres » disparaît : la navigation de A suffit (écart assumé, `PageHeader` porte le titre).

## Écrans d'authentification

Nouveau composant `AuthLayout` (slot par défaut) utilisé par Connexion, Inscription, Mot de passe oublié, Réinitialisation et Vérification d'adresse :
- **Sous 900 px** : marque en haut (logo + « Watch Restoration Tracker »), bloc de formulaire ancré en bas de l'écran, sans cadre factice.
- **À partir de 900 px** : deux colonnes `1.15fr / 1fr`. Panneau de marque à gauche (logo, cadran en SVG, slogan « Le journal de vos restaurations horlogères. », trois puces) ; formulaire à droite. Le panneau est masqué sous 900 px.

Nouveau composant `PasswordField` (étiquette, champ, bouton œil `aria-pressed`, `aria-label` « Afficher / Masquer le mot de passe », message d'erreur de champ avec `aria-invalid` et `aria-describedby`). Utilisé par tous les champs mot de passe, y compris la feuille du compte. `v-model`, `autocomplete`, `maxlength` transmis ; les `id` actuels sont conservés (les tests et e2e les utilisent).

Styles communs : champs 44 px, fond `--surface`, étiquettes 13 px `--text-secondary` ; bannières avec icône (erreur rouge ; avertissement ambre « adresse non vérifiée » avec sous-texte) ; pied de page avec filet (« Pas encore de compte ? Créer un compte ») ; accroche courte (`.auth-lead`) sous le titre.

Par écran :
- **Connexion** : « Mot de passe oublié ? » aligné à droite au-dessus du bouton ; bannière ambre avec « Renvoyer le lien de vérification » (`data-test="resend"` conservé).
- **Inscription** : mention CGV / confidentialité en texte simple ; champ mot de passe avec œil et aide « 8 caractères minimum ».
- **Mot de passe oublié, réinitialisation, vérification** : aucune maquette ; même mise en page et mêmes composants. « Vérifiez votre boîte mail » (confirmation d'envoi) reçoit une pastille de confirmation de 56 px par analogie avec la maquette.

Les messages d'erreur et de succès existants, les redirections et la protection contre les redirections externes (`destination()`) sont inchangés.

## Documents

- SPECS.md : scénarios du compte (identité, statistiques, changement de mot de passe depuis une feuille) et de l'authentification (affichage du mot de passe, bannières).
- CONCEPTION-TECHNIQUE.md : `AuthLayout`, `PasswordField`, statistiques du compte via `GET /watches`.
- REGLES-GESTION.md : aucune règle métier nouvelle ; matrice de tests mise à jour si besoin.

## Tests

- Unitaires : `PasswordField` (bascule œil, `aria-pressed`, erreur), `AuthLayout`, les cinq vues d'authentification (comportements actuels conservés), `AccountView` (cartes, tuiles, « Jamais modifié », feuille de mot de passe : succès ferme et notifie, erreur reste ouverte, `busy`).
- e2e : parcours d'authentification existants adaptés ; changement de mot de passe depuis la feuille ; suppression de compte inchangée.
- Visuel : captures Chrome à 390, 768 et 1280 px comparées aux maquettes ; vérifier l'absence de débordement horizontal.

## Hors périmètre

API (inchangée), pages CGV et confidentialité, nouvelles fonctions de compte (changement d'email, etc.).
