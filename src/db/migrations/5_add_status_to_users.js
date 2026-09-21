export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (status IN (
        'active',
        'pending_payment',
        'suspended'
      ));
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    DROP COLUMN status;
  `);
};