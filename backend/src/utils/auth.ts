import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types/api';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      expiresIn: '48h',
      issuer: 'planning-poker-api'
    }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}