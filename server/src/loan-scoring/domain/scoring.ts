import type {
  EligibilityInput,
  EligibilityResult,
  ReasonCode,
  ScoreFactors,
} from './types.js';
import { REASON_CODES } from './reason-codes.js';

const MODEL_VERSION = '1.0.0';
const APPROVE_THRESHOLD = 60;
const MIN_INCOME = 1500;
const MAX_DTI_PCT = 45;

export function calculateEligibility(input: EligibilityInput): EligibilityResult {
  const reasonCodes: ReasonCode[] = [];
  const fraudPenalty = computeFraudPenalty(input.fraudFlags, reasonCodes);
  if (fraudPenalty >= 100) {
    return buildResult(100, 'reject', { incomeScore: 0, spendingScore: 0, cashflowScore: 0, fraudPenalty, weights: getWeights() }, reasonCodes);
  }
  const incomeScore = computeIncomeScore(input.monthlyIncomeEstimate, reasonCodes);
  const spendingScore = computeSpendingScore(input.spendingBehavior, input.monthlyIncomeEstimate, reasonCodes);
  const cashflowScore = computeCashflowScore(input.cashflowStability, reasonCodes);

  const weights = getWeights();
  const rawScore =
    (100 - incomeScore) * weights.income +
    (100 - spendingScore) * weights.spending +
    (100 - cashflowScore) * weights.cashflow +
    fraudPenalty;

  const riskScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const decision = riskScore <= APPROVE_THRESHOLD ? 'approve' : 'reject';

  if (reasonCodes.length === 0) {
    reasonCodes.push({ ...REASON_CODES.DEFAULT, description: REASON_CODES.DEFAULT.description });
  }

  const factors: ScoreFactors = {
    incomeScore,
    spendingScore,
    cashflowScore,
    fraudPenalty,
    weights,
  };

  const recommendedLimit = decision === 'approve'
    ? computeRecommendedLimit(riskScore, input.monthlyIncomeEstimate)
    : undefined;

  return buildResult(riskScore, decision, factors, reasonCodes, recommendedLimit);
}

function getWeights() {
  const income = 0.3;
  const spending = 0.35;
  const cashflow = 0.25;
  const total = income + spending + cashflow;
  return {
    income: income / total,
    spending: spending / total,
    cashflow: cashflow / total,
  };
}

function computeFraudPenalty(
  flags: EligibilityInput['fraudFlags'],
  reasonCodes: ReasonCode[]
): number {
  if (flags.length === 0) {
    reasonCodes.push({ ...REASON_CODES.NO_FRAUD_FLAGS, description: REASON_CODES.NO_FRAUD_FLAGS.description });
    return 0;
  }

  let penalty = 0;
  for (const f of flags) {
    switch (f.severity) {
      case 'critical':
        reasonCodes.push({ ...REASON_CODES.FRAUD_FLAG_CRITICAL, description: f.description || REASON_CODES.FRAUD_FLAG_CRITICAL.description });
        return 100;
      case 'high':
        penalty += 40;
        reasonCodes.push({ ...REASON_CODES.FRAUD_FLAG_HIGH, description: f.description || REASON_CODES.FRAUD_FLAG_HIGH.description });
        break;
      case 'medium':
        penalty += 25;
        reasonCodes.push({ ...REASON_CODES.FRAUD_FLAG_MEDIUM, description: f.description || REASON_CODES.FRAUD_FLAG_MEDIUM.description });
        break;
      case 'low':
        penalty += 10;
        reasonCodes.push({ ...REASON_CODES.FRAUD_FLAG_LOW, description: f.description || REASON_CODES.FRAUD_FLAG_LOW.description });
        break;
      default:
        penalty += 15;
    }
  }
  return Math.min(99, penalty);
}

function computeIncomeScore(monthlyIncome: number, reasonCodes: ReasonCode[]): number {
  if (monthlyIncome >= MIN_INCOME) {
    reasonCodes.push({ ...REASON_CODES.INCOME_SUFFICIENT, description: REASON_CODES.INCOME_SUFFICIENT.description });
    return Math.min(100, 50 + (monthlyIncome - MIN_INCOME) / 100);
  }
  reasonCodes.push({ ...REASON_CODES.INCOME_INSUFFICIENT, description: REASON_CODES.INCOME_INSUFFICIENT.description });
  return Math.max(0, (monthlyIncome / MIN_INCOME) * 50);
}

function computeSpendingScore(
  spending: EligibilityInput['spendingBehavior'],
  income: number,
  reasonCodes: ReasonCode[]
): number {
  let score = 70;

  const spendRate = income > 0 ? (spending.avgMonthlySpend / income) * 100 : 100;
  if (spendRate <= MAX_DTI_PCT) {
    reasonCodes.push({ ...REASON_CODES.LOW_DTI, description: REASON_CODES.LOW_DTI.description });
  } else {
    reasonCodes.push({ ...REASON_CODES.HIGH_DTI, description: REASON_CODES.HIGH_DTI.description });
    score -= 30;
  }

  if (spending.savingsRatePct >= 5) {
    reasonCodes.push({ ...REASON_CODES.POSITIVE_SAVINGS, description: REASON_CODES.POSITIVE_SAVINGS.description });
    score = Math.min(100, score + 15);
  }

  if ((spending.budgetAdherencePct ?? 0) >= 70) {
    reasonCodes.push({ ...REASON_CODES.BUDGET_DISCIPLINE, description: REASON_CODES.BUDGET_DISCIPLINE.description });
    score = Math.min(100, score + 10);
  }

  const overdraftCount = spending.overdraftCount ?? 0;
  if (overdraftCount > 0) {
    reasonCodes.push({ ...REASON_CODES.OVERDRAFT_HISTORY, description: REASON_CODES.OVERDRAFT_HISTORY.description });
    score -= 20 * Math.min(3, overdraftCount);
  }

  if (spendRate > 100) {
    reasonCodes.push({ ...REASON_CODES.HIGH_SPEND_RATE, description: REASON_CODES.HIGH_SPEND_RATE.description });
    score -= 25;
  }

  return Math.max(0, Math.min(100, score));
}

function computeCashflowScore(
  stability: EligibilityInput['cashflowStability'],
  reasonCodes: ReasonCode[]
): number {
  let score = 60;

  if (stability.transactionVolume90d < 10) {
    reasonCodes.push({ ...REASON_CODES.LIMITED_HISTORY, description: REASON_CODES.LIMITED_HISTORY.description });
    score -= 30;
  } else if (stability.consecutivePositiveMonths >= 2) {
    reasonCodes.push({ ...REASON_CODES.STABLE_CASHFLOW, description: REASON_CODES.STABLE_CASHFLOW.description });
    score += 25;
  } else if (stability.incomeVariancePct > 30) {
    reasonCodes.push({ ...REASON_CODES.UNSTABLE_CASHFLOW, description: REASON_CODES.UNSTABLE_CASHFLOW.description });
    score -= 20;
  }

  const negativeBalanceDays = stability.negativeBalanceDays ?? 0;
  if (negativeBalanceDays > 0) {
    reasonCodes.push({ ...REASON_CODES.NEGATIVE_BALANCE, description: REASON_CODES.NEGATIVE_BALANCE.description });
    score -= 15 * Math.min(5, negativeBalanceDays);
  }

  return Math.max(0, Math.min(100, score));
}

function computeRecommendedLimit(riskScore: number, monthlyIncome: number): number {
  const maxByIncome = monthlyIncome * 0.25;
  const maxByRisk = 5000 - (riskScore / 100) * 3000;
  return Math.round(Math.min(5000, Math.max(500, Math.min(maxByIncome, maxByRisk))));
}

function buildResult(
  riskScore: number,
  decision: EligibilityResult['decision'],
  factors: ScoreFactors,
  reasonCodes: ReasonCode[],
  recommendedLimit?: number
): EligibilityResult {
  return {
    riskScore,
    decision,
    reasonCodes,
    factors,
    recommendedLimit,
    modelVersion: MODEL_VERSION,
    timestamp: new Date().toISOString(),
  };
}
