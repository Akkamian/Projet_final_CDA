-- ============================================================================
-- Watch Restoration Tracker — Schéma PostgreSQL (MPD)
-- ----------------------------------------------------------------------------
-- Script de création initiale. À jouer sur une base neuve :
--   psql -d <base> -f db/script_db.sql
-- Puis peupler le référentiel système :
--   psql -d <base> -f db/seed_processes.sql
--
-- Distinction MCD / MPD :
--   * MCD : identifiants sémantiques (movement_type + complication_type,
--     name + created_at, label, ...).
--   * MPD : ajout d'identifiants techniques (Id SERIAL / BIGSERIAL) là où
--     l'identifiant sémantique est instable (step_order réordonnable, label
--     modifiable) ou impossible à reporter en masse (clonage des étapes).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Référentiel système (tables de paramétrage, peuplées par seed)
--    Données stables de l'application, en amont des données utilisateur.
--    Les FKs descendent de ces tables vers les tables projets, jamais l'inverse.
-- ----------------------------------------------------------------------------

CREATE TABLE restoration_processes(
   movement_type VARCHAR(50) ,
   complication_type VARCHAR(50) ,
   PRIMARY KEY(movement_type, complication_type)
);

CREATE TABLE restoration_process_steps(
   Id SERIAL,
   label VARCHAR(255)  NOT NULL,
   step_order SMALLINT NOT NULL,
   step_description TEXT,
   movement_type VARCHAR(50)  NOT NULL,
   complication_type VARCHAR(50)  NOT NULL,
   PRIMARY KEY(Id),
   FOREIGN KEY(movement_type, complication_type) REFERENCES restoration_processes(movement_type, complication_type),
   -- Une seule étape par position dans un processus donné.
   -- DEFERRABLE : la renumérotation multi-lignes est vérifiée au COMMIT,
   -- ce qui permet les UPDATE de réordonnancement sans conflit transitoire.
   CONSTRAINT uq_process_steps_order UNIQUE (movement_type, complication_type, step_order)
      DEFERRABLE INITIALLY DEFERRED,
   -- Pas de doublon de libellé au sein d'un même processus.
   CONSTRAINT uq_process_steps_label UNIQUE (movement_type, complication_type, label)
);

CREATE TABLE users(
   mail VARCHAR(255) ,
   hashed_password VARCHAR(255)  NOT NULL,
   created_at TIMESTAMP NOT NULL,
   PRIMARY KEY(mail)
);

CREATE TABLE restoration_projects(
   name VARCHAR(255) ,
   created_at TIMESTAMP,
   completed_at TIMESTAMP,
   photo_before VARCHAR(255) ,
   photo_after VARCHAR(255) ,
   purchase_price INTEGER,
   resale_price INTEGER,
   resale_date TIMESTAMP,
   brand VARCHAR(100)  NOT NULL,
   model VARCHAR(150) ,
   status VARCHAR(50)  NOT NULL,
   -- Processus système instancié à la création du projet
   -- (que faut-il copier comme checklist dans ce projet ?).
   movement_type VARCHAR(50)  NOT NULL,
   complication_type VARCHAR(50)  NOT NULL,
   mail VARCHAR(255)  NOT NULL,
   PRIMARY KEY(name, created_at),
   FOREIGN KEY(mail) REFERENCES users(mail),
   FOREIGN KEY(movement_type, complication_type) REFERENCES restoration_processes(movement_type, complication_type)
);

-- Étapes d'un projet de restauration (clonées depuis le référentiel système
-- au moment de la création du projet, puis totalement indépendantes).
-- La PK est un identifiant technique : label est modifiable et step_order est
-- réordonnable, aucun des deux n'est stable — et le clonage en masse peut créer
-- plusieurs lignes avec le même label/created_at.
CREATE TABLE restoration_steps(
   Id BIGSERIAL,
   label VARCHAR(255)  NOT NULL,
   created_at TIMESTAMP NOT NULL,
   is_completed BOOLEAN,
   step_order SMALLINT NOT NULL,
   notes TEXT,
   completed_at TIMESTAMP,
   name VARCHAR(255)  NOT NULL,
   created_at_1 TIMESTAMP NOT NULL,   -- created_at du projet parent (PK composite)
   PRIMARY KEY(Id),
   FOREIGN KEY(name, created_at_1) REFERENCES restoration_projects(name, created_at),
   CONSTRAINT uq_project_steps_order UNIQUE (name, created_at_1, step_order)
      DEFERRABLE INITIALLY DEFERRED,
   CONSTRAINT uq_project_steps_label UNIQUE (name, created_at_1, label)
);

CREATE TABLE step_pics(
   url VARCHAR(255) ,
   uploaded_at TIMESTAMP NOT NULL,
   step_id BIGINT NOT NULL,
   PRIMARY KEY(url),
   -- Les photos suivent l'étape : suppression d'une étape => photos supprimées.
   FOREIGN KEY(step_id) REFERENCES restoration_steps(Id) ON DELETE CASCADE
);

CREATE TABLE performance_measurements(
   created_at TIMESTAMP,
   amplitude_degrees SMALLINT,
   rate_seconds_per_day SMALLINT,
   beat_error_ms SMALLINT,
   watch_position VARCHAR(50) ,
   name VARCHAR(255)  NOT NULL,
   created_at_1 TIMESTAMP NOT NULL,
   PRIMARY KEY(created_at),
   FOREIGN KEY(name, created_at_1) REFERENCES restoration_projects(name, created_at)
);

CREATE TABLE expenses(
   label VARCHAR(255) ,
   expense_date TIMESTAMP,
   amount NUMERIC(12,2)   NOT NULL,
   name VARCHAR(255)  NOT NULL,
   created_at TIMESTAMP NOT NULL,
   PRIMARY KEY(label, expense_date),
   FOREIGN KEY(name, created_at) REFERENCES restoration_projects(name, created_at)
);

-- ============================================================================
-- 3. Patterns de réordonnancement (documentation — à exécuter en transaction)
-- ----------------------------------------------------------------------------
-- Les contraintes UNIQUE sur (processus, step_order) et (projet, step_order)
-- sont DEFERRABLE INITIALLY DEFERRED : leur vérification est reportée au COMMIT,
-- ce qui autorise la renumérotation multi-lignes en une seule requête.
--
-- ⚠️ Adapter movement_type / complication_type (processus) ou name / created_at_1
-- (projet) au cas réel. Utiliser Id pour cibler une étape précise.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 MOVE : déplacer l'étape d'ordre 1 après l'étape d'ordre 4
--     Résultat : 2, 3, 4, 1
-- ----------------------------------------------------------------------------
-- BEGIN;
-- UPDATE restoration_process_steps
--    SET step_order = CASE
--          WHEN step_order = 1 THEN 4
--          WHEN step_order BETWEEN 2 AND 4 THEN step_order - 1
--          ELSE step_order
--        END
--  WHERE movement_type = 'mecanique_manuel'
--    AND complication_type = 'simple'
--    AND step_order BETWEEN 1 AND 4;
-- COMMIT;
--
-- Variante générique « déplacer l'étape d'ordre f après l'étape d'ordre t »
-- (f < t) : WHEN step_order = f THEN t / WHEN BETWEEN f+1 AND t THEN step_order - 1.
-- Le même patron s'applique à restoration_steps avec (name, created_at_1).

-- ----------------------------------------------------------------------------
-- 3.2 INSERT : insérer une nouvelle étape en position k (décale k..n vers le bas)
-- ----------------------------------------------------------------------------
-- BEGIN;
-- UPDATE restoration_process_steps
--    SET step_order = step_order + 1
--  WHERE movement_type = 'mecanique_manuel'
--    AND complication_type = 'simple'
--    AND step_order >= 3;
-- INSERT INTO restoration_process_steps
--    (label, step_order, step_description, movement_type, complication_type)
-- VALUES ('Nouvelle étape', 3, NULL, 'mecanique_manuel', 'simple');
-- COMMIT;

-- ----------------------------------------------------------------------------
-- 3.3 DELETE : supprimer l'étape de position k (décale k+1..n vers le haut)
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DELETE FROM restoration_process_steps WHERE Id = 42;
-- UPDATE restoration_process_steps
--    SET step_order = step_order - 1
--  WHERE movement_type = 'mecanique_manuel'
--    AND complication_type = 'simple'
--    AND step_order > 3;
-- COMMIT;
--
-- Pour un projet (restoration_steps), filtrer sur (name, created_at_1).
-- Le DELETE est suivi de la renumérotation dans la même transaction :
-- aucun trou n'est laissé dans la séquence d'ordre contiguë.
