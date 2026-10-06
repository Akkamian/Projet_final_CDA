-- ============================================================================
-- Watch Restoration Tracker — Seed du référentiel système (tables de paramétrage)
-- ----------------------------------------------------------------------------
-- Peuple restoration_processes et restoration_process_steps.
--
-- ⚠️ PREMIER JET À RELIRE par un horloger : contenu générique (structures types),
-- à adapter/corriger avant de considérer le référentiel comme définitif.
--
-- Référence : Etapes-desassemblage-reassemblage.md
--
-- Mapping retenu (2 types de mouvement x 4 types de complication = 8 processus) :
--   mecanique_manuel : simple | chronographe | calendar | gmt
--   automatique      : simple | chronographe | calendar | gmt
--
-- Lecture des checklists :
--   * Les N premières étapes = démontage, les suivantes = remontage.
--   * step_order dense et contigu (1..n) : l'affichage « Étape n°k » se fait
--     via ORDER BY step_order (réordonnancement = patterns documentés dans
--     script_db.sql, section 3).
--
-- Commandes :
--   psql -d <base> -f db/seed_processes.sql
-- ============================================================================

INSERT INTO restoration_processes (movement_type, complication_type) VALUES
   ('mecanique_manuel', 'simple'),
   ('mecanique_manuel', 'chronographe'),
   ('mecanique_manuel', 'calendar'),
   ('mecanique_manuel', 'gmt'),
   ('automatique',      'simple'),
   ('automatique',      'chronographe'),
   ('automatique',      'calendar'),
   ('automatique',      'gmt');

-- ----------------------------------------------------------------------------
-- Processus : mecanique_manuel / simple
-- Démontage (1-10) puis remontage (11-20), d'après le doc de référence.
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'mecanique_manuel', 'simple'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'mecanique_manuel', 'simple'),
   ('Déposer les aiguilles',                    3,  'Retirer les aiguilles des heures, minutes et secondes avec un démonte-aiguilles.', 'mecanique_manuel', 'simple'),
   ('Déposer le cadran',                        4,  'Décrocher le cadran après avoir ôté les vis ou pattes de fixation.', 'mecanique_manuel', 'simple'),
   ('Déposer les éléments côté cadran',         5,  'Cavalier, roues de minuterie et pont de cadran.', 'mecanique_manuel', 'simple'),
   ('Déposer le balancier / coq',               6,  'Retirer le coq puis le balancier avec son spiral.', 'mecanique_manuel', 'simple'),
   ('Déposer l''ancre et son pont',             7,  'Retirer le pont d''ancre puis l''ancre.', 'mecanique_manuel', 'simple'),
   ('Déposer le pont de rouage et le train',    8,  'Déposer les ponts puis le train de rouage.', 'mecanique_manuel', 'simple'),
   ('Déposer le barillet',                      9,  'Extraire le barillet et sa roue.', 'mecanique_manuel', 'simple'),
   ('Déposer le remontoir, le rochet et le cliquet', 10, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'mecanique_manuel', 'simple'),
   ('Contrôler et trier les pièces',            11, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'mecanique_manuel', 'simple'),
   ('Remonter le remontoir / mise à l''heure',  12, 'Remonter le mécanisme de mise à l''heure et vérifier sa manœuvre.', 'mecanique_manuel', 'simple'),
   ('Remonter le barillet',                     13, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'mecanique_manuel', 'simple'),
   ('Remonter le train de rouage',              14, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'mecanique_manuel', 'simple'),
   ('Poser l''ancre et son pont',               15, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'mecanique_manuel', 'simple'),
   ('Poser le balancier / coq',                 16, 'Poser le balancier et le coq puis vérifier le battement.', 'mecanique_manuel', 'simple'),
   ('Vérifier le fonctionnement',               17, 'Vérifier le démarrage, la marche et le remontage.', 'mecanique_manuel', 'simple'),
   ('Remettre le cadran',                       18, 'Replacer le cadran et les éléments côté cadran.', 'mecanique_manuel', 'simple'),
   ('Poser les aiguilles',                      19, 'Replacer les aiguilles en respectant la position du pignon de minuterie.', 'mecanique_manuel', 'simple'),
   ('Emboîter et tester',                       20, 'Emboîter le mouvement dans le boîtier puis contrôler les fonctions.', 'mecanique_manuel', 'simple');

-- ----------------------------------------------------------------------------
-- Processus : automatique / simple
-- Démontage (1-12) puis remontage (13-23).
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'automatique', 'simple'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'automatique', 'simple'),
   ('Déposer le rotor',                         3,  'Déposer le rotor (central ou périphérique).', 'automatique', 'simple'),
   ('Déposer le module automatique',            4,  'Séparer le module de remontage automatique (roue de transmission, rochet).', 'automatique', 'simple'),
   ('Déposer les aiguilles',                    5,  'Retirer les aiguilles des heures, minutes et secondes avec un démonte-aiguilles.', 'automatique', 'simple'),
   ('Déposer le cadran',                        6,  'Décrocher le cadran après avoir ôté les vis ou pattes de fixation.', 'automatique', 'simple'),
   ('Déposer les éléments côté cadran',         7,  'Cavalier, roues de minuterie et pont de cadran.', 'automatique', 'simple'),
   ('Déposer le balancier / coq',               8,  'Retirer le coq puis le balancier avec son spiral.', 'automatique', 'simple'),
   ('Déposer l''ancre et son pont',             9,  'Retirer le pont d''ancre puis l''ancre.', 'automatique', 'simple'),
   ('Déposer le pont de rouage et le train',    10, 'Déposer les ponts puis le train de rouage.', 'automatique', 'simple'),
   ('Déposer le barillet',                      11, 'Extraire le barillet et sa roue.', 'automatique', 'simple'),
   ('Déposer le remontoir, le rochet et le cliquet', 12, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'automatique', 'simple'),
   ('Contrôler et trier les pièces',            13, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'automatique', 'simple'),
   ('Remonter le remontoir / mise à l''heure',  14, 'Remonter le mécanisme de mise à l''heure et vérifier sa manœuvre.', 'automatique', 'simple'),
   ('Remonter le barillet',                     15, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'automatique', 'simple'),
   ('Remonter le train de rouage',              16, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'automatique', 'simple'),
   ('Poser l''ancre et son pont',               17, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'automatique', 'simple'),
   ('Poser le balancier / coq',                 18, 'Poser le balancier et le coq puis vérifier le battement.', 'automatique', 'simple'),
   ('Vérifier le mouvement de base',            19, 'Vérifier marche et remontage avant de reposer l''automatique.', 'automatique', 'simple'),
   ('Remonter le module automatique',           20, 'Reposer le module de remontage automatique et le rotor.', 'automatique', 'simple'),
   ('Remettre le cadran',                       21, 'Replacer le cadran et les éléments côté cadran.', 'automatique', 'simple'),
   ('Poser les aiguilles',                      22, 'Replacer les aiguilles en respectant la position du pignon de minuterie.', 'automatique', 'simple'),
   ('Emboîter et tester',                       23, 'Emboîter, poser le rotor si séparé, puis tester les fonctions.', 'automatique', 'simple');

-- ----------------------------------------------------------------------------
-- Processus : mecanique_manuel / chronographe
-- Démontage (1-12) puis remontage (13-24) — base manuelle + module chrono.
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'mecanique_manuel', 'chronographe'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'mecanique_manuel', 'chronographe'),
   ('Déposer les aiguilles chrono',             3,  'Retirer la seconde chrono et les aiguilles des compteurs (avant le cadran).', 'mecanique_manuel', 'chronographe'),
   ('Déposer les aiguilles heures / minutes',   4,  'Retirer les aiguilles principales des heures et minutes.', 'mecanique_manuel', 'chronographe'),
   ('Déposer le cadran',                        5,  'Décrocher le cadran chrono (souvent pourvu de compteurs).', 'mecanique_manuel', 'chronographe'),
   ('Déposer le module chronographe',           6,  'Retirer le module chrono (roue à colonnes ou came, marteau, bascule).', 'mecanique_manuel', 'chronographe'),
   ('Déposer les éléments côté cadran',         7,  'Cavalier, roues de minuterie.', 'mecanique_manuel', 'chronographe'),
   ('Déposer le balancier / coq',               8,  'Retirer le coq puis le balancier avec son spiral.', 'mecanique_manuel', 'chronographe'),
   ('Déposer l''ancre et son pont',             9,  'Retirer le pont d''ancre puis l''ancre.', 'mecanique_manuel', 'chronographe'),
   ('Déposer le pont de rouage et le train',    10, 'Déposer les ponts puis le train de rouage.', 'mecanique_manuel', 'chronographe'),
   ('Déposer le barillet',                      11, 'Extraire le barillet et sa roue.', 'mecanique_manuel', 'chronographe'),
   ('Déposer le remontoir, le rochet et le cliquet', 12, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'mecanique_manuel', 'chronographe'),
   ('Contrôler et trier les pièces',            13, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'mecanique_manuel', 'chronographe'),
   ('Remonter le remontoir / mise à l''heure',  14, 'Remonter le mécanisme de mise à l''heure et vérifier sa manœuvre.', 'mecanique_manuel', 'chronographe'),
   ('Remonter le barillet',                     15, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'mecanique_manuel', 'chronographe'),
   ('Remonter le train de rouage',              16, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'mecanique_manuel', 'chronographe'),
   ('Poser l''ancre et son pont',               17, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'mecanique_manuel', 'chronographe'),
   ('Poser le balancier / coq',                 18, 'Poser le balancier et le coq puis vérifier le battement.', 'mecanique_manuel', 'chronographe'),
   ('Vérifier le mouvement de base',            19, 'Vérifier la marche de base avant de poser le module chrono.', 'mecanique_manuel', 'chronographe'),
   ('Remonter le module chronographe',          20, 'Reposer le module chrono et vérifier le rattrapant et le retour à zéro.', 'mecanique_manuel', 'chronographe'),
   ('Remettre le cadran',                       21, 'Replacer le cadran chrono.', 'mecanique_manuel', 'chronographe'),
   ('Poser les aiguilles heures / minutes',     22, 'Replacer les aiguilles principales.', 'mecanique_manuel', 'chronographe'),
   ('Poser les aiguilles chrono',               23, 'Positionner la seconde chrono et les compteurs à zéro.', 'mecanique_manuel', 'chronographe'),
   ('Emboîter et tester les fonctions chrono',  24, 'Emboîter puis tester déclenchement, arrêt et remise à zéro.', 'mecanique_manuel', 'chronographe');

-- ----------------------------------------------------------------------------
-- Processus : automatique / chronographe
-- Démontage (1-14) puis remontage (15-26) — base automatique + module chrono.
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'automatique', 'chronographe'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'automatique', 'chronographe'),
   ('Déposer le rotor',                         3,  'Déposer le rotor (central ou périphérique).', 'automatique', 'chronographe'),
   ('Déposer le module automatique',            4,  'Séparer le module de remontage automatique (roue de transmission, rochet).', 'automatique', 'chronographe'),
   ('Déposer les aiguilles chrono',             5,  'Retirer la seconde chrono et les aiguilles des compteurs (avant le cadran).', 'automatique', 'chronographe'),
   ('Déposer les aiguilles heures / minutes',   6,  'Retirer les aiguilles principales des heures et minutes.', 'automatique', 'chronographe'),
   ('Déposer le cadran',                        7,  'Décrocher le cadran chrono (souvent pourvu de compteurs).', 'automatique', 'chronographe'),
   ('Déposer le module chronographe',           8,  'Retirer le module chrono (roue à colonnes ou came, marteau, bascule).', 'automatique', 'chronographe'),
   ('Déposer les éléments côté cadran',         9,  'Cavalier, roues de minuterie.', 'automatique', 'chronographe'),
   ('Déposer le balancier / coq',               10, 'Retirer le coq puis le balancier avec son spiral.', 'automatique', 'chronographe'),
   ('Déposer l''ancre et son pont',             11, 'Retirer le pont d''ancre puis l''ancre.', 'automatique', 'chronographe'),
   ('Déposer le pont de rouage et le train',    12, 'Déposer les ponts puis le train de rouage.', 'automatique', 'chronographe'),
   ('Déposer le barillet',                      13, 'Extraire le barillet et sa roue.', 'automatique', 'chronographe'),
   ('Déposer le remontoir, le rochet et le cliquet', 14, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'automatique', 'chronographe'),
   ('Contrôler et trier les pièces',            15, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'automatique', 'chronographe'),
   ('Remonter le remontoir / mise à l''heure',  16, 'Remonter le mécanisme de mise à l''heure et vérifier sa manœuvre.', 'automatique', 'chronographe'),
   ('Remonter le barillet',                     17, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'automatique', 'chronographe'),
   ('Remonter le train de rouage',              18, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'automatique', 'chronographe'),
   ('Poser l''ancre et son pont',               19, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'automatique', 'chronographe'),
   ('Poser le balancier / coq',                 20, 'Poser le balancier et le coq puis vérifier le battement.', 'automatique', 'chronographe'),
   ('Vérifier le mouvement de base',            21, 'Vérifier la marche de base avant de poser module chrono et automatique.', 'automatique', 'chronographe'),
   ('Remonter le module chronographe',          22, 'Reposer le module chrono et vérifier le rattrapant et le retour à zéro.', 'automatique', 'chronographe'),
   ('Remonter le module automatique',           23, 'Reposer le module de remontage automatique et le rotor.', 'automatique', 'chronographe'),
   ('Remettre le cadran',                       24, 'Replacer le cadran chrono.', 'automatique', 'chronographe'),
   ('Poser les aiguilles',                      25, 'Replacer les aiguilles principales puis les aiguilles chrono à zéro.', 'automatique', 'chronographe'),
   ('Emboîter et tester les fonctions chrono',  26, 'Emboîter puis tester déclenchement, arrêt et remise à zéro.', 'automatique', 'chronographe');

-- ----------------------------------------------------------------------------
-- Processus : mecanique_manuel / calendar
-- Démontage (1-11) puis remontage (12-22) — base manuelle + module calendrier.
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'mecanique_manuel', 'calendar'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'mecanique_manuel', 'calendar'),
   ('Déposer les aiguilles',                    3,  'Retirer les aiguilles des heures, minutes et secondes avec un démonte-aiguilles.', 'mecanique_manuel', 'calendar'),
   ('Déposer le cadran',                        4,  'Décrocher le cadran après avoir ôté les vis ou pattes de fixation.', 'mecanique_manuel', 'calendar'),
   ('Déposer le module calendrier',             5,  'Retirer disques de quantième/jour, guichet et correcteurs.', 'mecanique_manuel', 'calendar'),
   ('Déposer les éléments côté cadran',         6,  'Cavalier, roues de minuterie et pont de cadran.', 'mecanique_manuel', 'calendar'),
   ('Déposer le balancier / coq',               7,  'Retirer le coq puis le balancier avec son spiral.', 'mecanique_manuel', 'calendar'),
   ('Déposer l''ancre et son pont',             8,  'Retirer le pont d''ancre puis l''ancre.', 'mecanique_manuel', 'calendar'),
   ('Déposer le pont de rouage et le train',    9,  'Déposer les ponts puis le train de rouage.', 'mecanique_manuel', 'calendar'),
   ('Déposer le barillet',                      10, 'Extraire le barillet et sa roue.', 'mecanique_manuel', 'calendar'),
   ('Déposer le remontoir, le rochet et le cliquet', 11, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'mecanique_manuel', 'calendar'),
   ('Contrôler et trier les pièces',            12, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'mecanique_manuel', 'calendar'),
   ('Remonter le remontoir / mise à l''heure',  13, 'Remonter le mécanisme de mise à l''heure et vérifier sa manœuvre.', 'mecanique_manuel', 'calendar'),
   ('Remonter le barillet',                     14, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'mecanique_manuel', 'calendar'),
   ('Remonter le train de rouage',              15, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'mecanique_manuel', 'calendar'),
   ('Poser l''ancre et son pont',               16, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'mecanique_manuel', 'calendar'),
   ('Poser le balancier / coq',                 17, 'Poser le balancier et le coq puis vérifier le battement.', 'mecanique_manuel', 'calendar'),
   ('Vérifier le mouvement de base',            18, 'Vérifier la marche de base avant de poser le module calendrier.', 'mecanique_manuel', 'calendar'),
   ('Remonter le module calendrier',            19, 'Reposer disques, guichet et correcteurs ; synchroniser le changement de date.', 'mecanique_manuel', 'calendar'),
   ('Remettre le cadran',                       20, 'Replacer le cadran et les éléments côté cadran.', 'mecanique_manuel', 'calendar'),
   ('Poser les aiguilles',                      21, 'Replacer les aiguilles en respectant la position du pignon de minuterie.', 'mecanique_manuel', 'calendar'),
   ('Emboîter et tester le calendrier',         22, 'Emboîter puis tester le saut de date, la correction rapide et les fonctions.', 'mecanique_manuel', 'calendar');

-- ----------------------------------------------------------------------------
-- Processus : automatique / calendar
-- Démontage (1-13) puis remontage (14-25) — base automatique + module calendrier.
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'automatique', 'calendar'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'automatique', 'calendar'),
   ('Déposer le rotor',                         3,  'Déposer le rotor (central ou périphérique).', 'automatique', 'calendar'),
   ('Déposer le module automatique',            4,  'Séparer le module de remontage automatique (roue de transmission, rochet).', 'automatique', 'calendar'),
   ('Déposer les aiguilles',                    5,  'Retirer les aiguilles des heures, minutes et secondes avec un démonte-aiguilles.', 'automatique', 'calendar'),
   ('Déposer le cadran',                        6,  'Décrocher le cadran après avoir ôté les vis ou pattes de fixation.', 'automatique', 'calendar'),
   ('Déposer le module calendrier',             7,  'Retirer disques de quantième/jour, guichet et correcteurs.', 'automatique', 'calendar'),
   ('Déposer les éléments côté cadran',         8,  'Cavalier, roues de minuterie et pont de cadran.', 'automatique', 'calendar'),
   ('Déposer le balancier / coq',               9,  'Retirer le coq puis le balancier avec son spiral.', 'automatique', 'calendar'),
   ('Déposer l''ancre et son pont',             10, 'Retirer le pont d''ancre puis l''ancre.', 'automatique', 'calendar'),
   ('Déposer le pont de rouage et le train',    11, 'Déposer les ponts puis le train de rouage.', 'automatique', 'calendar'),
   ('Déposer le barillet',                      12, 'Extraire le barillet et sa roue.', 'automatique', 'calendar'),
   ('Déposer le remontoir, le rochet et le cliquet', 13, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'automatique', 'calendar'),
   ('Contrôler et trier les pièces',            14, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'automatique', 'calendar'),
   ('Remonter le remontoir / mise à l''heure',  15, 'Remonter le mécanisme de mise à l''heure et vérifier sa manœuvre.', 'automatique', 'calendar'),
   ('Remonter le barillet',                     16, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'automatique', 'calendar'),
   ('Remonter le train de rouage',              17, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'automatique', 'calendar'),
   ('Poser l''ancre et son pont',               18, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'automatique', 'calendar'),
   ('Poser le balancier / coq',                 19, 'Poser le balancier et le coq puis vérifier le battement.', 'automatique', 'calendar'),
   ('Vérifier le mouvement de base',            20, 'Vérifier la marche de base avant de poser modules auto et calendrier.', 'automatique', 'calendar'),
   ('Remonter le module automatique',           21, 'Reposer le module de remontage automatique et le rotor.', 'automatique', 'calendar'),
   ('Remonter le module calendrier',            22, 'Reposer disques, guichet et correcteurs ; synchroniser le changement de date.', 'automatique', 'calendar'),
   ('Remettre le cadran',                       23, 'Replacer le cadran et les éléments côté cadran.', 'automatique', 'calendar'),
   ('Poser les aiguilles',                      24, 'Replacer les aiguilles en respectant la position du pignon de minuterie.', 'automatique', 'calendar'),
   ('Emboîter et tester le calendrier',         25, 'Emboîter, poser le rotor, tester saut de date et correction rapide.', 'automatique', 'calendar');

-- ----------------------------------------------------------------------------
-- Processus : mecanique_manuel / gmt
-- Démontage (1-10) puis remontage (11-21) — base manuelle + aiguille GMT.
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'mecanique_manuel', 'gmt'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'mecanique_manuel', 'gmt'),
   ('Déposer les aiguilles (dont GMT)',         3,  'Retirer aiguilles heures, minutes, secondes et l''aiguille GMT.', 'mecanique_manuel', 'gmt'),
   ('Déposer le cadran',                        4,  'Décrocher le cadran après avoir ôté les vis ou pattes de fixation.', 'mecanique_manuel', 'gmt'),
   ('Déposer les éléments côté cadran',         5,  'Cavalier, roues de minuterie, roue et module GMT.', 'mecanique_manuel', 'gmt'),
   ('Déposer le balancier / coq',               6,  'Retirer le coq puis le balancier avec son spiral.', 'mecanique_manuel', 'gmt'),
   ('Déposer l''ancre et son pont',             7,  'Retirer le pont d''ancre puis l''ancre.', 'mecanique_manuel', 'gmt'),
   ('Déposer le pont de rouage et le train',    8,  'Déposer les ponts puis le train de rouage.', 'mecanique_manuel', 'gmt'),
   ('Déposer le barillet',                      9,  'Extraire le barillet et sa roue.', 'mecanique_manuel', 'gmt'),
   ('Déposer le remontoir, le rochet et le cliquet', 10, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'mecanique_manuel', 'gmt'),
   ('Contrôler et trier les pièces',            11, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'mecanique_manuel', 'gmt'),
   ('Remonter le remontoir / mise à l''heure',  12, 'Remonter le mécanisme de mise à l''heure et vérifier la fonction GMT.', 'mecanique_manuel', 'gmt'),
   ('Remonter le barillet',                     13, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'mecanique_manuel', 'gmt'),
   ('Remonter le train de rouage',              14, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'mecanique_manuel', 'gmt'),
   ('Poser l''ancre et son pont',               15, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'mecanique_manuel', 'gmt'),
   ('Poser le balancier / coq',                 16, 'Poser le balancier et le coq puis vérifier le battement.', 'mecanique_manuel', 'gmt'),
   ('Vérifier le mouvement de base',            17, 'Vérifier la marche de base avant de poser le module GMT.', 'mecanique_manuel', 'gmt'),
   ('Remonter la roue et le module GMT',        18, 'Reposer la roue de GMT et le module de réglage de l''aiguille GMT.', 'mecanique_manuel', 'gmt'),
   ('Remettre le cadran',                       19, 'Replacer le cadran et les éléments côté cadran.', 'mecanique_manuel', 'gmt'),
   ('Poser les aiguilles (dont GMT alignée)',   20, 'Replacer les aiguilles et aligner l''aiguille GMT sur l''heure de référence.', 'mecanique_manuel', 'gmt'),
   ('Emboîter et tester la fonction GMT',       21, 'Emboîter puis tester le calage et le basculement de l''aiguille GMT.', 'mecanique_manuel', 'gmt');

-- ----------------------------------------------------------------------------
-- Processus : automatique / gmt
-- Démontage (1-12) puis remontage (13-24) — base automatique + aiguille GMT.
-- ----------------------------------------------------------------------------
INSERT INTO restoration_process_steps
   (label, step_order, step_description, movement_type, complication_type)
VALUES
   ('Désarmer le ressort',                      1,  'Relâcher la tension du ressort de barillet avant toute intervention.', 'automatique', 'gmt'),
   ('Sortir le mouvement du boîtier',           2,  'Retirer le mouvement de la carrure après avoir déposé la tige de remontoir.', 'automatique', 'gmt'),
   ('Déposer le rotor',                         3,  'Déposer le rotor (central ou périphérique).', 'automatique', 'gmt'),
   ('Déposer le module automatique',            4,  'Séparer le module de remontage automatique (roue de transmission, rochet).', 'automatique', 'gmt'),
   ('Déposer les aiguilles (dont GMT)',         5,  'Retirer aiguilles heures, minutes, secondes et l''aiguille GMT.', 'automatique', 'gmt'),
   ('Déposer le cadran',                        6,  'Décrocher le cadran après avoir ôté les vis ou pattes de fixation.', 'automatique', 'gmt'),
   ('Déposer les éléments côté cadran',         7,  'Cavalier, roues de minuterie, roue et module GMT.', 'automatique', 'gmt'),
   ('Déposer le balancier / coq',               8,  'Retirer le coq puis le balancier avec son spiral.', 'automatique', 'gmt'),
   ('Déposer l''ancre et son pont',             9,  'Retirer le pont d''ancre puis l''ancre.', 'automatique', 'gmt'),
   ('Déposer le pont de rouage et le train',    10, 'Déposer les ponts puis le train de rouage.', 'automatique', 'gmt'),
   ('Déposer le barillet',                      11, 'Extraire le barillet et sa roue.', 'automatique', 'gmt'),
   ('Déposer le remontoir, le rochet et le cliquet', 12, 'Déposer le pignon de remontoir, le rochet et le cliquet avec son ressort.', 'automatique', 'gmt'),
   ('Contrôler et trier les pièces',            13, 'Contrôler l''état des pièces et des pivots puis trier avant remontage.', 'automatique', 'gmt'),
   ('Remonter le remontoir / mise à l''heure',  14, 'Remonter le mécanisme de mise à l''heure et vérifier la fonction GMT.', 'automatique', 'gmt'),
   ('Remonter le barillet',                     15, 'Remonter le barillet et engrener sa roue avec le pignon de remontoir.', 'automatique', 'gmt'),
   ('Remonter le train de rouage',              16, 'Poser le train de rouage et vérifier l''engrènement et le jeu des pivots.', 'automatique', 'gmt'),
   ('Poser l''ancre et son pont',               17, 'Poser l''ancre et son pont puis vérifier l''impulsion.', 'automatique', 'gmt'),
   ('Poser le balancier / coq',                 18, 'Poser le balancier et le coq puis vérifier le battement.', 'automatique', 'gmt'),
   ('Vérifier le mouvement de base',            19, 'Vérifier la marche de base avant de poser modules auto et GMT.', 'automatique', 'gmt'),
   ('Remonter le module automatique',           20, 'Reposer le module de remontage automatique et le rotor.', 'automatique', 'gmt'),
   ('Remonter la roue et le module GMT',        21, 'Reposer la roue de GMT et le module de réglage de l''aiguille GMT.', 'automatique', 'gmt'),
   ('Remettre le cadran',                       22, 'Replacer le cadran et les éléments côté cadran.', 'automatique', 'gmt'),
   ('Poser les aiguilles (dont GMT alignée)',   23, 'Replacer les aiguilles et aligner l''aiguille GMT sur l''heure de référence.', 'automatique', 'gmt'),
   ('Emboîter et tester la fonction GMT',       24, 'Emboîter, poser le rotor, tester calage et basculement de l''aiguille GMT.', 'automatique', 'gmt');

-- ============================================================================
-- Fin du seed. Total attendu : 8 processus, 8 checklists indépendantes.
-- Source : Etapes-desassemblage-reassemblage.md (premier jet, à relire).
-- ============================================================================