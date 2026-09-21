import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const seed = async () => {
  try {
    await pool.query(`
      INSERT INTO subscription_plans (
        name,
        max_doctors,
        max_departments,
        max_daily_patients,
        monthly_price
      )
      VALUES
        ('solo',     1,    1,    50,   20.00),
        ('clinic',   20,   5,    300,  150.00),
        ('hospital', NULL, NULL, NULL, 500.00)
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('✅ Subscription plans seeded successfully');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
};

seed();