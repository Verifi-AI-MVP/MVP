import { Router } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { centsToDollars, dollarsToCents } from '../lib/money.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AppError } from '../middleware/error.middleware.js';

const router = Router();
router.use(authenticate);

const createValidation = [
  body('name').trim().notEmpty().withMessage('Name required').isLength({ max: 255 }),
  body('category').trim().notEmpty().withMessage('Category required').isLength({ max: 100 }),
  body('amount').isFloat({ min: 0 }).withMessage('Valid positive amount required'),
  body('period').optional().isIn(['weekly', 'biweekly', 'monthly', 'yearly']),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').optional().isISO8601(),
];

const updateValidation = [
  param('id').isUUID().withMessage('Valid budget ID required'),
  body('name').optional().trim().isLength({ max: 255 }),
  body('amount').optional().isFloat({ min: 0 }),
  body('endDate').optional({ values: 'falsy' }).isISO8601(),
];

router.get('/', async (req, res, next) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.user!.userId },
      orderBy: { startDate: 'desc' },
    });
    res.json(budgets.map((budget) => ({ ...budget, amount: centsToDollars(budget.amount) })));
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createValidation), async (req, res, next) => {
  try {
    const budget = await prisma.budget.create({
      data: {
        userId: req.user!.userId,
        name: req.body.name,
        category: req.body.category,
        amount: dollarsToCents(Number(req.body.amount)),
        period: req.body.period ?? 'monthly',
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      },
    });
    res.status(201).json({ ...budget, amount: centsToDollars(budget.amount) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validate([param('id').isUUID()]), async (req, res, next) => {
  try {
    const budget = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!budget) throw new AppError(404, 'Budget not found', 'NOT_FOUND');
    res.json({ ...budget, amount: centsToDollars(budget.amount) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateValidation), async (req, res, next) => {
  try {
    const { name, amount, endDate } = req.body;
    const budget = await prisma.budget.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: {
        ...(name != null && { name }),
        ...(amount != null && { amount: dollarsToCents(Number(amount)) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });
    if (budget.count === 0) throw new AppError(404, 'Budget not found', 'NOT_FOUND');
    const updated = await prisma.budget.findUniqueOrThrow({ where: { id: req.params.id } });
    res.json({ ...updated, amount: centsToDollars(updated.amount) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', validate([param('id').isUUID()]), async (req, res, next) => {
  try {
    const result = await prisma.budget.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (result.count === 0) throw new AppError(404, 'Budget not found', 'NOT_FOUND');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
