import { pool } from '../../config/database.js';

export const clinicsRepository = {

  async searchClinics(search: string) {
    const result = await pool.query(
      `SELECT
        t.id,
        t.name,
        t.slug,
        t.phone,
        t.logo_url,
        sp.name AS plan_name,
        COUNT(DISTINCT d.id)  AS total_departments,
        COUNT(DISTINCT u.id)  AS total_doctors
       FROM tenants t
       LEFT JOIN subscriptions s    ON s.tenant_id = t.id AND s.status = 'active'
       LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
       LEFT JOIN departments d      ON d.tenant_id = t.id AND d.deleted_at IS NULL AND d.is_active = TRUE
       LEFT JOIN users u            ON u.tenant_id = t.id AND u.role = 'doctor' AND u.deleted_at IS NULL
       WHERE t.is_active = TRUE
       AND t.deleted_at IS NULL
       AND t.name ILIKE $1
       GROUP BY t.id, sp.name
       ORDER BY t.name ASC`,
      [`%${search}%`]
    );
    return result.rows;
  },
};