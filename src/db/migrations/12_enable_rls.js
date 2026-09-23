export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tenants             ENABLE ROW LEVEL SECURITY;
    ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
    ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE departments         ENABLE ROW LEVEL SECURITY;
    ALTER TABLE department_doctors  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE queue_sessions      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE queue_tokens        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE doctor_breaks       ENABLE ROW LEVEL SECURITY;

    CREATE POLICY tenant_isolation ON tenants
      USING (
        id = current_setting('app.current_tenant_id', TRUE)::UUID
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );

    CREATE POLICY tenant_isolation ON users
      USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
        OR (
          role = 'patient'
          AND id = current_setting('app.current_user_id', TRUE)::UUID
        )
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );

    CREATE POLICY tenant_isolation ON subscriptions
      USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );

    CREATE POLICY tenant_isolation ON departments
      USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );

    CREATE POLICY tenant_isolation ON department_doctors
      USING (
        department_id IN (
          SELECT id FROM departments
          WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
        )
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );

    CREATE POLICY tenant_isolation ON queue_sessions
      USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );

    CREATE POLICY tenant_isolation ON queue_tokens
      USING (
        session_id IN (
          SELECT id FROM queue_sessions
          WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
        )
        OR patient_id = current_setting('app.current_user_id', TRUE)::UUID
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );

    CREATE POLICY tenant_isolation ON doctor_breaks
      USING (
        session_id IN (
          SELECT id FROM queue_sessions
          WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
        )
        OR current_setting('app.current_user_role', TRUE) = 'super_admin'
        OR current_setting('app.current_user_role', TRUE) = 'public'
      );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS tenant_isolation ON tenants;
    DROP POLICY IF EXISTS tenant_isolation ON users;
    DROP POLICY IF EXISTS tenant_isolation ON subscriptions;
    DROP POLICY IF EXISTS tenant_isolation ON departments;
    DROP POLICY IF EXISTS tenant_isolation ON department_doctors;
    DROP POLICY IF EXISTS tenant_isolation ON queue_sessions;
    DROP POLICY IF EXISTS tenant_isolation ON queue_tokens;
    DROP POLICY IF EXISTS tenant_isolation ON doctor_breaks;

    ALTER TABLE tenants             DISABLE ROW LEVEL SECURITY;
    ALTER TABLE users               DISABLE ROW LEVEL SECURITY;
    ALTER TABLE subscriptions       DISABLE ROW LEVEL SECURITY;
    ALTER TABLE departments         DISABLE ROW LEVEL SECURITY;
    ALTER TABLE department_doctors  DISABLE ROW LEVEL SECURITY;
    ALTER TABLE queue_sessions      DISABLE ROW LEVEL SECURITY;
    ALTER TABLE queue_tokens        DISABLE ROW LEVEL SECURITY;
    ALTER TABLE doctor_breaks       DISABLE ROW LEVEL SECURITY;
  `);
};