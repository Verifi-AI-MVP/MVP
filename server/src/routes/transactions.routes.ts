import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { centsToDollars, dollarsToCents } from '../lib/money.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { recordFeedback } from '../services/categorizationFeedback.service.js';
import { categorize } from '../services/categorization.service.js';

const router = Router();
router.use(authenticate);

const createValidation = [
  body('accountId').isUUID().withMessage('Valid account ID required'),
  body('amount').isFloat().withMessage('Valid amount required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('name').optional().trim().isLength({ max: 255 }),
  body('merchantName').optional().trim().isLength({ max: 255 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('subcategory').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const listValidation = [
  query('accountId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('category').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
];

async function checkAccount(userId: string, accountId: string) {
  const acc = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!acc) throw new AppError(404, 'Account not found', 'NOT_FOUND');
  return acc;
}

router.get('/categories', async (req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length === 0) return res.json([]);

    const rows = await prisma.transaction.findMany({
      where: { accountId: { in: accountIds }, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    res.json(rows.map((r) => r.category).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

router.get('/', validate(listValidation), async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { accountId, startDate, endDate, category, limit = 50 } = req.query as Record<string, string | undefined>;

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    if (accountIds.length === 0) {
      return res.json([]);
    }

    if (accountId && !accountIds.includes(accountId)) {
      throw new AppError(403, 'Access denied to account', 'FORBIDDEN');
    }

    const where: { accountId: string | { in: string[] }; date?: { gte?: Date; lte?: Date }; category?: string } = {
      accountId: accountId ?? { in: accountIds },
    };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (category) where.category = category;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(parseInt(String(limit ?? '50'), 10) || 50, 200),
      include: { account: { select: { institutionName: true, mask: true } } },
    });

    res.json(transactions.map((tx) => ({ ...tx, amount: centsToDollars(tx.amount) })));
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createValidation), async (req, res, next) => {
  try {
    await checkAccount(req.user!.userId, req.body.accountId);

    let category = req.body.category;
    let subcategory = req.body.subcategory;
    if (category == null || category === '') {
      const result = categorize({
        merchantName: req.body.merchantName || req.body.name || 'Unknown',
        amount: parseFloat(req.body.amount),
        description: req.body.notes,
      });
      category = result.category;
      subcategory = result.subcategory ?? undefined;
    }

    const tx = await prisma.transaction.create({
      data: {
        accountId: req.body.accountId,
        amount: dollarsToCents(parseFloat(req.body.amount)),
        date: new Date(req.body.date),
        name: req.body.name,
        merchantName: req.body.merchantName,
        category,
        subcategory,
        notes: req.body.notes,
      },
    });

    res.status(201).json({ ...tx, amount: centsToDollars(tx.amount) });
  } catch (err) {
    next(err);
  }
});

const patchValidation = [
  param('id').isUUID().withMessage('Valid transaction ID required'),
  body('category').optional().trim().isLength({ max: 100 }),
  body('subcategory').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

router.patch('/:id', validate(patchValidation), async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const txId = req.params.id;

    const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } });
    const accountIds = accounts.map((a) => a.id);

    const existing = await prisma.transaction.findFirst({
      where: { id: txId, accountId: { in: accountIds } },
    });
    if (!existing) throw new AppError(404, 'Transaction not found', 'NOT_FOUND');

    const { category, subcategory, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (category !== undefined) updates.category = category;
    if (subcategory !== undefined) updates.subcategory = subcategory;
    if (notes !== undefined) updates.notes = notes;

    const tx = await prisma.transaction.update({
      where: { id: txId },
      data: updates,
    });

    if (category !== undefined && category !== existing.category) {
      await recordFeedback({
        userId,
        transactionId: txId,
        merchantName: (existing.merchantName || existing.name || 'Unknown').trim(),
        amount: centsToDollars(existing.amount),
        description: existing.notes ?? undefined,
        originalCategory: existing.category,
        userCategory: category,
        userSubcategory: subcategory ?? null,
      }).catch(() => {});
    }

    res.json({ ...tx, amount: centsToDollars(tx.amount) });
  } catch (err) {
    next(err);
  }
});

export default router;
