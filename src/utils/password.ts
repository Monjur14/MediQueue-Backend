import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const passwordUtil = {
  hash(password: string) {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  compare(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  },
};