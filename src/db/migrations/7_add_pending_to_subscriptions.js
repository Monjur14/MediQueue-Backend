export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE subscriptions
    DROP CONSTRAINT subscriptions_status_check;

    ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN (
        'pending',
        'active',
        'past_due',
        'cancelled',
        'expired'
      ));
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE subscriptions
    DROP CONSTRAINT subscriptions_status_check;

    ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN (
        'active',
        'past_due',
        'cancelled',
        'expired'
      ));
  `);
};