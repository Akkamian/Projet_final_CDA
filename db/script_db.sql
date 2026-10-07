
-- ---------- Types ----------

CREATE TYPE movement_code_enum AS ENUM ('manual', 'automatic');

-- ---------- Données de référence (alimentées par le seed) ----------

CREATE TABLE movement_types (
    movement_code movement_code_enum PRIMARY KEY,
    label         VARCHAR(50) NOT NULL
);

CREATE TABLE complications (
    complication_code VARCHAR(50) PRIMARY KEY,
    label             VARCHAR(50) NOT NULL
);

CREATE TABLE template_steps (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label             VARCHAR(255) NOT NULL,
    step_order        SMALLINT     NOT NULL,
    step_description  TEXT,
    movement_code     movement_code_enum,
    complication_code VARCHAR(50),

    CONSTRAINT fk_template_steps_movement_type
        FOREIGN KEY (movement_code) REFERENCES movement_types (movement_code),
    CONSTRAINT fk_template_steps_complication
        FOREIGN KEY (complication_code) REFERENCES complications (complication_code),

    -- exclusivité stricte : exactement un des deux liens
    CONSTRAINT chk_template_steps_xor
        CHECK ((movement_code IS NULL) <> (complication_code IS NULL)),
    -- pas deux étapes au même rang dans une même liste
    CONSTRAINT uq_template_steps_movement_order     UNIQUE (movement_code, step_order),
    CONSTRAINT uq_template_steps_complication_order UNIQUE (complication_code, step_order),
    -- pas deux étapes de même libellé dans une même liste
    CONSTRAINT uq_template_steps_movement_label     UNIQUE (movement_code, label),
    CONSTRAINT uq_template_steps_complication_label UNIQUE (complication_code, label)
);

-- ---------- Données utilisateur ----------

CREATE TABLE users (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    email_verified_at   TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ
);

CREATE TABLE watches (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        INTEGER            NOT NULL,
    movement_code  movement_code_enum NOT NULL,
    brand          VARCHAR(255)       NOT NULL,
    model          VARCHAR(255)       NOT NULL,
    purchase_price NUMERIC(10,2),
    purchase_date  DATE,
    resale_price   NUMERIC(10,2),
    resale_date    DATE,
    created_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),

    CONSTRAINT fk_watches_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_watches_movement_type
        FOREIGN KEY (movement_code) REFERENCES movement_types (movement_code),

    CONSTRAINT chk_watches_purchase_price CHECK (purchase_price >= 0),
    CONSTRAINT chk_watches_resale_price   CHECK (resale_price >= 0),
    -- prix et date de revente renseignés ensemble ou pas du tout
    CONSTRAINT chk_watches_resale
        CHECK ((resale_price IS NULL) = (resale_date IS NULL)),
    -- la revente ne précède pas l'achat (sans effet si l'une des dates est inconnue)
    CONSTRAINT chk_watches_resale_after_purchase
        CHECK (resale_date >= purchase_date)
);

-- association N-N « comporte »
CREATE TABLE comporte (
    watch_id          INTEGER     NOT NULL,
    complication_code VARCHAR(50) NOT NULL,

    PRIMARY KEY (watch_id, complication_code),

    CONSTRAINT fk_comporte_watch
        FOREIGN KEY (watch_id) REFERENCES watches (id) ON DELETE CASCADE,
    CONSTRAINT fk_comporte_complication
        FOREIGN KEY (complication_code) REFERENCES complications (complication_code)
);

CREATE TABLE restoration_projects (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    watch_id     INTEGER      NOT NULL,
    status       VARCHAR(50)  NOT NULL DEFAULT 'in_progress',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    photo_before VARCHAR(255),
    photo_after  VARCHAR(255),

    CONSTRAINT fk_restoration_projects_watch
        FOREIGN KEY (watch_id) REFERENCES watches (id) ON DELETE CASCADE,

    CONSTRAINT chk_restoration_projects_status
        CHECK (status IN ('in_progress', 'completed'))
);

CREATE TABLE restoration_steps (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id   INTEGER      NOT NULL,
    step_order   SMALLINT     NOT NULL,
    label        VARCHAR(255) NOT NULL,
    notes        TEXT,
    is_completed BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,

    CONSTRAINT fk_restoration_steps_project
        FOREIGN KEY (project_id) REFERENCES restoration_projects (id) ON DELETE CASCADE
);

CREATE TABLE step_pics (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restoration_step_id INTEGER      NOT NULL,
    url                 VARCHAR(255) NOT NULL,
    uploaded_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_step_pics_restoration_step
        FOREIGN KEY (restoration_step_id) REFERENCES restoration_steps (id) ON DELETE CASCADE
);

CREATE TABLE performance_measurements (
    id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id           INTEGER      NOT NULL,
    measured_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    rate_seconds_per_day NUMERIC(5,2) NOT NULL,
    beat_error_ms        NUMERIC(5,2) NOT NULL,
    amplitude_degrees    NUMERIC(5,2) NOT NULL,
    watch_position       VARCHAR(50),

    CONSTRAINT fk_performance_measurements_project
        FOREIGN KEY (project_id) REFERENCES restoration_projects (id) ON DELETE CASCADE,

    -- la marche (rate_seconds_per_day) peut être négative : la montre retarde
    CONSTRAINT chk_performance_measurements_beat_error CHECK (beat_error_ms >= 0),
    CONSTRAINT chk_performance_measurements_amplitude  CHECK (amplitude_degrees >= 0)
);

CREATE TABLE expenses (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id   INTEGER       NOT NULL,
    label        VARCHAR(255)  NOT NULL,
    amount       NUMERIC(10,2) NOT NULL,
    expense_date DATE          NOT NULL,

    CONSTRAINT fk_expenses_project
        FOREIGN KEY (project_id) REFERENCES restoration_projects (id) ON DELETE CASCADE,

    CONSTRAINT chk_expenses_amount CHECK (amount >= 0)
);

-- ---------- Index sur les clés étrangères ----------
-- PostgreSQL ne crée pas d'index automatiquement sur une clé étrangère.
-- Déjà couverts : template_steps (par ses UNIQUE) et comporte.watch_id (par sa clé primaire).

CREATE INDEX idx_watches_user_id               ON watches (user_id);
CREATE INDEX idx_watches_movement_code         ON watches (movement_code);
CREATE INDEX idx_comporte_complication_code    ON comporte (complication_code);
CREATE INDEX idx_restoration_projects_watch_id ON restoration_projects (watch_id);
CREATE INDEX idx_restoration_steps_project_id  ON restoration_steps (project_id);
CREATE INDEX idx_step_pics_restoration_step_id ON step_pics (restoration_step_id);
CREATE INDEX idx_measurements_project_id       ON performance_measurements (project_id);
CREATE INDEX idx_expenses_project_id           ON expenses (project_id);

-- ---------- Un seul projet en cours par montre ----------
-- Index unique partiel : deux projets « in_progress » sur la même montre sont refusés.

CREATE UNIQUE INDEX uq_restoration_projects_one_in_progress
    ON restoration_projects (watch_id)
    WHERE status = 'in_progress';
