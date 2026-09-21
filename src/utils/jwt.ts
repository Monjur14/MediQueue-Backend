import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET         = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const jwtUtil = {

  generateAccessToken(payload: {
    userId:   string;
    role:     string;
    tenantId: string | null;
  }) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  },

  generateRefreshToken(payload: { userId: string }) {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  },

  verifyAccessToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as {
      userId:   string;
      role:     string;
      tenantId: string | null;
    };
  },

  verifyRefreshToken(token: string) {
    return jwt.verify(token, JWT_REFRESH_SECRET) as {
      userId: string;
    };
  },
};