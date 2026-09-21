export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE departments (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   UUID NOT NULL,
      name        VARCHAR(100) NOT NULL,
      description TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      deleted_at  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_departments_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id),

      CONSTRAINT unique_department_name_per_tenant
        UNIQUE (tenant_id, name)
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS departments;`);
};