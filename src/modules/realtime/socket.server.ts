import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createServer } from 'http';
import { redis } from '../../config/redis.js';
import { handleConnection } from './connection.handler.js';
import type { Express } from 'express';

export let io: Server;

export const initSocketServer = (app: Express) => {
  const httpServer = createServer(app);

  // create a separate redis connection for pub/sub
  const pubClient = redis;
  const subClient = redis.duplicate();

  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  // attach redis adapter — enables multi-server scaling
  io.adapter(createAdapter(pubClient, subClient));

  // handle connections
  io.on('connection', handleConnection);

  console.log('✅ Socket.io initialized');

  return httpServer;
};