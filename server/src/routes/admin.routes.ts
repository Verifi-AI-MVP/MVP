import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { centsToDollars } from '../lib/money.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { updateOnChainLoanStatus } from '../blockchain/blockchain.service.js';
import { logAudit } from '../services/audit.service.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, walletAddress: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/loans', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status: String(status) } : {};
    const loans = await prisma.loan.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        user: { select: { id: true, walletAddress: true, email: true, firstName: true, lastName: true } },
      },
    });
    res.json(
      loans.map((loan) => ({
        ...loan,
        amount: centsToDollars(loan.amount),
        monthlyPayment: centsToDollars(loan.monthlyPayment),
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/risk-scores', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 500);
    const results = await prisma.loanEligibilityResult.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const withUser = await Promise.all(
      results.map(async (r) => {
        const user = await prisma.user.findUnique({
          where: { id: r.userId },
          select: { walletAddress: true, email: true, firstName: true, lastName: true },
        });
        return {
          ...r,
          user,
          recommendedLimit: r.recommendedLimit == null ? null : centsToDollars(r.recommendedLimit),
          reasonCodes: parseJson(r.reasonCodes),
          factors: parseJson(r.factors),
        };
      })
    );
    res.json(withUser);
  } catch (err) {
    next(err);
  }
});

router.get('/fraud-alerts', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || 50), 10) || 50, 200);
    const signals = await prisma.fraudSignal.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const withUser = await Promise.all(
      signals.map(async (s) => {
        const user = await prisma.user.findUnique({
          where: { id: s.userId },
          select: { walletAddress: true, email: true },
        });
        return { ...s, user };
      })
    );
    res.json(withUser);
  } catch (err) {
    next(err);
  }
});

function parseJson<T = unknown>(s: string | null | undefined): T | null {
  if (!s || typeof s !== 'string') return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

const statusActionMap = {
  approve: { from: ['pending'], status: 'approved', chainAction: 'approve' as const, setApprovedAt: true },
  reject: { from: ['pending'], status: 'rejected', chainAction: 'reject' as const, setApprovedAt: false },
  disburse: { from: ['approved'], status: 'disbursed', chainAction: 'disburse' as const, setApprovedAt: false },
  repay: { from: ['disbursed'], status: 'repaid', chainAction: 'repay' as const, setApprovedAt: false },
  default: { from: ['approved', 'disbursed'], status: 'defaulted', chainAction: 'default' as const, setApprovedAt: false },
};

router.post(
  '/loans/:id/status',
  validate([
    param('id').isUUID(),
    body('action').isIn(['approve', 'reject', 'disburse', 'repay', 'default']),
  ]),
  async (req, res, next) => {
    try {
      const action = req.body.action as keyof typeof statusActionMap;
      const mapping = statusActionMap[action];
      const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
      if (!loan) throw new AppError(404, 'Loan not found', 'NOT_FOUND');
      if (!mapping.from.includes(loan.status)) {
        throw new AppError(
          409,
          `A ${loan.status} loan cannot be marked ${mapping.status}.`,
          'INVALID_STATUS'
        );
      }

      const snapshot = {
        status: loan.status,
        approvedAt: loan.approvedAt,
        disbursedAt: loan.disbursedAt,
        statusTxHash: loan.statusTxHash,
      };

      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: mapping.status,
          ...(mapping.setApprovedAt ? { approvedAt: new Date() } : {}),
          ...(action === 'disburse' ? { disbursedAt: new Date() } : {}),
        },
      });

      let statusTxHash: string | undefined;
      if (loan.onChainLoanId) {
        try {
          const chainResult = await updateOnChainLoanStatus(loan.onChainLoanId, mapping.chainAction);
          if (chainResult) statusTxHash = chainResult.txHash;
        } catch (err) {
          console.error('chain status update failed:', err);
          await prisma.loan.update({ where: { id: loan.id }, data: snapshot });
          throw new AppError(502, "Couldn't update the loan on-chain", 'CHAIN_ERROR');
        }
      }

      const updated = statusTxHash
        ? await prisma.loan.update({
            where: { id: loan.id },
            data: { statusTxHash },
          })
        : await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });

      await logAudit({
        userId: req.user!.userId,
        action: `loan_${action}`,
        resourceType: 'loan',
        resourceId: loan.id,
        details: { status: mapping.status, statusTxHash: statusTxHash ?? null },
        ipAddress: req.ip,
      });

      res.json({
        ...updated,
        amount: centsToDollars(updated.amount),
        monthlyPayment: centsToDollars(updated.monthlyPayment),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/audit-logs', validate([query('limit').optional().isInt({ min: 1, max: 500 }).toInt()]), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 500);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const withUser = await Promise.all(
      logs.map(async (l) => {
        const user = l.userId
          ? await prisma.user.findUnique({ where: { id: l.userId }, select: { email: true, walletAddress: true } })
          : null;
        return { ...l, userEmail: user?.email ?? user?.walletAddress, details: parseJson(l.details) };
      })
    );
    res.json(withUser);
  } catch (err) {
    next(err);
  }
});

export default router;
