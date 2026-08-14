import { PrismaFinancialDataAdapter } from './adapters/prisma-data-adapter.js';
import { calculateEligibilityUseCase } from './usecases/calculate-eligibility.js';

const dataAdapter = new PrismaFinancialDataAdapter();

export async function scoreLoanEligibility(
  userId: string,
  options?: { persistResult?: boolean }
): Promise<ReturnType<typeof calculateEligibilityUseCase> extends Promise<infer R> ? R : never> {
  return calculateEligibilityUseCase(userId, {
    dataPort: dataAdapter,
    persistResult: options?.persistResult,
  });
}

export {
  type EligibilityResult,
  type EligibilityInput,
  type LoanDecision,
  type ReasonCode,
} from './domain/types.js';
export { REASON_CODES } from './domain/reason-codes.js';
export { calculateEligibility } from './domain/scoring.js';
