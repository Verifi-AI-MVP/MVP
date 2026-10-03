export type LoanDecision = 'approve' | 'reject';

export interface EligibilityInput {
  monthlyIncomeEstimate: number;
  spendingBehavior: SpendingBehavior;
  cashflowStability: CashflowStability;
  fraudFlags: FraudFlag[];
}

export interface SpendingBehavior {
  avgMonthlySpend: number;
  discretionarySpendPct: number;
  savingsRatePct: number;
  overdraftCount?: number;
  budgetAdherencePct?: number;
}

export interface CashflowStability {
  incomeVariancePct: number;
  consecutivePositiveMonths: number;
  negativeBalanceDays?: number;
  transactionVolume90d: number;
}

export interface FraudFlag {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

export interface EligibilityResult {
  riskScore: number;
  decision: LoanDecision;
  reasonCodes: ReasonCode[];
  factors: ScoreFactors;
  recommendedLimit?: number;
  modelVersion: string;
  timestamp: string;
}

export interface ReasonCode {
  code: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScoreFactors {
  incomeScore: number;
  spendingScore: number;
  cashflowScore: number;
  fraudPenalty: number;
  weights: { income: number; spending: number; cashflow: number };
}
