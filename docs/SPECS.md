# Spécifications fonctionnelles

Ce document décrit les comportements attendus de l’application pour aider un formateur indépendant ou occasionnel à concevoir, piloter et améliorer une journée de formation présentielle.

Les spécifications ci-dessous sont formulées en Gherkin afin de décrire le comportement métier attendu, sans entrer dans des détails d’interface ou de technique.

Les éléments de cadrage global, la cible et les arbitrages produit sont détaillés dans le PRD.

## 1. Objectif fonctionnel

L’application doit permettre à un formateur indépendant ou occasionnel de :
- construire une journée de formation séquence par séquence ;
- suivre le déroulé et gérer son timing pendant l’animation ;
- recueillir des retours apprenants après la session ;
- Améliorer le déroulé de sa journée d’une version à l’autre.


## 2. Scénarios Gherkin

### Scénario 1 — Créer un scénario pédagogique
**En tant que** formateur junior indépendant,  
**je veux** créer un nouveau scénario pédagogique,  
**afin de** structurer ma journée de formation par séquence avec les informations essentielles.

**Given** j’ai une formation à préparer pour un public adulte  
**When** je crée un nouveau scénario pédagogique  
**Then** je peux ajouter une ou plusieurs séquences avec un objectif, une durée, une activité et un support  


---

### Scénario 2 — Ajouter et organiser les séquences
**En tant que** formateur junior indépendant,  
**je veux** ajouter et réorganiser les séquences d’une journée,  
**afin de** construire un déroulé cohérent et équilibré.

**Given** j’ai créé un scénario pédagogique  
**When** j’ajoute une séquence de formation  
**Then** la séquence est intégrée au déroulé avec son ordre, sa durée et son type d’activité et la durée totale est recalculée

**And** si je modifie l’ordre des séquences  
**Then** le déroulé est mis à jour

---

### Scénario 3 — Suivre le timing pendant l’animation
**En tant que** formateur en animation,  
**je veux** suivre le timing de ma session en cours d'animation,  
**afin de** savoir si je suis en avance, à l’heure ou en retard.

**Given** ma session est planifiée avec une durée totale  
**When** je démarre l’animation  
**Then** je peux voir le temps écoulé, le temps restant et l’écart éventuel avec le planning prévu

---

### Scénario 4 — Recueillir un retour après une séquence
**En tant que** formateur,  
**je veux** recueillir un retour apprenant après une séquence,  
**afin de** savoir ce qui a fonctionné et ce qui doit être amélioré.

**Given** une séquence vient d’être animée  
**When** j’ajoute un retour d’évaluation  
**Then** je peux enregistrer une note, un commentaire et une observation d’amélioration

---

### Scénario 5 — Améliorer une session d’une fois sur l’autre
**En tant que** formateur récurrent,  
**je veux** retrouver l’historique d’une session précédente,  
**afin de** faire évoluer ma journée de formation à partir des retours obtenus.

**Given** j’ai déjà animé une session similaire  
**When** je rouvre cette session pour préparer une nouvelle version  
**Then** je peux consulter les retours précédents et modifier les séquences concernées

## 3. Critères d’acceptation

- Une session peut être créée avec au moins une séquence.
- Une séquence peut être modifiée après création.
- Le total de la session est recalculé si une durée change.
- Une séquence peut être déplacée facilement (drag and drop) dans l’ordre de la journée.
- Le formateur peut consulter le scénario pendant l’animation.
- Le formateur peut ajouter un retour après une séquence.
- Le formateur peut retrouver les retours d’une session précédente.
- Le feedback peut être saisi sans identification nominative.

## 4. Règles métier principales

### 4.1 Sessions
- Une session peut contenir au moins une et jusqu'à plusieurs séquences.
- Une session possède un titre, une durée totale et un statut.

### 4.2 Séquences
- Une séquence appartient à une ou plusieurs sessions.
- Une séquence possède au minimum un titre, une durée et un type d’activité.
- Une séquence peut contenir un objectif, un support d’animation, un contenu et une note interne.
- Les séquences doivent pouvoir être réorganisées dans la session.
- Toute modification d’une durée doit mettre à jour le total de la session.

### 4.3 Animation
- Le formateur doit pouvoir consulter le déroulé pendant l’animation.
- Le système doit indiquer le temps écoulé, le temps restant et l’écart avec le planning prévu.
- Le suivi du timing doit rester lisible rapidement pendant l’action.

### 4.4 Retours et amélioration
- Une séquence peut recevoir un ou plusieurs retours après animation.
- Un retour peut contenir une note, un commentaire libre et une observation d’amélioration.
- Les retours peuvent être rattachés à une séquence précise.
- L’historique d’une session doit permettre de voir les évolutions d’une version à l’autre.

### 4.5 Feedback apprenant
- Le feedback apprenant doit pouvoir être saisi simplement après une séquence ou après la journée.
- Le feedback peut être anonyme.
- Le formateur doit pouvoir consulter une synthèse des retours.

## 5. Questions ouvertes

- Le feedback doit-il être saisi au niveau global de la journée ou également séquence par séquence  ?
- Le formateur doit-il pouvoir dupliquer une session existante ?
- l'application doit-elle conserver un historique de l'évolution des sessions ?
- Faut-il une synthèse automatique des retours ou une simple liste ?
- Faut-il afficher le temps restant par séquence ou seulement sur la journée complète ?

