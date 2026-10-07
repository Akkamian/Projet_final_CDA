-- ============================================================================
-- Watch Restoration Tracker — Seed des données de référence (schéma v2)
-- ----------------------------------------------------------------------------
-- Peuple movement_types, complications et template_steps.
-- À exécuter APRÈS db/script_db.sql :
--     psql -d <base> -f db/seed_reference_data.sql
--
-- ⚠️ PREMIER JET À RELIRE par un horloger : structures types, à adapter au
-- calibre réel. Source : Etapes-desassemblage-reassemblage.md.
--
-- Règle de composition (voir docs/MCD/2026-09-23-mcd-montre-complications-design.md) :
--   étapes d'un projet = étapes du type de mouvement
--                      + étapes de chaque complication de la montre,
--   triées par step_order croissant ; à égalité, étapes de mouvement d'abord,
--   puis code de complication.
--
-- Échelle de step_order commune à toutes les listes : base espacée de 100 en 100,
-- ce qui laisse la place d'intercaler les étapes d'une complication
-- (ex. 350 = entre « Déposer les aiguilles » (300) et « Déposer le cadran » (400)).
-- Les étapes de démontage vont de 100 à 1000, celles de remontage de 1100 à 2200.
-- ============================================================================

-- ---------- Types de mouvement ----------

INSERT INTO movement_types (movement_code, label) VALUES
    ('manual',    'Mécanique à remontage manuel'),
    ('automatic', 'Mécanique automatique');

-- ---------- Complications ----------

INSERT INTO complications (complication_code, label) VALUES
    ('chronograph',   'Chronographe'),
    ('date',          'Date'),
    ('day_date',      'Jour / date'),
    ('small_seconds', 'Petite seconde'),
    ('power_reserve', 'Réserve de marche');

-- ---------- Étapes de base : mouvement manuel (22 étapes) ----------

INSERT INTO template_steps (movement_code, step_order, label, step_description) VALUES
    ('manual',  100, 'Désarmer le ressort de barillet',
        'Relâcher la tension du ressort de barillet avant toute intervention.'),
    ('manual',  200, 'Sortir le mouvement du boîtier',
        'Déposer la tige de remontoir puis retirer le mouvement de la carrure.'),
    ('manual',  300, 'Déposer les aiguilles',
        'Retirer les aiguilles des heures, minutes et secondes avec un démonte-aiguilles.'),
    ('manual',  400, 'Déposer le cadran',
        'Décrocher le cadran après avoir ôté les vis ou pattes de fixation.'),
    ('manual',  500, 'Déposer les éléments côté cadran',
        'Cavalier, roues de minuterie et pont de cadran.'),
    ('manual',  600, 'Déposer le balancier et le coq',
        'Retirer le coq puis le balancier avec son spiral.'),
    ('manual',  700, 'Déposer l''ancre et son pont',
        'Retirer le pont d''ancre puis l''ancre.'),
    ('manual',  800, 'Déposer le pont de rouage et le train de rouage',
        'Déposer les ponts puis le train de rouage.'),
    ('manual',  900, 'Déposer le barillet',
        'Extraire le barillet et sa roue.'),
    ('manual', 1000, 'Déposer le remontoir, le rochet et le cliquet',
        'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.'),
    ('manual', 1100, 'Contrôler, trier et nettoyer les pièces',
        'Contrôler l''état des pièces et des pivots, les trier par groupe, puis les nettoyer.'),
    ('manual', 1200, 'Remonter le remontoir et la mise à l''heure',
        'Remonter le mécanisme de mise à l''heure et vérifier sa manœuvre.'),
    ('manual', 1300, 'Lubrifier et remonter le barillet',
        'Lubrifier puis remonter le barillet et engrener sa roue avec le pignon de remontoir.'),
    ('manual', 1400, 'Remonter le train de rouage',
        'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.'),
    ('manual', 1500, 'Poser l''ancre et son pont',
        'Poser l''ancre et son pont puis vérifier l''impulsion.'),
    ('manual', 1600, 'Poser le balancier et le coq',
        'Poser le balancier et le coq puis vérifier le battement.'),
    ('manual', 1700, 'Vérifier le fonctionnement du mouvement de base',
        'Vérifier le démarrage, la marche et le remontage avant de poser le cadran.'),
    ('manual', 1800, 'Remonter les éléments côté cadran',
        'Replacer cavalier, roues de minuterie et pont de cadran.'),
    ('manual', 1900, 'Poser le cadran',
        'Replacer le cadran et le fixer.'),
    ('manual', 2000, 'Poser les aiguilles',
        'Replacer les aiguilles en respectant la position du pignon de minuterie.'),
    ('manual', 2100, 'Régler et mesurer la marche',
        'Régler le mouvement puis relever marche, amplitude et beat error.'),
    ('manual', 2200, 'Emboîter et tester',
        'Emboîter le mouvement dans le boîtier puis contrôler les fonctions.');

-- ---------- Étapes de base : mouvement automatique (24 étapes) ----------
-- Liste manuelle + dépose / pose du module automatique et du rotor.
-- Les lignes sont copiées : chaque liste reste libre d'évoluer indépendamment
-- (voir journal de décisions, Q13).

INSERT INTO template_steps (movement_code, step_order, label, step_description)
SELECT 'automatic', step_order, label, step_description
FROM template_steps
WHERE movement_code = 'manual';

INSERT INTO template_steps (movement_code, step_order, label, step_description) VALUES
    ('automatic',  250, 'Déposer le rotor et le module automatique',
        'Déposer le rotor (central ou périphérique) puis le module de remontage automatique (roue de transmission, inverseur).'),
    ('automatic', 1770, 'Remonter le module automatique et le rotor',
        'Reposer le module de remontage automatique puis le rotor, avant la pose du cadran.');

-- ---------- Étapes des complications ----------
-- Identiques quel que soit le type de mouvement (voir journal, Q5).
-- Chaque dépose a son pendant en remontage, dans l'ordre inverse.

INSERT INTO template_steps (complication_code, step_order, label, step_description) VALUES
    -- Chronographe
    ('chronograph',  350, 'Déposer les aiguilles chrono',
        'Retirer la seconde chrono et les aiguilles des compteurs avant de déposer le cadran.'),
    ('chronograph',  550, 'Déposer le module chronographe',
        'Retirer le module chrono (roue à colonnes ou came, marteau, bascule).'),
    ('chronograph', 1730, 'Remonter le module chronographe',
        'Reposer le module chrono ; vérifier le rattrapant et le retour à zéro.'),
    ('chronograph', 2050, 'Poser les aiguilles chrono',
        'Positionner la seconde chrono et les aiguilles des compteurs à zéro.'),
    ('chronograph', 2150, 'Tester les fonctions chrono',
        'Tester le déclenchement, l''arrêt et la remise à zéro.'),

    -- Date
    ('date',  420, 'Déposer le module calendrier',
        'Retirer le disque de quantième, le guichet et les correcteurs.'),
    ('date', 1850, 'Remonter le module calendrier',
        'Reposer le disque de quantième, le guichet et les correcteurs ; synchroniser le changement de date.'),
    ('date', 2160, 'Tester le saut de date',
        'Tester le saut de date et la correction rapide.'),

    -- Jour / date
    ('day_date',  420, 'Déposer les disques de jour et de quantième',
        'Retirer les disques de jour et de quantième, le guichet et les correcteurs.'),
    ('day_date', 1850, 'Remonter les disques de jour et de quantième',
        'Reposer les disques, le guichet et les correcteurs ; synchroniser le changement de jour et de date.'),
    ('day_date', 2160, 'Tester le saut du jour et de la date',
        'Tester le saut du jour et de la date et la correction rapide.'),

    -- Petite seconde
    ('small_seconds',  850, 'Déposer la roue et le mécanisme de petite seconde',
        'Retirer la roue de petite seconde et son mécanisme avec le train de rouage.'),
    ('small_seconds', 1450, 'Remonter la roue et le mécanisme de petite seconde',
        'Reposer la roue de petite seconde et vérifier son engrènement.'),

    -- Réserve de marche
    ('power_reserve',  950, 'Déposer le mécanisme de réserve de marche',
        'Retirer le mécanisme de réserve de marche et son différentiel après le barillet.'),
    ('power_reserve', 1350, 'Remonter le mécanisme de réserve de marche',
        'Reposer le mécanisme de réserve de marche et vérifier la correspondance avec l''état du ressort.');

-- ============================================================================
-- Total attendu : 2 types de mouvement, 5 complications,
-- 22 + 24 étapes de base, 15 étapes de complications = 61 lignes dans template_steps.
-- ============================================================================
