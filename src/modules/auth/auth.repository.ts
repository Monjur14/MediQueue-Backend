import { pool } from "../../config/database.js";

export const authRepository = {
  async findByEmail(email: string) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string) {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async findByRefreshToken(token: string) {
    const result = await pool.query(
      `SELECT * FROM users
       WHERE refresh_token = $1
       AND refresh_token_expires_at > NOW()
       AND deleted_at IS NULL`,
      [token],
    );
    return result.rows[0] ?? null;
  },

  async findPlanByName(name: string) {
    const result = await pool.query(
      `SELECT * FROM subscription_plans WHERE name = $1`,
      [name],
    );
    return result.rows[0] ?? null;
  },

  async getMe(userId: string) {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.role,
      u.status,
      u.preferred_channel,
      u.tenant_id,
      u.created_at,
      t.name  AS clinic_name,
      t.slug  AS clinic_slug,
      sp.name AS plan_name
     FROM users u
     LEFT JOIN tenants t           ON t.id = u.tenant_id
     LEFT JOIN subscriptions s     ON s.tenant_id = u.tenant_id AND s.status = 'active'
     LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );
  return result.rows[0] ?? null;
},

  async createPatient(data: {
    full_name: string;
    email: string;
    phone?: string;
    password_hash: string;
  }) {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'patient', 'active')
       RETURNING id, full_name, email, phone, role, status, created_at`,
      [data.full_name, data.email, data.phone ?? null, data.password_hash],
    );
    return result.rows[0];
  },

  async createTenantWithAdmin(data: {
    clinic_name: string;
    clinic_phone: string;
    plan_id: number;
    full_name: string;
    email: string;
    phone?: string;
    password_hash: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. create tenant
      const tenantResult = await client.query(
        `INSERT INTO tenants (name, phone, email, slug)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, slug`,
        [
          data.clinic_name,
          data.clinic_phone,
          data.email,
          data.clinic_name.toLowerCase().replace(/\s+/g, "-"),
        ],
      );
      const tenant = tenantResult.rows[0];

      // 2. create tenant_admin with pending_payment status
      const userResult = await client.query(
        `INSERT INTO users 
          (full_name, email, phone, password_hash, role, tenant_id, status)
         VALUES ($1, $2, $3, $4, 'tenant_admin', $5, 'pending_payment')
         RETURNING id, full_name, email, role, tenant_id, status, created_at`,
        [
          data.full_name,
          data.email,
          data.phone ?? null,
          data.password_hash,
          tenant.id,
        ],
      );
      const user = userResult.rows[0];

      // 3. create pending subscription
      await client.query(
        `INSERT INTO subscriptions
    (tenant_id, plan_id, status, current_period_start, current_period_end)
   VALUES ($1, $2, 'pending', NOW(), NOW() + INTERVAL '1 year')`,
        [tenant.id, data.plan_id],
      );

      await client.query("COMMIT");
      return { tenant, user };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
  async findBySetupToken(token: string) {
    const result = await pool.query(
      `SELECT * FROM users
     WHERE setup_token = $1
     AND setup_token_expires_at > NOW()
     AND deleted_at IS NULL`,
      [token],
    );
    return result.rows[0] ?? null;
  },

  async activateDoctor(userId: string, password_hash: string) {
    await pool.query(
      `UPDATE users
     SET password_hash          = $1,
         status                 = 'active',
         setup_token            = NULL,
         setup_token_expires_at = NULL
     WHERE id = $2`,
      [password_hash, userId],
    );
  },

  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    await pool.query(
      `UPDATE users
       SET refresh_token = $1, refresh_token_expires_at = $2
       WHERE id = $3`,
      [token, expiresAt, userId],
    );
  },

  async clearRefreshToken(userId: string) {
    await pool.query(
      `UPDATE users
       SET refresh_token = NULL, refresh_token_expires_at = NULL
       WHERE id = $1`,
      [userId],
    );
  },
};
