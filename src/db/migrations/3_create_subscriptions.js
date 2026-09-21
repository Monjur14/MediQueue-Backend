export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      tenant_id UUID NOT NULL,
      plan_id INTEGER NOT NULL,

      status VARCHAR(20) NOT NULL
        CHECK (status IN (
          'active',
          'past_due',
          'cancelled',
          'expired'
        )),

      stripe_customer_id VARCHAR(100),
      stripe_subscription_id VARCHAR(100),

      current_period_start TIMESTAMPTZ NOT NULL,
      current_period_end TIMESTAMPTZ NOT NULL,

      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      cancelled_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_subscriptions_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id),

      CONSTRAINT fk_subscriptions_plan
        FOREIGN KEY (plan_id)
        REFERENCES subscription_plans(id),

      CONSTRAINT check_subscription_period
        CHECK (current_period_end > current_period_start)
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS subscriptions;`);
};