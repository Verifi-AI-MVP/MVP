import { Router } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { centsToDollars } from '../lib/money.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  completeBankLink,
  createLinkToken,
  getBankLinkConfig,
  syncAccountTransactions,
} from '../services/bankLink.service.js';

const router = Router();
router.use(authenticate);

const createValidation = [
  body('institutionName').trim().notEmpty().withMessage('Institution name required'),
  body('accountName').optional().trim(),
  body('accountType').optional().trim(),
  body('mask').optional().trim().isLength({ max: 10 }),
];

router.get('/link/config', (_req, res) => {
  res.json(getBankLinkConfig());
});

router.post('/link/token', async (req, res, next) => {
  try {
    const token = await createLinkToken(req.user!.userId);
    res.json(token);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.userId, isActive: true },
      orderBy: { linkedAt: 'desc' },
    });
    res.json(accounts.map((a) => ({ ...a, currentBalance: centsToDollars(a.currentBalance) })));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/link',
  validate([
    body('institutionId').optional().trim().isLength({ max: 64 }),
    body('publicToken').optional().trim().isLength({ max: 256 }),
  ]),
  async (req, res, next) => {
    try {
      const result = await completeBankLink(req.user!.userId, {
        institutionId: req.body.institutionId,
        publicToken: req.body.publicToken,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/sync', validate([param('id').isUUID()]), async (req, res, next) => {
  try {
    const result = await syncAccountTransactions(req.user!.userId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createValidation), async (req, res, next) => {
  try {
    const account = await prisma.account.create({
      data: {
        userId: req.user!.userId,
        institutionName: req.body.institutionName,
        accountName: req.body.accountName,
        accountType: req.body.accountType ?? 'checking',
        mask: req.body.mask,
        provider: 'demo',
        linkStatus: 'linked',
      },
    });
    res.status(201).json({ ...account, currentBalance: centsToDollars(account.currentBalance) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validate([param('id').isUUID()]), async (req, res, next) => {
  try {
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!account) throw new AppError(404, 'Account not found', 'NOT_FOUND');
    res.json({ ...account, currentBalance: centsToDollars(account.currentBalance) });
  } catch (err) {
    next(err);
  }
});

export default router;
