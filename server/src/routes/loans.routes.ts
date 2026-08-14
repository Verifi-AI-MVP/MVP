import { body } from 'express-validator';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { centsToDollars, dollarsToCents } from '../lib/money.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { scoreLoanEligibility } from '../loan-scoring/index.js';
import { logAudit } from '../services/audit.service.js';
import { createOnChainLoan } from '../blockchain/blockchain.service.js';

const router = Router();
router.use(authenticate);

const applyValidation = [
  body('amount').isFloat({ min: 100, max: 50000 }).withMessage('Loan amount should be between $100 and $50,000'),
  body('termMonths').isInt({ min: 1, max: 60 }).withMessage('Please choose a term between 1 and 60 months'),
];

function toNum(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function serializeLoan(loan: {
  id: string
  amount: unknown
  interestRatePct: unknown
  termMonths: number
  monthlyPayment: unknown
  status: string
  appliedAt: Date
  chainId?: number | null
  contractAddress?: string | null
  onChainLoanId?: string | null
  createTxHash?: string | null
  statusTxHash?: string | null
}) {
  return {
    id: loan.id,
    amount: centsToDollars(toNum(loan.amount)),
    interestRatePct: toNum(loan.interestRatePct),
    termMonths: loan.termMonths,
    monthlyPayment: centsToDollars(toNum(loan.monthlyPayment)),
    status: loan.status,
    appliedAt: loan.appliedAt,
    chainId: loan.chainId ?? null,
    contractAddress: loan.contractAddress ?? null,
    onChainLoanId: loan.onChainLoanId ?? null,
    createTxHash: loan.createTxHash ?? null,
    statusTxHash: loan.statusTxHash ?? null,
  };
}

function calculateMonthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  if (annualRatePct === 0) return principal / termMonths;
  const monthlyRate = annualRatePct / 100 / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}

router.get('/eligibility', async (req, res, next) => {
  try {
    const result = await scoreLoanEligibility(req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/eligibility', async (req, res, next) => {
  try {
    const result = await scoreLoanEligibility(req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/apply', validate(applyValidation), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { walletAddress: true, kycStatus: true },
    });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    if (user.kycStatus !== 'verified') {
      throw new AppError(
        403,
        'Complete identity verification before applying for a loan.',
        'KYC_REQUIRED'
      );
    }

    const { amount, termMonths } = req.body;
    const principal = parseFloat(amount);
    const term = parseInt(termMonths, 10);

    const eligibility = await scoreLoanEligibility(req.user!.userId, { persistResult: false });
    if (eligibility.decision !== 'approve') {
      throw new AppError(403, 'You are not eligible for a loan right now.', 'NOT_ELIGIBLE');
    }
    const limit = eligibility.recommendedLimit ?? 0;
    if (principal > limit) {
      throw new AppError(
        400,
        `Loan amount cannot exceed your recommended limit of $${limit.toLocaleString()}.`,
        'OVER_LIMIT'
      );
    }

    const ratePct = 12.99;
    const monthlyPayment = calculateMonthlyPayment(principal, ratePct, term);

    const loan = await prisma.loan.create({
      data: {
        userId: req.user!.userId,
        amount: dollarsToCents(principal),
        interestRatePct: ratePct,
        termMonths: term,
        monthlyPayment: dollarsToCents(monthlyPayment),
        status: 'pending',
      },
    });

    let onChain: Awaited<ReturnType<typeof createOnChainLoan>> = null;
    if (user.walletAddress) {
      try {
        onChain = await createOnChainLoan({
          loanId: loan.id,
          borrowerAddress: user.walletAddress,
          amount: principal,
          interestRatePct: loan.interestRatePct,
          termMonths: loan.termMonths,
          monthlyPayment,
        });
        if (onChain) {
          await prisma.loan.update({
            where: { id: loan.id },
            data: {
              chainId: onChain.chainId,
              contractAddress: onChain.contractAddress,
              onChainLoanId: onChain.onChainId,
              createTxHash: onChain.txHash,
            },
          });
        }
      } catch (chainErr) {
        console.error('chain create failed, loan still in db:', chainErr);
      }
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'loan_apply',
      resourceType: 'loan',
      resourceId: loan.id,
      details: {
        amount: principal,
        termMonths: term,
        onChain: onChain
          ? { txHash: onChain.txHash, onChainLoanId: onChain.onChainId, mode: onChain.mode }
          : null,
      },
      ipAddress: req.ip,
    });

    const refreshed = await prisma.loan.findUnique({ where: { id: loan.id } });

    res.status(201).json({
      ...serializeLoan(refreshed!),
      message: onChain
        ? "We've got your application (and a copy on-chain). We'll get back to you soon."
        : "We've got your application. We'll review it and get back to you soon.",
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.user!.userId },
      orderBy: { appliedAt: 'desc' },
    });
    res.json(loans.map(serializeLoan));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const loan = await prisma.loan.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!loan) {
      const { AppError } = await import('../middleware/error.middleware.js');
      throw new AppError(404, "We couldn't find that loan.", 'NOT_FOUND');
    }
    res.json(serializeLoan(loan));
  } catch (err) {
    next(err);
  }
});

export default router;
