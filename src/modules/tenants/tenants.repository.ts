import { pool } from "../../config/database.js";

export const tenantsRepository = {
  async findTenantById(id: string) {
    const result = await pool.query(
      `SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async findUserByEmail(email: string) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    return result.rows[0] ?? null;
  },

  async countDoctorsInTenant(tenantId: string) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM users 
       WHERE tenant_id = $1 
       AND role = 'doctor' 
       AND deleted_at IS NULL`,
      [tenantId],
    );
    return parseInt(result.rows[0].count);
  },

  async getPlanByTenantId(tenantId: string) {
    const result = await pool.query(
      `SELECT sp.* FROM subscription_plans sp
       INNER JOIN subscriptions s ON s.plan_id = sp.id
       WHERE s.tenant_id = $1
       AND s.status = 'active'
       LIMIT 1`,
      [tenantId],
    );
    return result.rows[0] ?? null;
  },

  async createDoctor(data: {
    full_name: string;
    email: string;
    phone?: string;
    tenant_id: string;
    setup_token: string;
    setup_token_expires_at: Date;
  }) {
    const result = await pool.query(
      `INSERT INTO users 
        (full_name, email, phone, password_hash, role, tenant_id, 
         status, setup_token, setup_token_expires_at)
       VALUES ($1, $2, $3, '', 'doctor', $4, 'pending_payment', $5, $6)
       RETURNING id, full_name, email, phone, role, tenant_id, status, created_at`,
      [
        data.full_name,
        data.email,
        data.phone ?? null,
        data.tenant_id,
        data.setup_token,
        data.setup_token_expires_at,
      ],
    );
    return result.rows[0];
  },

  async updateTenant(
    tenantId: string,
    data: {
      name?: string;
      phone?: string;
      logo_url?: string;
    },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${index++}`);
      values.push(data.phone);
    }
    if (data.logo_url !== undefined) {
      fields.push(`logo_url = $${index++}`);
      values.push(data.logo_url);
    }

    fields.push(`updated_at = NOW()`);
    values.push(tenantId);

    const result = await pool.query(
      `UPDATE tenants
     SET ${fields.join(", ")}
     WHERE id = $${index} AND deleted_at IS NULL
     RETURNING id, name, email, phone, logo_url, slug, updated_at`,
      values,
    );
    return result.rows[0] ?? null;
  },
  async getDoctors(tenantId: string) {
    const result = await pool.query(
      `SELECT 
      id,
      full_name,
      email,
      phone,
      role,
      status,
      created_at
     FROM users
     WHERE tenant_id = $1
     AND role = 'doctor'
     AND deleted_at IS NULL
     ORDER BY created_at DESC`,
      [tenantId],
    );
    return result.rows;
  },
  async findDoctorInTenant(doctorId: string, tenantId: string) {
    const result = await pool.query(
      `SELECT * FROM users
     WHERE id = $1
     AND tenant_id = $2
     AND role = 'doctor'
     AND deleted_at IS NULL`,
      [doctorId, tenantId],
    );
    return result.rows[0] ?? null;
  },

  async softDeleteDoctor(doctorId: string) {
    await pool.query(
      `UPDATE users
     SET deleted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
      [doctorId],
    );
  },
  async updateDoctor(doctorId: string, tenantId: string, data: {
    full_name?: string;
    phone?: string;
  }) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.full_name !== undefined) {
      fields.push(`full_name = $${index++}`);
      values.push(data.full_name);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${index++}`);
      values.push(data.phone);
    }

    fields.push(`updated_at = NOW()`);

    // doctor id
    values.push(doctorId);
    // tenant id — security check
    values.push(tenantId);

    const result = await pool.query(
      `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = $${index++}
     AND tenant_id = $${index}
     AND role = 'doctor'
     AND deleted_at IS NULL
     RETURNING id, full_name, email, phone, role, status, updated_at`,
      values
    );
    return result.rows[0] ?? null;
  },
};
