import { pool } from '../../config/database.js';

export const doctorsRepository = {

  async findAllByTenant(tenantId: string) {
    const result = await pool.query(
      `SELECT id, full_name, email, phone, created_at
       FROM users
       WHERE tenant_id = $1
       AND role = 'doctor'
       AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [tenantId]
    );
    return result.rows;
  },

  async create(data: {
    tenantId: string;
    full_name: string;
    email: string;
    phone?: string;
    password_hash: string;
  }) {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
       VALUES ($1, $2, $3, $4, 'doctor', $5, 'active')
       RETURNING id, full_name, email, phone, role, tenant_id, status, created_at`,
      [
        data.full_name,
        data.email,
        data.phone ?? null,
        data.password_hash,
        data.tenantId,
      ]
    );
    return result.rows[0];
  },

  async updateProfile(userId: string, data: {
    full_name?: string | undefined;
    phone?: string | undefined;
    preferred_channel?: string | undefined;
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
    if (data.preferred_channel !== undefined) {
      fields.push(`preferred_channel = $${index++}`);
      values.push(data.preferred_channel);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${index}
       AND role = 'doctor'
       AND deleted_at IS NULL
       RETURNING id, full_name, email, phone, role, preferred_channel, updated_at`,
      values
    );
    return result.rows[0] ?? null;
  },

  async getMyDepartments(doctorId: string, tenantId: string) {
    const result = await pool.query(
      `SELECT d.id, d.name, d.description
       FROM departments d
       INNER JOIN department_doctors dd ON dd.department_id = d.id
       WHERE dd.doctor_id = $1
       AND d.tenant_id   = $2
       AND d.deleted_at  IS NULL
       ORDER BY d.name ASC`,
      [doctorId, tenantId]
    );
    return result.rows;
  },

};
