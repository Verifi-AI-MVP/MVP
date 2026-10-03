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
  body('targetAmount').isFloat({ min: 0.01 }).withMessage('Valid target amount required'),
  body('currentAmount').optional().isFloat({ min: 0 }),
  body('targetDate').optional({ values: 'falsy' }).isISO8601(),
];

const updateValidation = [
  param('id').isUUID().withMessage('Valid goal ID required'),
  body('name').optional().trim().isLength({ max: 255 }),
  body('targetAmount').optional().isFloat({ min: 0.01 }),
  body('currentAmount').optional().isFloat({ min: 0 }),
  body('targetDate').optional({ values: 'null' }).custom((v) => v === null || v === '' || !Number.isNaN(Date.parse(v))),
];

router.get('/', async (req, res, next) => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      goals.map((goal) => ({
        ...goal,
        targetAmount: centsToDollars(goal.targetAmount),
        currentAmount: centsToDollars(goal.currentAmount),
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createValidation), async (req, res, next) => {
  try {
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.user!.userId,
        name: req.body.name,
        targetAmount: dollarsToCents(Number(req.body.targetAmount)),
        currentAmount: dollarsToCents(Number(req.body.currentAmount ?? 0)),
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
      },
    });
    res.status(201).json({
      ...goal,
      targetAmount: centsToDollars(goal.targetAmount),
      currentAmount: centsToDollars(goal.currentAmount),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateValidation), async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount, targetDate } = req.body;
    const result = await prisma.savingsGoal.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: {
        ...(name != null && { name }),
        ...(targetAmount != null && { targetAmount: dollarsToCents(Number(targetAmount)) }),
        ...(currentAmount != null && { currentAmount: dollarsToCents(Number(currentAmount)) }),
        ...(targetDate !== undefined && {
          targetDate: targetDate ? new Date(targetDate) : null,
        }),
      },
    });
    if (result.count === 0) throw new AppError(404, 'Savings goal not found', 'NOT_FOUND');
    const updated = await prisma.savingsGoal.findUniqueOrThrow({ where: { id: req.params.id } });
    res.json({
      ...updated,
      targetAmount: centsToDollars(updated.targetAmount),
      currentAmount: centsToDollars(updated.currentAmount),
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', validate([param('id').isUUID()]), async (req, res, next) => {
  try {
    const result = await prisma.savingsGoal.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (result.count === 0) throw new AppError(404, 'Savings goal not found', 'NOT_FOUND');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
