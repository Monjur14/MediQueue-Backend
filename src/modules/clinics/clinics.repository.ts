import { pool } from '../../config/database.js';

export const clinicsRepository = {

  async searchClinics(search: string) {
    const client = await pool.connect();
    try {
      await client.query(`SET LOCAL app.current_user_role = 'public'`);
      const result = await client.query(
        `SELECT
        t.id, t.name, t.slug, t.phone, t.logo_url,
        sp.name AS plan_name,
        COUNT(DISTINCT d.id)  AS total_departments,
        COUNT(DISTINCT u.id)  AS total_doctors
       FROM tenants t
       LEFT JOIN subscriptions s     ON s.tenant_id = t.id AND s.status = 'active'
       LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
       LEFT JOIN departments d        ON d.tenant_id = t.id AND d.deleted_at IS NULL
       LEFT JOIN users u              ON u.tenant_id = t.id AND u.role = 'doctor' AND u.deleted_at IS NULL
       WHERE t.is_active = TRUE
       AND t.deleted_at IS NULL
       AND t.name ILIKE $1
       GROUP BY t.id, sp.name
       ORDER BY t.name ASC`,
        [`%${search}%`]
      );
      return result.rows;
    } finally {
      client.release();
    }
  },

  async searchDoctors(search: string) {
    const client = await pool.connect();
    try {
      await client.query(`SET LOCAL app.current_user_role = 'public'`);
      const result = await client.query(
        `SELECT
           u.id          AS doctor_id,
           u.full_name   AS doctor_name,
           t.id          AS tenant_id,
           t.name        AS clinic_name,
           t.slug        AS clinic_slug,
           dep.name      AS department_name
         FROM users u
         JOIN tenants t            ON t.id = u.tenant_id AND t.is_active = TRUE AND t.deleted_at IS NULL
         LEFT JOIN department_doctors dd  ON dd.doctor_id = u.id
         LEFT JOIN departments dep        ON dep.id = dd.department_id AND dep.deleted_at IS NULL
         WHERE u.role = 'doctor'
           AND u.deleted_at IS NULL
           AND u.full_name ILIKE $1
         ORDER BY u.full_name ASC
         LIMIT 20`,
        [`%${search}%`]
      );
      return result.rows;
    } finally {
      client.release();
    }
  },

  async getClinicQueue(slug: string) {
    const client = await pool.connect();
    try {
      await client.query(`SET LOCAL app.current_user_role = 'public'`);
      const result = await client.query(
        `SELECT
           qs.id,
           qs.status,
           qs.max_tokens,
           qs.current_token,
           qs.total_issued,
           u.full_name   AS doctor_name,
           dep.name      AS department_name,
           COUNT(qt.id) FILTER (WHERE qt.status = 'waiting')   AS waiting_count,
           COUNT(qt.id) FILTER (WHERE qt.status = 'completed') AS completed_count,
           COUNT(qt.id) FILTER (WHERE qt.status = 'skipped')   AS skipped_count
         FROM queue_sessions qs
         JOIN tenants t       ON t.id = qs.tenant_id AND t.slug = $1 AND t.is_active = TRUE AND t.deleted_at IS NULL
         JOIN users u         ON u.id = qs.doctor_id
         LEFT JOIN departments dep ON dep.id = qs.department_id
         LEFT JOIN queue_tokens qt ON qt.session_id = qs.id
         WHERE qs.session_date = CURRENT_DATE
           AND qs.status IN ('open', 'break')
         GROUP BY qs.id, u.full_name, dep.name
         ORDER BY dep.name ASC NULLS LAST, u.full_name ASC`,
        [slug]
      );
      return result.rows;
    } finally {
      client.release();
    }
  },
};
