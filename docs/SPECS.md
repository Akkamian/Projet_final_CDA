# Spécifications fonctionnelles

Ce document décrit les comportements attendus de l’application pour aider un horloger amateur à documenter une restauration de montre étape par étape, avec photos, notes et historique.

Les spécifications ci-dessous sont formulées en Gherkin afin de décrire le comportement métier attendu, sans entrer dans des détails d’interface ou de technique.

## 1. Objectif fonctionnel

L’application doit permettre à un horloger amateur de :
- créer un projet de restauration de montre ;
- suivre les étapes de démontage et de remontage dans l’ordre ;
- ajouter des photos et des notes à chaque étape ;
- marquer une étape comme validée ;
- garder une trace de l’avant / après ;
- retrouver l’historique complet de la restauration.

## 2. Scénarios Gherkin

### Scénario 1 — Créer une restauration
**En tant que** horloger amateur,  
**je veux** créer une nouvelle restauration de montre,  
**afin de** documenter mon projet dès le début.

**Given** je suis sur la page de création d’un projet  
**When** je saisis un titre, une description et une référence de montre ou de calibre  
**Then** la restauration est créée et prête à recevoir des étapes

---

### Scénario 2 — Ajouter des étapes
**En tant que** horloger amateur,  
**je veux** ajouter des étapes de démontage et de remontage,  
**afin de** suivre la logique de la restauration dans l’ordre chronologique.

**Given** j’ai créé une restauration  
**When** j’ajoute une étape  
**Then** l’étape est enregistrée dans l’ordre du projet avec un titre et une position

**And** je peux ajouter plusieurs étapes successives  
**Then** la restauration conserve un déroulé chronologique clair

---

### Scénario 3 — Valider une étape
**En tant que** horloger amateur,  
**je veux** valider une étape terminée,  
**afin de** savoir où j’en suis dans la restauration.

**Given** une étape existe dans ma restauration  
**When** je marque cette étape comme validée  
**Then** l’étape passe au statut terminé

**And** je peux voir les étapes déjà réalisées et celles restant à faire

---

### Scénario 4 — Ajouter des photos à une étape
**En tant que** horloger amateur,  
**je veux** ajouter une ou plusieurs photos à une étape,  
**afin de** conserver des repères visuels utiles pour le remontage.

**Given** une étape est en cours ou terminée  
**When** j’ajoute une photo  
**Then** la photo est associée à cette étape

**And** je peux ajouter plusieurs photos pour la même étape

---

### Scénario 5 — Ajouter des notes de restauration
**En tant que** horloger amateur,  
**je veux** écrire une note sur une étape,  
**afin de** garder une trace de mes observations.

**Given** je consulte une étape  
**When** je saisis une note libre  
**Then** la note est sauvegardée avec l’étape

**And** je peux y mentionner les difficultés rencontrées, les pièces remplacées ou toute remarque utile

---

### Scénario 6 — Modifier une étape après coup
**En tant que** horloger amateur,  
**je veux** modifier une étape déjà créée,  
**afin de** corriger ou compléter ma documentation après la restauration.

**Given** une étape existe déjà  
**When** je modifie son titre, sa note ou ses photos  
**Then** la mise à jour est enregistrée sans supprimer l’historique du projet

---

### Scénario 7 — Consulter l’avant / après
**En tant que** horloger amateur,  
**je veux** visualiser l’avant et l’après de ma restauration,  
**afin de** valoriser le résultat final et comparer l’état initial à l’état terminé.

**Given** ma restauration contient au moins une photo de départ et une photo finale  
**When** j’ouvre la vue principale du projet  
**Then** je vois clairement l’avant / après de la montre

---

### Scénario 8 — Consulter l’historique
**En tant que** horloger amateur,  
**je veux** retrouver mes restaurations passées,  
**afin de** garder une mémoire de mes projets dans le temps.

**Given** j’ai déjà terminé une ou plusieurs restaurations  
**When** j’ouvre l’historique  
**Then** je peux retrouver chaque projet avec son titre, sa date et son état d’avancement

## 3. Critères d’acceptation

- Une restauration peut être créée avec un titre et une référence.
- Une restauration peut contenir plusieurs étapes.
- Les étapes sont ordonnées chronologiquement.
- Une étape peut être marquée comme validée.
- Une étape peut recevoir une ou plusieurs photos.
- Une étape peut recevoir une note libre.
- Une étape peut être modifiée après création.
- Une restauration peut afficher une vue avant / après.
- L’historique des restaurations est consultable.

## 4. Règles métier principales

### 4.1 Restaurations
- Une restauration représente un projet de restauration d’une montre.
- Une restauration possède au minimum un titre.
- Une restauration peut contenir une description, une référence de montre, une référence de calibre et des photos globales.
- Une restauration conserve un historique consultable.

### 4.2 Étapes
- Une étape appartient à une restauration.
- Une étape possède au minimum un titre et un ordre.
- Une étape peut être marquée comme en cours, validée ou à faire.
- Une étape peut contenir plusieurs photos.
- Une étape peut contenir une note libre.
- Une étape peut mentionner des pièces remplacées et des difficultés rencontrées.
- Une étape peut être modifiée après création.

### 4.3 Photos
- Les photos peuvent être associées à une étape précise.
- Une restauration peut contenir une photo d’avant et une photo d’après.
- Les photos doivent servir de repères visuels pour la restauration.

### 4.4 Historique
- L’utilisateur peut consulter la liste de ses restaurations.
- Une restauration terminée reste accessible.
- La restauration conserve la trace des étapes validées et des notes associées.

## 5. Questions ouvertes

- Faut-il imposer un modèle d’étapes prérempli pour les mouvements les plus courants ?
- Faut-il permettre de réordonner les étapes après création ?
- Faut-il autoriser une étape à contenir plusieurs sous-photos ou seulement une galerie simple ?
- Faut-il ajouter une vue synthétique de la restauration terminée ?
- Faut-il prévoir plus tard une exportation du journal de restauration ?