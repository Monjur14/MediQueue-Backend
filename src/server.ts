import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { pool } from './config/database.js';
import { redis } from './config/redis.js';
import { initSocketServer } from './modules/realtime/socket.server.js';
import { initQueueGateway } from './modules/realtime/queue.gateway.js';

const PORT = process.env.PORT || 5001;

const start = async () => {
  try {
    // test database connection
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // test redis connection
    await redis.ping();
    console.log('✅ Redis connected');

    // init socket.io — returns httpServer instead of app.listen
    const httpServer = initSocketServer(app);

    // init queue gateway (Redis Pub/Sub → Socket.io bridge)
    await initQueueGateway();

    // start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
};

start();