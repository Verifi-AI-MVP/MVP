import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { logAudit } from '../services/audit.service.js';
import {
  createSignInChallenge,
  consumeNonce,
  verifyWalletSignature,
  findUserByWallet,
  createWalletUser,
  signWalletToken,
} from '../services/walletAuth.service.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { env } from '../config/env.js';

const router = Router();

const nonceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.rateLimit.nonceMax ?? 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many nonce requests. Try again shortly.', code: 'RATE_LIMITED' },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.rateLimit.authMax ?? 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in a few minutes.', code: 'RATE_LIMITED' },
});

const nonceValidation = [body('address').trim().notEmpty().isLength({ min: 32, max: 64 })];

const verifyValidation = [
  body('address').trim().notEmpty().isLength({ min: 32, max: 64 }),
  body('message').trim().notEmpty(),
  body('signature').trim().notEmpty(),
];

router.post('/nonce', nonceLimiter, validate(nonceValidation), async (req, res, next) => {
  try {
    const address = String(req.body.address).trim();
    const challenge = createSignInChallenge(address);
    res.json(challenge);
  } catch (err) {
    next(err);
  }
});

router.post('/verify', verifyLimiter, validate(verifyValidation), async (req, res, next) => {
  try {
    const { address, message, signature } = req.body;
    const addr = String(address).trim();

    if (!consumeNonce(addr, message)) {
      throw new AppError(401, 'Invalid or expired nonce', 'INVALID_NONCE');
    }

    const valid = await verifyWalletSignature(addr, message, signature);
    if (!valid) {
      throw new AppError(401, 'Invalid signature', 'INVALID_SIGNATURE');
    }

    const existing = await findUserByWallet(addr);
    if (existing && !existing.isActive) {
      throw new AppError(403, 'This account is disabled', 'ACCOUNT_DISABLED');
    }
    const user = existing ?? (await createWalletUser(addr));

    const token = signWalletToken(user);
    await logAudit({ userId: user.id, action: 'login', ipAddress: req.ip });

    res.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
      accessToken: token,
      expiresIn: 900,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, walletAddress: true, email: true, firstName: true, lastName: true, role: true },
    });
    if (!user) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await logAudit({ userId: req.user!.userId, action: 'logout', ipAddress: req.ip });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
