import { Router } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { env } from '../config/env.js';
import { logAudit } from '../services/audit.service.js';

const router = Router();

const submitValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name required').isLength({ max: 200 }),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth required'),
  body('country').trim().notEmpty().withMessage('Country required').isLength({ max: 80 }),
  body('documentType')
    .isIn(['passport', 'drivers_license', 'national_id'])
    .withMessage('Document type must be passport, drivers_license, or national_id'),
  body('documentLast4').optional().trim().isLength({ min: 4, max: 4 }).withMessage('Use last 4 characters only'),
];

function serializeSubmission(s: {
  id: string;
  fullName: string;
  dateOfBirth: Date;
  country: string;
  documentType: string;
  documentLast4: string | null;
  status: string;
  reviewNotes: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}) {
  return {
    id: s.id,
    fullName: s.fullName,
    dateOfBirth: s.dateOfBirth.toISOString().slice(0, 10),
    country: s.country,
    documentType: s.documentType,
    documentLast4: s.documentLast4,
    status: s.status,
    reviewNotes: s.reviewNotes,
    submittedAt: s.submittedAt,
    reviewedAt: s.reviewedAt,
  };
}

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { kycStatus: true },
    });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    const latest = await prisma.kycSubmission.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      status: user.kycStatus,
      autoApprove: env.kyc.autoApprove,
      submission: latest ? serializeSubmission(latest) : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/submit', authenticate, validate(submitValidation), async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const dob = new Date(req.body.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw new AppError(400, 'Invalid date of birth', 'VALIDATION_ERROR');
    }

    const ageMs = Date.now() - dob.getTime();
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 18) {
      throw new AppError(400, 'You must be at least 18 to verify', 'KYC_AGE');
    }

    const status = env.kyc.autoApprove ? 'verified' : 'pending';
    const reviewedAt = env.kyc.autoApprove ? new Date() : null;

    const submission = await prisma.kycSubmission.create({
      data: {
        userId,
        fullName: req.body.fullName,
        dateOfBirth: dob,
        country: req.body.country,
        documentType: req.body.documentType,
        documentLast4: req.body.documentLast4 ?? null,
        status,
        reviewedAt,
        reviewNotes: env.kyc.autoApprove ? 'Auto-approved in demo mode' : null,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: status },
    });

    await logAudit({
      userId,
      action: env.kyc.autoApprove ? 'kyc.auto_verified' : 'kyc.submitted',
      resourceType: 'kyc',
      resourceId: submission.id,
    });

    res.status(201).json({
      status,
      submission: serializeSubmission(submission),
      message: env.kyc.autoApprove
        ? 'Identity verified (demo auto-approve).'
        : 'Submitted for review. An admin will verify your identity.',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/admin', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const rows = await prisma.kycSubmission.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, walletAddress: true, email: true, kycStatus: true } },
      },
    });
    res.json(
      rows.map((r) => ({
        ...serializeSubmission(r),
        user: r.user,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post(
  '/admin/:id/review',
  authenticate,
  requireAdmin,
  validate([
    param('id').isUUID(),
    body('action').isIn(['approve', 'reject']).withMessage('action must be approve or reject'),
    body('notes').optional().trim().isLength({ max: 500 }),
  ]),
  async (req, res, next) => {
    try {
      const submission = await prisma.kycSubmission.findUnique({ where: { id: req.params.id } });
      if (!submission) throw new AppError(404, 'KYC submission not found', 'NOT_FOUND');

      const status = req.body.action === 'approve' ? 'verified' : 'rejected';
      const updated = await prisma.kycSubmission.update({
        where: { id: submission.id },
        data: {
          status,
          reviewedAt: new Date(),
          reviewNotes: req.body.notes ?? null,
        },
      });

      await prisma.user.update({
        where: { id: submission.userId },
        data: { kycStatus: status },
      });

      await logAudit({
        userId: req.user!.userId,
        action: `kyc.${req.body.action}`,
        resourceType: 'kyc',
        resourceId: submission.id,
        details: { subjectUserId: submission.userId, notes: req.body.notes ?? null },
      });

      res.json({ status, submission: serializeSubmission(updated) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
