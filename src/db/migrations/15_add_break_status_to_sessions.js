export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_sessions
      DROP CONSTRAINT IF EXISTS queue_sessions_status_check;

    ALTER TABLE queue_sessions
      ADD CONSTRAINT queue_sessions_status_check
      CHECK (status IN ('open', 'break', 'closed'));
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_sessions
      DROP CONSTRAINT IF EXISTS queue_sessions_status_check;

    ALTER TABLE queue_sessions
      ADD CONSTRAINT queue_sessions_status_check
      CHECK (status IN ('open', 'closed'));
  `);
};
