import { pool } from '../../config/database.js';
import type { UpdatePatientInput } from './patients.schema.js';

export const patientsRepository = {

  async updatePatient(userId: string, data: UpdatePatientInput) {
    // build dynamic query — only update fields that were sent
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

    // always update updated_at
    fields.push(`updated_at = NOW()`);

    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING id, full_name, email, phone, preferred_channel, updated_at`,
      values
    );

    return result.rows[0] ?? null;
  },
};