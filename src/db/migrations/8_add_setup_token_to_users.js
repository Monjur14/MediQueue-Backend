export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN setup_token            TEXT,
    ADD COLUMN setup_token_expires_at TIMESTAMPTZ;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    DROP COLUMN setup_token,
    DROP COLUMN setup_token_expires_at;
  `);
};