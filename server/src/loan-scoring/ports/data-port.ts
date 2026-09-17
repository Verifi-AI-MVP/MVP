import type { FraudFlag } from '../domain/types.js';

export interface FinancialData {
  totalBalance: number;
  transactionCount90d: number;
  totalSpend90d: number;
  totalCredits90d: number;
  monthlyCredits: number[];
  monthlyDebits: number[];
  overdraftCount: number;
  negativeBalanceDays: number;
  budgetCount: number;
  budgetAdherencePct: number;
  fraudFlags: FraudFlag[];
}

export interface IFinancialDataPort {
  getFinancialData(userId: string): Promise<FinancialData>;
}
