export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      tenant_id UUID,

      role VARCHAR(20) NOT NULL
        CHECK (role IN (
          'super_admin',
          'tenant_admin',
          'doctor',
          'patient'
        )),

      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE,

      password_hash TEXT NOT NULL,

      refresh_token TEXT,
      refresh_token_expires_at TIMESTAMPTZ,

      preferred_channel VARCHAR(10) DEFAULT 'sms'
        CHECK (preferred_channel IN (
          'whatsapp',
          'sms',
          'both'
        )),

      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      deleted_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_users_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id),

      CONSTRAINT check_user_tenant
        CHECK (
          (role = 'patient' AND tenant_id IS NULL)
          OR
          (role <> 'patient' AND tenant_id IS NOT NULL)
        )
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS users;`);
};