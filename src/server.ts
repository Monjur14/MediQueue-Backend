import app from './app.js';
import { pool } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
};

start();