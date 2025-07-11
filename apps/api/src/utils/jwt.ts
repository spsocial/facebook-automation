import jwt from 'jsonwebtoken';
import { JwtPayload } from '@repo/shared';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const generateRefreshToken = (): string => {
  return jwt.sign(
    { type: 'refresh', random: Math.random() },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};