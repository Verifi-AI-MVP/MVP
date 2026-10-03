import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import type { JwtPayload } from '../middleware/auth.middleware.js';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function createUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const passwordHash = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash,
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isActive: true },
  });
}
