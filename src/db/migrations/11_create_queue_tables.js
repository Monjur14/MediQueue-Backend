export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE queue_sessions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id     UUID NOT NULL REFERENCES tenants(id),
      doctor_id     UUID NOT NULL REFERENCES users(id),
      department_id UUID NOT NULL REFERENCES departments(id),
      session_date  DATE NOT NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
      max_tokens    INTEGER NOT NULL,
      current_token INTEGER NOT NULL DEFAULT 0,
      total_issued  INTEGER NOT NULL DEFAULT 0,
      opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at     TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT unique_doctor_session_per_day
        UNIQUE (doctor_id, session_date)
    );

    CREATE TABLE queue_tokens (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id    UUID NOT NULL REFERENCES queue_sessions(id),
      patient_id    UUID NOT NULL REFERENCES users(id),
      token_number  INTEGER NOT NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'waiting'
                    CHECK (status IN (
                      'waiting',
                      'called',
                      'in_consultation',
                      'completed',
                      'skipped'
                    )),
      fee_paid      BOOLEAN NOT NULL DEFAULT FALSE,
      fee_amount    NUMERIC(10,2),
      fee_paid_at   TIMESTAMPTZ,
      called_at     TIMESTAMPTZ,
      completed_at  TIMESTAMPTZ,
      notes         TEXT,
      notes_version INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT unique_token_per_session
        UNIQUE (session_id, token_number),

      CONSTRAINT unique_patient_per_session
        UNIQUE (session_id, patient_id)
    );

    CREATE TABLE doctor_breaks (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id        UUID NOT NULL REFERENCES queue_sessions(id),
      doctor_id         UUID NOT NULL REFERENCES users(id),
      expected_duration INTEGER NOT NULL,
      started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at          TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS doctor_breaks;
    DROP TABLE IF EXISTS queue_tokens;
    DROP TABLE IF EXISTS queue_sessions;
  `);
};