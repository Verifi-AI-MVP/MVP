export const REASON_CODES = {
  INCOME_SUFFICIENT: { code: 'I001', description: 'Monthly income meets minimum threshold', impact: 'positive' as const },
  LOW_DTI: { code: 'I002', description: 'Debt-to-income ratio within acceptable range', impact: 'positive' as const },
  STABLE_CASHFLOW: { code: 'C001', description: 'Consistent positive cashflow over observation period', impact: 'positive' as const },
  POSITIVE_SAVINGS: { code: 'S001', description: 'Demonstrates savings behavior', impact: 'positive' as const },
  BUDGET_DISCIPLINE: { code: 'S002', description: 'Budget adherence observed', impact: 'positive' as const },
  NO_FRAUD_FLAGS: { code: 'F001', description: 'No fraud indicators present', impact: 'positive' as const },
  INCOME_INSUFFICIENT: { code: 'I101', description: 'Monthly income below minimum threshold', impact: 'negative' as const },
  HIGH_DTI: { code: 'I102', description: 'Debt-to-income ratio exceeds limit', impact: 'negative' as const },
  UNSTABLE_CASHFLOW: { code: 'C101', description: 'High variance in monthly cashflow', impact: 'negative' as const },
  HIGH_SPEND_RATE: { code: 'S101', description: 'Spending rate exceeds income', impact: 'negative' as const },
  OVERDRAFT_HISTORY: { code: 'S102', description: 'Overdraft activity detected', impact: 'negative' as const },
  NEGATIVE_BALANCE: { code: 'C102', description: 'Negative balance days in observation period', impact: 'negative' as const },
  FRAUD_FLAG_LOW: { code: 'F101', description: 'Low-severity fraud flag present', impact: 'negative' as const },
  FRAUD_FLAG_MEDIUM: { code: 'F102', description: 'Medium-severity fraud flag present', impact: 'negative' as const },
  FRAUD_FLAG_HIGH: { code: 'F103', description: 'High-severity fraud flag present', impact: 'negative' as const },
  FRAUD_FLAG_CRITICAL: { code: 'F104', description: 'Critical fraud flag - application declined', impact: 'negative' as const },
  LIMITED_HISTORY: { code: 'C103', description: 'Insufficient transaction history', impact: 'negative' as const },
  DEFAULT: { code: 'D000', description: 'Standard eligibility assessment', impact: 'neutral' as const },
} as const;

export type ReasonCodeKey = keyof typeof REASON_CODES;
