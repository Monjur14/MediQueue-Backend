export const up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE subscription_plans (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL
        CHECK (name IN ('solo', 'clinic', 'hospital')),
      max_doctors INTEGER CHECK (max_doctors > 0),
      max_departments INTEGER CHECK (max_departments > 0),
      max_daily_patients INTEGER CHECK (max_daily_patients > 0),
      monthly_price NUMERIC(10, 2) NOT NULL
        CHECK (monthly_price >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS subscription_plans;`);
};