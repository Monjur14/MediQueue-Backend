import { pool } from '../../config/database.js';

export const departmentsRepository = {

    async countDepartmentsInTenant(tenantId: string) {
        const result = await pool.query(
            `SELECT COUNT(*) FROM departments
       WHERE tenant_id = $1
       AND deleted_at IS NULL`,
            [tenantId]
        );
        return parseInt(result.rows[0].count);
    },

    async create(data: {
        tenant_id: string | undefined;
        name: string | undefined;
        description?: string | undefined;
    }) {
        const result = await pool.query(
            `INSERT INTO departments (tenant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, tenant_id, name, description, is_active, created_at`,
            [data.tenant_id, data.name, data.description ?? null]
        );
        return result.rows[0];
    },

    async findAll(tenantId: string) {
        const result = await pool.query(
            `SELECT id, name, description, is_active, created_at
       FROM departments
       WHERE tenant_id = $1
       AND deleted_at IS NULL
       ORDER BY created_at ASC`,
            [tenantId]
        );
        return result.rows;
    },

    async findById(id: string, tenantId: string) {
        const result = await pool.query(
            `SELECT id, name, description, is_active, created_at, updated_at
       FROM departments
       WHERE id = $1
       AND tenant_id = $2
       AND deleted_at IS NULL`,
            [id, tenantId]
        );
        return result.rows[0] ?? null;
    },

    async update(id: string, tenantId: string, data: {
        name?: string | undefined;
        description?: string | undefined;
        is_active?: boolean | undefined;
    }) {
        const fields: string[] = [];
        const values: unknown[] = [];
        let index = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${index++}`);
            values.push(data.name);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${index++}`);
            values.push(data.description);
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${index++}`);
            values.push(data.is_active);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);
        values.push(tenantId);

        const result = await pool.query(
            `UPDATE departments
       SET ${fields.join(', ')}
       WHERE id = $${index++}
       AND tenant_id = $${index}
       AND deleted_at IS NULL
       RETURNING id, name, description, is_active, updated_at`,
            values
        );
        return result.rows[0] ?? null;
    },

    async softDelete(id: string, tenantId: string) {
        const result = await pool.query(
            `UPDATE departments
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       AND tenant_id = $2
       AND deleted_at IS NULL
       RETURNING id`,
            [id, tenantId]
        );
        return result.rows[0] ?? null;
    },
    async assignDoctor(departmentId: string, doctorId: string) {
        const result = await pool.query(
            `INSERT INTO department_doctors (department_id, doctor_id)
     VALUES ($1, $2)
     RETURNING id, department_id, doctor_id, created_at`,
            [departmentId, doctorId]
        );
        return result.rows[0];
    },

    async removeDoctor(departmentId: string, doctorId: string) {
        const result = await pool.query(
            `DELETE FROM department_doctors
     WHERE department_id = $1
     AND doctor_id = $2
     RETURNING id`,
            [departmentId, doctorId]
        );
        return result.rows[0] ?? null;
    },

    async getDoctorsInDepartment(departmentId: string) {
        const result = await pool.query(
            `SELECT 
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.status,
      dd.created_at AS assigned_at
     FROM department_doctors dd
     INNER JOIN users u ON u.id = dd.doctor_id
     WHERE dd.department_id = $1
     AND u.deleted_at IS NULL`,
            [departmentId]
        );
        return result.rows;
    },

    async findDoctorInTenant(doctorId: string, tenantId: string) {
        const result = await pool.query(
            `SELECT id FROM users
     WHERE id = $1
     AND tenant_id = $2
     AND role = 'doctor'
     AND deleted_at IS NULL`,
            [doctorId, tenantId]
        );
        return result.rows[0] ?? null;
    },

    async isDoctorAssigned(departmentId: string, doctorId: string) {
        const result = await pool.query(
            `SELECT id FROM department_doctors
     WHERE department_id = $1
     AND doctor_id = $2`,
            [departmentId, doctorId]
        );
        return result.rows[0] ?? null;
    },

    async getOverview(tenantId: string) {
        const result = await pool.query(
            `SELECT
      d.id,
      d.name,
      d.description,
      d.is_active,
      COALESCE(
        json_agg(
          json_build_object(
            'id',         u.id,
            'full_name',  u.full_name,
            'email',      u.email,
            'phone',      u.phone
          )
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS doctors
     FROM departments d
     LEFT JOIN department_doctors dd ON dd.department_id = d.id
     LEFT JOIN users u ON u.id = dd.doctor_id AND u.deleted_at IS NULL
     WHERE d.tenant_id = $1
     AND d.deleted_at IS NULL
     GROUP BY d.id
     ORDER BY d.created_at ASC`,
            [tenantId]
        );
        return result.rows;
    },
    async getUnassignedDoctors(tenantId: string) {
        const result = await pool.query(
            `SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.status
     FROM users u
     WHERE u.tenant_id = $1
     AND u.role = 'doctor'
     AND u.deleted_at IS NULL
     AND u.id NOT IN (
       SELECT dd.doctor_id
       FROM department_doctors dd
       INNER JOIN departments d ON d.id = dd.department_id
       WHERE d.tenant_id = $1
       AND d.deleted_at IS NULL
     )`,
            [tenantId]
        );
        return result.rows;
    },
    async findTenantBySlug(slug: string) {
        const client = await pool.connect();
        try {
            await client.query(`SET LOCAL app.current_user_role  = 'public'`);
            const result = await client.query(
                `SELECT id, name, slug FROM tenants
       WHERE slug = $1
       AND deleted_at IS NULL
       AND is_active = TRUE`,
                [slug]
            );
            return result.rows[0] ?? null;
        } finally {
            client.release();
        }
    },

    async getPublicDepartments(tenantId: string) {
        const client = await pool.connect();
        try {
            await client.query(`SET LOCAL app.current_user_role  = 'public'`);
            const result = await client.query(
                `SELECT id, name, description
       FROM departments
       WHERE tenant_id = $1
       AND is_active = TRUE
       AND deleted_at IS NULL
       ORDER BY created_at ASC`,
                [tenantId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    },

    async getPublicDoctorsInDepartment(departmentId: string) {
        const client = await pool.connect();
        try {
            await client.query(`SET LOCAL app.current_user_role  = 'public'`);
            const result = await client.query(
                `SELECT u.id, u.full_name, u.phone
       FROM department_doctors dd
       INNER JOIN users u ON u.id = dd.doctor_id
       WHERE dd.department_id = $1
       AND u.deleted_at IS NULL
       AND u.is_active = TRUE
       AND u.status = 'active'`,
                [departmentId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    },
};