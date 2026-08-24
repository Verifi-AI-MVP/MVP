import { prisma } from '../../lib/prisma.js';
import { dollarsToCents } from '../../lib/money.js';
import type { IFinancialDataPort } from '../ports/data-port.js';
import type { EligibilityInput, EligibilityResult } from '../domain/types.js';
import { calculateEligibility } from '../domain/scoring.js';
import { attestTrustScore } from '../../blockchain/blockchain.service.js';

export interface CalculateEligibilityOptions {
  dataPort: IFinancialDataPort;
  persistResult?: boolean;
}

export async function calculateEligibilityUseCase(
  userId: string,
  options: CalculateEligibilityOptions
): Promise<EligibilityResult & {
  attestation?: {
    txHash: string;
    attestationId: string;
    contractAddress: string;
    chainId: number;
    mode: string;
  } | null;
}> {
  const data = await options.dataPort.getFinancialData(userId);

  const monthlyIncomeEstimate = deriveMonthlyIncome(data);

  const avgMonthlySpend = data.totalSpend90d / 3;
  const avgMonthlyCredits = data.totalCredits90d / 3;
  const savingsRatePct =
    avgMonthlyCredits > 0
      ? Math.max(0, ((avgMonthlyCredits - avgMonthlySpend) / avgMonthlyCredits) * 100)
      : 0;
  const discretionarySpendPct =
    avgMonthlyCredits > 0 ? Math.min(100, (avgMonthlySpend / avgMonthlyCredits) * 100) : 100;

  const incomeVariancePct = computeVariancePct(data.monthlyCredits);
  const consecutivePositive = countConsecutivePositiveMonths(
    data.monthlyCredits,
    data.monthlyDebits
  );

  const input: EligibilityInput = {
    monthlyIncomeEstimate,
    spendingBehavior: {
      avgMonthlySpend,
      discretionarySpendPct,
      savingsRatePct,
      overdraftCount: data.overdraftCount,
      budgetAdherencePct: data.budgetCount > 0 ? data.budgetAdherencePct : undefined,
    },
    cashflowStability: {
      incomeVariancePct,
      consecutivePositiveMonths: consecutivePositive,
      negativeBalanceDays: data.negativeBalanceDays,
      transactionVolume90d: data.transactionCount90d,
    },
    fraudFlags: data.fraudFlags,
  };

  const result = calculateEligibility(input);
  let attestation: {
    txHash: string;
    attestationId: string;
    contractAddress: string;
    chainId: number;
    mode: string;
  } | null = null;

  if (options.persistResult !== false) {
    const record = await prisma.loanEligibilityResult.create({
      data: {
        userId,
        riskScore: result.riskScore,
        decision: result.decision,
        reasonCodes: JSON.stringify(result.reasonCodes),
        factors: JSON.stringify(result.factors),
        recommendedLimit:
          result.recommendedLimit != null ? dollarsToCents(result.recommendedLimit) : null,
        modelVersion: result.modelVersion,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });

    if (user?.walletAddress) {
      try {
        const chainResult = await attestTrustScore({
          subjectAddress: user.walletAddress,
          riskScore: result.riskScore,
          decision: result.decision,
          reasonCodes: result.reasonCodes,
          factors: result.factors,
          modelVersion: result.modelVersion,
        });
        if (chainResult) {
          await prisma.loanEligibilityResult.update({
            where: { id: record.id },
            data: {
              chainId: chainResult.chainId,
              attestationContract: chainResult.contractAddress,
              attestationId: chainResult.onChainId,
              attestationTxHash: chainResult.txHash,
            },
          });
          attestation = {
            txHash: chainResult.txHash,
            attestationId: chainResult.onChainId,
            contractAddress: chainResult.contractAddress,
            chainId: chainResult.chainId,
            mode: chainResult.mode,
          };
        }
      } catch (err) {
        console.error('attestation failed, score still saved:', err);
      }
    }
  }

  return { ...result, attestation };
}

function deriveMonthlyIncome(data: { totalCredits90d: number; monthlyCredits: number[] }): number {
  const avg = data.totalCredits90d / 3;
  const lastMonth = data.monthlyCredits[data.monthlyCredits.length - 1] ?? 0;
  return lastMonth > 0 ? lastMonth : avg;
}

function computeVariancePct(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return mean > 0 ? Math.min(100, (stdDev / mean) * 100) : 100;
}

function countConsecutivePositiveMonths(credits: number[], debits: number[]): number {
  let count = 0;
  for (let i = credits.length - 1; i >= 0; i--) {
    const net = (credits[i] ?? 0) - (debits[i] ?? 0);
    if (net >= 0) count++;
    else break;
  }
  return count;
}
