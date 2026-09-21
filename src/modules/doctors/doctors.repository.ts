import { pool } from '../../config/database.js';

export const doctorsRepository = {

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
};