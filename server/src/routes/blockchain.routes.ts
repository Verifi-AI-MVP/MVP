import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { centsToDollars } from '../lib/money.js';
import { getBlockchainStatus } from '../blockchain/blockchain.service.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getBlockchainStatus());
});

router.use(authenticate);

router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const [loans, attestations, user] = await Promise.all([
      prisma.loan.findMany({
        where: { userId, createTxHash: { not: null } },
        orderBy: { appliedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          chainId: true,
          contractAddress: true,
          onChainLoanId: true,
          createTxHash: true,
          statusTxHash: true,
          appliedAt: true,
        },
      }),
      prisma.loanEligibilityResult.findMany({
        where: { userId, attestationTxHash: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          riskScore: true,
          decision: true,
          modelVersion: true,
          chainId: true,
          attestationContract: true,
          attestationId: true,
          attestationTxHash: true,
          createdAt: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      }),
    ]);

    res.json({
      ...getBlockchainStatus(),
      walletAddress: user?.walletAddress ?? null,
      onChainLoans: loans.map((loan) => ({ ...loan, amount: centsToDollars(loan.amount) })),
      trustAttestations: attestations,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
