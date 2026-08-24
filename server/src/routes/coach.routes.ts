import { Router } from 'express';
import { body } from 'express-validator';
import { getCoachResponse } from '../services/financialCoach.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

const coachLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.rateLimit.coachMax ?? 20,
  message: { error: 'Too many coach requests. Please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(coachLimiter);

const chatValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 2000 })
    .withMessage('Message must be 2000 characters or less'),
  body('history')
    .optional()
    .isArray()
    .withMessage('History must be an array'),
  body('history.*.role')
    .optional()
    .isIn(['user', 'assistant'])
    .withMessage('Invalid role in history'),
  body('history.*.content')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Invalid content in history'),
];

router.get('/history', async (req, res, next) => {
  try {
    const rows = await prisma.coachMessage.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/history', async (req, res, next) => {
  try {
    await prisma.coachMessage.deleteMany({ where: { userId: req.user!.userId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/chat', validate(chatValidation), async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user!.userId;

    await prisma.coachMessage.create({
      data: { userId, role: 'user', content: message },
    });

    const result = await getCoachResponse(userId, message, history);

    await prisma.coachMessage.create({
      data: { userId, role: 'assistant', content: result.message },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
