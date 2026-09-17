import { Router } from 'express';
import { body, query } from 'express-validator';
import { categorize, CATEGORIES, type Category } from '../services/categorization.service.js';
import { recordFeedback, getTrainingData } from '../services/categorizationFeedback.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const categorizeValidation = [
  body('merchantName').trim().notEmpty().withMessage('merchantName required'),
  body('amount').isFloat().withMessage('Valid amount required'),
  body('description').optional().trim().isLength({ max: 500 }),
];

const feedbackValidation = [
  body('transactionId').optional().isUUID(),
  body('merchantName').trim().notEmpty().withMessage('merchantName required'),
  body('amount').isFloat().withMessage('Valid amount required'),
  body('description').optional().trim(),
  body('originalCategory').optional().trim(),
  body('userCategory').trim().notEmpty().withMessage('userCategory required'),
  body('userSubcategory').optional().trim(),
];

router.post('/', validate(categorizeValidation), (req, res) => {
  const { merchantName, amount, description } = req.body;
  const result = categorize({ merchantName, amount: parseFloat(amount), description });
  res.json(result);
});

router.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
});

router.post('/feedback', authenticate, validate(feedbackValidation), async (req, res, next) => {
  try {
    await recordFeedback({
      userId: req.user!.userId,
      transactionId: req.body.transactionId,
      merchantName: req.body.merchantName,
      amount: parseFloat(req.body.amount),
      description: req.body.description,
      originalCategory: req.body.originalCategory,
      userCategory: req.body.userCategory as Category,
      userSubcategory: req.body.userSubcategory,
    });
    res.status(201).json({ ok: true, message: 'Feedback recorded for ML training' });
  } catch (e) {
    next(e);
  }
});

router.get('/training-data', authenticate, validate([query('userId').optional().isUUID()]), async (req, res, next) => {
  try {
    const userId = req.user!.role === 'admin' ? req.query.userId as string : req.user!.userId;
    const data = await getTrainingData(userId);
    res.json({ count: data.length, records: data });
  } catch (e) {
    next(e);
  }
});

export default router;
