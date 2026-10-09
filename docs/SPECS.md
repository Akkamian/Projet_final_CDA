# Spécifications fonctionnelles

Ce document décrit les comportements attendus de l'application, qui aide un horloger amateur à documenter la restauration de ses montres étape par étape (photos, notes), à suivre ses coûts et la marge d'une revente, et à suivre l'évolution des performances du mouvement.

Chaque fonctionnalité du périmètre v1 est traduite en scénario fonctionnel, formulé en « En tant que… je veux… afin de… » puis en Gherkin (Given / When / Then), sans entrer dans des détails d'interface ou de technique.

## 1. Objectif fonctionnel

L'application doit permettre à un horloger amateur de :
- se créer un compte privé, dont l'adresse email est vérifiée, et pouvoir le supprimer avec ses données ;
- enregistrer une montre (type de mouvement, complications, achat) et ouvrir un projet de restauration ou de révision sur cette montre ;
- obtenir une checklist de démontage et de remontage générée selon le mouvement et les complications, l'ajuster, et la réordonner à tout moment ;
- valider les étapes dans l'ordre de son choix, avec photos et notes ;
- corriger ses saisies après coup, rouvrir un projet terminé, et supprimer un projet ou une montre ;
- garder une trace de l'avant / après ;
- suivre les mesures de performance du mouvement dans le temps ;
- suivre ses coûts, renseigner la revente et obtenir la marge de la montre ;
- retrouver l'ensemble de ses montres et l'historique des interventions successives sur chacune.

## 2. Vocabulaire

- **Montre** : l'objet suivi. Elle porte le type de mouvement, les complications, l'achat et la revente.
- **Projet** (ou intervention) : une restauration ou une révision d'une montre. Une montre a 0 à n projets.
- **Étape** : une ligne de la checklist d'un projet.
- **Complication** : fonction supplémentaire d'une montre (chronographe, date, jour/date, petite seconde, réserve de marche). Une montre peut en cumuler plusieurs.
- **Type de mouvement** : mode de remontage, manuel ou automatique (le quartz est hors périmètre de la v1).

## 3. Scénarios Gherkin

### A. Compte

#### Scénario 1 — S'inscrire et vérifier son adresse email
**En tant que** horloger amateur,
**je veux** créer un compte et confirmer mon adresse email,
**afin de** disposer d'un espace personnel et privé.

**Given** je suis sur la page d'inscription
**When** je saisis une adresse email valide, un mot de passe et sa confirmation, et que j'accepte les Conditions Générales de Vente et la Politique de Confidentialité
**Then** mon compte est créé, aucune session n'est ouverte et un email de vérification m'est envoyé

**And** lorsque j'ouvre le lien reçu
**Then** mon adresse est confirmée et je peux me connecter

**And** l'adresse est enregistrée en minuscules, sans espace superflu
**And** si l'adresse est déjà utilisée par un compte, l'inscription est refusée avec un message explicite
**And** si la confirmation diffère du mot de passe, l'inscription est refusée avec un message explicite
**And** si les Conditions Générales de Vente et la Politique de Confidentialité ne sont pas acceptées, l'inscription est refusée

---

#### Scénario 2 — Être refusé tant que l'adresse n'est pas vérifiée
**En tant que** horloger amateur,
**je veux** que la connexion soit refusée tant que mon adresse n'est pas confirmée,
**afin de** garantir que le compte m'appartient.

**Given** mon compte existe mais mon adresse n'est pas vérifiée
**When** je tente de me connecter avec les bons identifiants
**Then** la connexion est refusée avec un message distinct de « identifiants invalides »

---

#### Scénario 3 — Réinitialiser un mot de passe oublié
**En tant que** horloger amateur,
**je veux** réinitialiser mon mot de passe depuis mon email,
**afin de** récupérer l'accès à mon compte.

**Given** je suis déconnecté
**When** je demande la réinitialisation en saisissant une adresse email
**Then** l'application affiche la même réponse que cette adresse corresponde ou non à un compte

**And** si un compte existe, un email contenant un lien à durée limitée m'est envoyé
**And** lorsque je saisis un nouveau mot de passe via ce lien
**Then** le mot de passe est modifié et le lien ne peut plus être réutilisé

---

#### Scénario 4 — Changer son mot de passe
**En tant que** horloger amateur connecté,
**je veux** changer mon mot de passe,
**afin de** garder mon compte sécurisé.

**Given** je suis connecté
**When** je saisis mon mot de passe actuel puis un nouveau mot de passe
**Then** le mot de passe est modifié

**And** si le mot de passe actuel est incorrect, le changement est refusé

---

### B. Montres et projets

#### Scénario 5 — Créer une montre et son premier projet
**En tant que** horloger amateur,
**je veux** créer une nouvelle montre et ouvrir un projet dessus,
**afin de** documenter ma restauration dès le début.

**Given** je suis sur le formulaire « Nouveau projet »
**When** je saisis la marque, le modèle, le type de mouvement et, éventuellement, des complications, un prix et une date d'achat
**And** je valide les étapes proposées
**Then** la montre, ses complications, son premier projet « en cours » et ses étapes sont créés en une seule opération

**And** si la création des étapes échoue, ni la montre ni le projet ne sont enregistrés
**And** le prix et la date d'achat sont facultatifs : une montre gardée de longue date peut ne plus avoir ces informations
**And** une date d'achat dans le futur est refusée

---

#### Scénario 6 — Générer les étapes d'après le mouvement
**En tant que** horloger amateur,
**je veux** que la checklist soit proposée selon le type de mouvement de ma montre,
**afin de** ne pas perdre l'ordre du démontage et du remontage.

**Given** je crée une montre à remontage manuel, sans complication
**When** l'aperçu des étapes est généré
**Then** il contient la liste de base du mouvement manuel, du démontage au remontage, dans l'ordre

**And** pour un mouvement automatique, la liste contient en plus la dépose et la pose du rotor et du module automatique

---

#### Scénario 7 — Intégrer les complications à la checklist
**En tant que** horloger amateur,
**je veux** que les complications de ma montre ajoutent leurs propres étapes au bon endroit,
**afin de** suivre aussi leur démontage et leur remontage.

**Given** je crée une montre à remontage manuel avec un chronographe et une date
**When** l'aperçu des étapes est généré
**Then** les étapes du chronographe et de la date sont intercalées entre les étapes de base (par exemple « Déposer les aiguilles chrono » entre « Déposer les aiguilles » et « Déposer le cadran »)

**And** chaque étape issue d'une complication indique le nom de cette complication
**And** une même complication propose les mêmes étapes quel que soit le type de mouvement

---

#### Scénario 8 — Ajuster l'aperçu avant de créer le projet
**En tant que** horloger amateur,
**je veux** modifier la liste proposée avant de la valider,
**afin de** l'adapter à mon calibre.

**Given** l'aperçu des étapes est affiché
**When** j'ajoute, supprime ou déplace une étape puis je clique sur « Créer le projet »
**Then** le projet est créé avec exactement la liste ajustée

**And** cette adaptation n'est pas enregistrée comme nouveau modèle et n'affecte ni les autres projets ni le référentiel d'étapes

---

#### Scénario 9 — Ouvrir une nouvelle révision sur une montre déjà suivie
**En tant que** horloger amateur,
**je veux** ouvrir un nouveau projet sur une montre que j'ai gardée,
**afin de** conserver l'historique de la montre sans tout ressaisir.

**Given** j'ai une montre non vendue dont le projet le plus récent est terminé
**When** je choisis « Nouvelle révision sur cette montre »
**Then** l'aperçu des étapes est proposé directement, sans ressaisir la montre

**And** à la création, un nouveau projet « en cours » est ajouté à la montre
**And** cette action n'est plus proposée si la montre est vendue
**And** elle est refusée tant qu'un projet est en cours sur la montre : une montre n'a qu'un projet en cours à la fois
**And** elle est aussi proposée sur une montre non vendue qui n'a plus aucun projet

---

#### Scénario 10 — Modifier les informations d'une montre
**En tant que** horloger amateur,
**je veux** corriger les informations d'une montre, dont ses complications,
**afin de** garder une fiche exacte.

**Given** une montre dont un projet a déjà des étapes
**When** je modifie ses complications
**Then** la montre est mise à jour

**And** les étapes des projets existants ne changent pas ; seules les nouvelles révisions utilisent les complications modifiées

---

#### Scénario 11 — Marquer un projet terminé
**En tant que** horloger amateur,
**je veux** déclarer un projet terminé,
**afin de** savoir où j'en suis dans mes restaurations.

**Given** un projet « en cours »
**When** je le marque comme terminé
**Then** son statut passe à « terminé »

**And** un projet déjà terminé ne peut pas être terminé une seconde fois

---

### C. Checklist et étapes

#### Scénario 12 — Valider une étape
**En tant que** horloger amateur,
**je veux** valider une étape terminée,
**afin de** savoir où j'en suis dans la restauration.

**Given** une étape à faire existe dans mon projet
**When** je la marque comme terminée
**Then** l'étape passe au statut terminé

**And** je vois d'un coup d'œil les étapes réalisées et celles qui restent à faire
**And** les étapes peuvent être validées dans n'importe quel ordre

---

#### Scénario 13 — Ajouter une étape personnalisée
**En tant que** horloger amateur,
**je veux** ajouter une étape que la liste type ne prévoit pas,
**afin de** suivre un démontage réel qui s'écarte du parcours habituel.

**Given** j'ouvre un projet en cours
**When** j'ajoute une étape avec un libellé
**Then** l'étape est enregistrée à la suite des étapes du projet

---

#### Scénario 14 — Modifier une étape après coup
**En tant que** horloger amateur,
**je veux** modifier une étape déjà créée,
**afin de** corriger ou compléter ma documentation.

**Given** une étape existe déjà
**When** je modifie son libellé, sa note ou ses photos
**Then** la mise à jour est enregistrée sans supprimer l'historique du projet

---

#### Scénario 15 — Réordonner les étapes d'un projet
**En tant que** horloger amateur,
**je veux** déplacer une étape dans la liste, à tout moment,
**afin que** mon journal reflète l'ordre réellement suivi.

**Given** un projet contenant plusieurs étapes, dont certaines avec notes et photos
**When** je déplace une étape à une autre position
**Then** les étapes sont renumérotées sans trou ni doublon

**And** les notes, les photos et le statut de chaque étape la suivent à sa nouvelle position
**And** l'opération est enregistrée en une seule fois : en cas d'échec, l'ordre précédent est conservé

---

#### Scénario 16 — Ajouter des notes de restauration
**En tant que** horloger amateur,
**je veux** écrire une note sur une étape,
**afin de** garder une trace de mes observations.

**Given** je consulte une étape
**When** je saisis une note libre
**Then** la note est sauvegardée avec l'étape

**And** je peux y mentionner les difficultés rencontrées, les pièces remplacées ou toute remarque utile

---

#### Scénario 17 — Ajouter des photos à une étape
**En tant que** horloger amateur,
**je veux** ajouter une ou plusieurs photos à une étape,
**afin de** conserver des repères visuels utiles pour le remontage.

**Given** une étape est en cours ou terminée
**When** j'ajoute une photo
**Then** la photo est associée à cette étape

**And** je peux ajouter plusieurs photos pour la même étape
**And** un fichier qui n'est pas une image JPEG, PNG ou WebP, ou qui dépasse 10 Mo, est refusé

---

### D. Avant / après

#### Scénario 18 — Consulter l'avant / après
**En tant que** horloger amateur,
**je veux** visualiser l'avant et l'après de ma restauration,
**afin de** valoriser le résultat final et comparer l'état initial à l'état terminé.

**Given** un projet contient une photo d'état initial et une photo d'état final
**When** j'ouvre le détail de la montre
**Then** je vois les deux photos côte à côte

---

### E. Performances du mouvement

#### Scénario 19 — Ajouter une mesure de performance
**En tant que** horloger amateur,
**je veux** saisir une mesure relevée au timegrapher,
**afin de** suivre la précision du mouvement.

**Given** un projet
**When** je saisis une date, une marche en secondes par jour, un beat error, une amplitude et, éventuellement, une position de la montre
**Then** la mesure est enregistrée avec le projet

**And** un beat error ou une amplitude négatifs sont refusés, alors qu'une marche négative (la montre retarde) est acceptée
**And** une date de mesure dans le futur est refusée

---

#### Scénario 20 — Consulter l'évolution des mesures
**En tant que** horloger amateur,
**je veux** voir l'évolution de la marche, du beat error et de l'amplitude,
**afin de** vérifier l'effet d'un réglage.

**Given** un projet contient plusieurs mesures
**When** j'ouvre le bloc « Performances »
**Then** je vois un graphique d'évolution dans le temps et la liste des dernières mesures

---

### F. Finances

#### Scénario 21 — Ajouter un coût
**En tant que** horloger amateur,
**je veux** enregistrer un coût lié à un projet,
**afin de** connaître ce que me coûte réellement la restauration.

**Given** un projet
**When** je saisis un libellé, un montant et une date (par exemple « Couronne », 12 €)
**Then** le coût est enregistré avec le projet

**And** un montant négatif est refusé
**And** une date de coût dans le futur est refusée

---

#### Scénario 22 — Renseigner la revente
**En tant que** horloger amateur,
**je veux** enregistrer la revente d'une montre,
**afin de** connaître le résultat de l'opération.

**Given** une montre dont aucun projet n'est en cours et qui n'est pas encore vendue
**When** je saisis le prix et la date de revente
**Then** la montre est considérée comme vendue

**And** le prix et la date de revente sont renseignés ensemble ou pas du tout
**And** la revente est refusée tant qu'un projet est en cours, ou si la montre est déjà vendue
**And** il n'est plus possible d'ouvrir un nouveau projet sur une montre vendue
**And** la date de revente ne peut précéder la date d'achat (lorsqu'elle est connue) ni être dans le futur

---

#### Scénario 23 — Consulter la marge d'une montre
**En tant que** horloger amateur,
**je veux** voir la marge d'une montre vendue,
**afin de** mesurer la rentabilité de mon hobby.

**Given** une montre achetée 80 €, avec deux projets dont les coûts totalisent 40 €, revendue 200 €
**When** j'ouvre le détail de la montre
**Then** la marge affichée est de 80 € (200 − 80 − 40)

**And** la marge est calculée par montre : elle additionne les coûts de tous ses projets

---

#### Scénario 24 — Ne pas afficher une marge incalculable
**En tant que** horloger amateur,
**je veux** ne pas voir de marge quand elle n'a pas de sens,
**afin de** ne pas me fier à un chiffre faux.

**Given** une montre non vendue, ou dont le prix d'achat est inconnu
**When** j'ouvre le détail de la montre
**Then** aucune marge n'est calculée

---

### G. Tableau de bord et historique

#### Scénario 25 — Consulter le tableau de bord
**En tant que** horloger amateur,
**je veux** voir toutes mes montres,
**afin de** retrouver rapidement celle sur laquelle je travaille.

**Given** j'ai enregistré plusieurs montres
**When** j'ouvre le tableau de bord
**Then** je vois une carte par montre : miniature du projet le plus récent, marque et modèle, type de mouvement et complications, statut du projet le plus récent (« En cours » ou « Terminé ») ou « Vendue », et la marge si la montre est vendue

**And** une montre sans projet s'affiche sans miniature, avec le statut « Sans projet »
**And** un clic sur une carte ouvre le détail de la montre

---

#### Scénario 26 — Retrouver l'historique des interventions d'une montre
**En tant que** horloger amateur,
**je veux** retrouver les restaurations et révisions successives d'une montre,
**afin de** garder une mémoire de mes projets dans le temps.

**Given** une montre a deux projets ou plus
**When** j'ouvre son détail
**Then** un sélecteur de projet apparaît : la checklist, les performances et l'avant / après suivent le projet sélectionné

**And** les finances restent au niveau de la montre, avec les coûts regroupés par projet
**And** pour une montre qui n'a qu'un seul projet, aucun historique n'est affiché

---

#### Scénario 40 — Filtrer le tableau de bord par statut
**En tant que** horloger amateur,
**je veux** filtrer mes montres par statut,
**afin de** retrouver rapidement celles qui m'intéressent quand elles deviennent nombreuses.

**Given** j'ai enregistré plusieurs montres de statuts différents
**When** je choisis un statut dans le filtre (« Toutes », « En cours », « Terminé », « Vendue » ou « Sans projet »)
**Then** seules les montres de ce statut sont affichées et le compteur du tableau de bord indique le nombre de montres affichées

**And** « Toutes » est sélectionné par défaut
**And** chaque statut indique le nombre de montres qui lui correspondent
**And** si aucune montre ne correspond au statut choisi, un message l'indique

---

### H. Confidentialité

#### Scénario 27 — Refuser l'accès aux données d'un autre utilisateur
**En tant que** horloger amateur,
**je veux** que mes montres restent privées,
**afin de** garder le contrôle de mes données.

**Given** une montre appartient à un autre utilisateur
**When** je tente d'accéder à cette montre ou à ses projets, étapes, photos, mesures ou coûts
**Then** l'accès est refusé

---

### I. Corrections et réouverture

#### Scénario 28 — Rouvrir un projet terminé
**En tant que** horloger amateur,
**je veux** rouvrir un projet que j'ai déclaré terminé,
**afin de** poursuivre ou corriger mon travail.

**Given** un projet terminé sur une montre non vendue, sans autre projet en cours
**When** je le rouvre
**Then** son statut repasse à « en cours » et sa date de fin est effacée

**And** la réouverture est refusée si la montre est vendue : il faut d'abord annuler la revente
**And** la réouverture est refusée si un autre projet est en cours sur la même montre

---

#### Scénario 29 — Décocher une étape terminée
**En tant que** horloger amateur,
**je veux** annuler la validation d'une étape,
**afin de** corriger une erreur de saisie.

**Given** une étape terminée
**When** je la remets « à faire »
**Then** l'étape n'est plus terminée et sa date de réalisation est effacée

---

#### Scénario 30 — Supprimer une étape d'un projet
**En tant que** horloger amateur,
**je veux** supprimer une étape d'un projet existant,
**afin de** retirer une étape qui ne correspond pas à mon démontage.

**Given** un projet contenant plusieurs étapes
**When** je supprime une étape
**Then** l'étape, sa note et ses photos sont supprimées

**And** les étapes restantes sont renumérotées sans trou ni doublon
**And** l'opération est enregistrée en une seule fois : en cas d'échec, rien n'est supprimé

---

#### Scénario 31 — Corriger ou annuler une revente
**En tant que** horloger amateur,
**je veux** corriger ou annuler la revente d'une montre,
**afin de** garder une marge exacte.

**Given** une montre vendue
**When** je modifie le prix et la date de revente
**Then** les deux valeurs sont enregistrées ensemble, avec les mêmes contrôles qu'à la saisie

**And** lorsque j'annule la revente, la montre n'est plus vendue et aucune marge n'est calculée
**And** une montre dont la revente est annulée peut de nouveau recevoir un projet

---

#### Scénario 32 — Modifier ou supprimer un coût
**En tant que** horloger amateur,
**je veux** corriger ou supprimer un coût,
**afin de** garder des finances exactes.

**Given** un coût enregistré sur un projet
**When** je modifie son libellé, son montant ou sa date, ou que je le supprime
**Then** la modification ou la suppression est enregistrée

**And** les mêmes contrôles qu'à la saisie s'appliquent (montant positif ou nul, date non future)
**And** la marge est recalculée à la lecture

---

#### Scénario 33 — Modifier ou supprimer une mesure
**En tant que** horloger amateur,
**je veux** corriger ou supprimer une mesure de performance,
**afin de** garder un suivi fiable.

**Given** une mesure enregistrée sur un projet
**When** je modifie ses valeurs ou que je la supprime
**Then** la modification ou la suppression est enregistrée

**And** les mêmes contrôles qu'à la saisie s'appliquent (beat error et amplitude non négatifs, date non future)

---

#### Scénario 34 — Supprimer ou remplacer une photo
**En tant que** horloger amateur,
**je veux** supprimer une photo ou en changer,
**afin de** ne garder que les images utiles.

**Given** une photo d'étape, ou la photo d'état initial ou final d'un projet
**When** je supprime une photo d'étape
**Then** la photo n'est plus associée à l'étape et son fichier est effacé

**And** je peux remplacer ou retirer la photo d'état initial ou final d'un projet
**And** l'ancien fichier est alors effacé

---

#### Scénario 37 — Supprimer un projet
**En tant que** horloger amateur,
**je veux** supprimer un projet,
**afin de** retirer une intervention saisie par erreur ou devenue inutile.

**Given** un projet, en cours ou terminé
**When** je le supprime après confirmation
**Then** le projet, ses étapes, ses notes, ses photos, ses mesures et ses coûts sont supprimés, et les fichiers photos sont effacés

**And** la montre est conservée, même si elle n'a plus aucun projet
**And** la marge de la montre est recalculée sans les coûts du projet supprimé
**And** la suppression est définitive

---

#### Scénario 38 — Supprimer une montre
**En tant que** horloger amateur,
**je veux** supprimer une montre,
**afin de** retirer une montre que je ne souhaite plus suivre.

**Given** une montre, vendue ou non, avec ou sans projet en cours
**When** je la supprime après confirmation
**Then** la montre, ses complications, tous ses projets et toutes leurs données sont supprimés, et les fichiers photos sont effacés

**And** la montre disparaît du tableau de bord
**And** la suppression est définitive

---

### J. Compte (suite)

#### Scénario 35 — Supprimer mon compte
**En tant que** horloger amateur,
**je veux** supprimer mon compte et mes données,
**afin de** exercer mon droit à l'effacement.

**Given** je suis connecté
**When** je demande la suppression de mon compte et que je confirme avec mon mot de passe
**Then** mon compte et toutes mes données (montres, projets, étapes, photos, mesures, coûts) sont supprimés, les fichiers photos sont effacés et ma session est fermée

**And** si le mot de passe saisi est incorrect, la suppression est refusée

---

#### Scénario 36 — Être limité en cas de tentatives répétées
**En tant que** horloger amateur,
**je veux** que les tentatives répétées soient limitées,
**afin de** protéger mon compte contre la force brute et l'envoi massif d'emails.

**Given** un grand nombre de requêtes arrivent depuis la même adresse IP sur une courte durée
**When** elles portent sur la connexion, la demande de réinitialisation du mot de passe ou le renvoi du lien de vérification
**Then** les requêtes au-delà du plafond sont refusées temporairement avec un message explicite

---

#### Scénario 39 — Renvoyer le lien de vérification
**En tant que** horloger amateur,
**je veux** demander un nouvel email de vérification,
**afin de** confirmer mon adresse lorsque le premier lien est perdu ou expiré.

**Given** je suis sur la page de connexion et mon adresse n'est pas encore vérifiée
**When** je demande le renvoi du lien en saisissant mon adresse email
**Then** l'application affiche la même réponse que cette adresse corresponde ou non à un compte

**And** si un compte existe et que son adresse n'est pas vérifiée, un nouvel email contenant un lien à durée limitée m'est envoyé
**And** si l'adresse est déjà vérifiée, aucun email n'est envoyé
**And** les demandes répétées sont limitées comme décrit au scénario 36

## 4. Critères d'acceptation

- Un compte ne se connecte qu'après vérification de son adresse email ; le lien de vérification peut être renvoyé, avec la même réponse que l'adresse corresponde ou non à un compte.
- Une montre est créée avec une marque, un modèle et un type de mouvement ; complications, prix et date d'achat sont facultatifs.
- La création d'une montre, de son premier projet et de ses étapes est atomique.
- La checklist est générée d'après le type de mouvement et les complications, triée sur une échelle commune ; les étapes d'une complication s'intercalent entre les étapes de base.
- L'aperçu est ajustable avant création ; les étapes sont ensuite copiées dans le projet.
- Une montre peut avoir plusieurs projets ; la marge se calcule par montre.
- Une étape peut être validée, modifiée, recevoir une note et des photos, et être déplacée.
- Les étapes d'un projet sont renumérotées sans trou ni doublon après un déplacement.
- Une mesure de performance et un coût peuvent être ajoutés à un projet.
- Prix et date de revente sont renseignés ensemble ; la revente est refusée si un projet est en cours ou si la montre est déjà vendue.
- La marge n'est calculée que si la montre est vendue et son prix d'achat connu.
- Un utilisateur n'accède jamais aux données d'un autre.
- Une montre n'a qu'un projet en cours à la fois ; un projet terminé peut être rouvert si la montre n'est pas vendue et n'a pas d'autre projet en cours.
- Les étapes peuvent être validées dans n'importe quel ordre, décochées et supprimées ; les coûts, les mesures et les photos peuvent être modifiés ou supprimés ; la revente peut être corrigée ou annulée.
- L'adresse email est enregistrée en minuscules ; la date de revente ne précède pas la date d'achat ; aucune date saisie n'est dans le futur.
- Un projet ou une montre peut être supprimé, après confirmation, avec toutes les données qui en dépendent.
- Un utilisateur peut supprimer son compte avec toutes ses données.
- Le tableau de bord se filtre par statut (« Toutes », « En cours », « Terminé », « Vendue », « Sans projet »).
- Les tentatives répétées de connexion, de réinitialisation et de renvoi de lien sont limitées.

## 5. Règles de gestion

Les règles de gestion sont recensées, numérotées (`RG-xx`) et reliées aux scénarios ci-dessus, au modèle de données et aux tests dans [`REGLES-GESTION.md`](REGLES-GESTION.md).

## 6. Hors périmètre v1

- Mouvements quartz et type d'intervention.
- Réouverture ou nouvelle intervention sur une montre vendue (par exemple une révision demandée par son acheteur). Elle suppose une entité « prestation » portant le montant facturé, à étudier dans une version ultérieure.
- Modèles d'étapes personnalisés et réutilisables.
- Resynchronisation des étapes d'un projet existant quand les complications changent.
- Suivi du temps passé, mesure automatique par microphone, fonctionnalités sociales.

## 7. Questions ouvertes

- Faut-il suivre aussi les opérations sur le boîtier, le bracelet et le cadran, ou seulement le mouvement ?
- Les photos doivent-elles pouvoir être annotées ?
- Faut-il proposer plus tard une synthèse finale ou une exportation du journal de restauration ?
- Faut-il, en v2, des fiches de référence par calibre ?
