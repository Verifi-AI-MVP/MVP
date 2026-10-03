import { prisma } from './prisma.js';

/** Database money fields are integer cents. APIs and the scoring model speak dollars. */

/** Above this, a cent amount is an extra ×100 from a dropped conversion marker. */
const SANE_MAX_CENTS = 10_000_000;

const MONEY_COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'Account', column: 'current_balance' },
  { table: 'Transaction', column: 'amount' },
  { table: 'Budget', column: 'amount' },
  { table: 'savings_goals', column: 'target_amount' },
  { table: 'savings_goals', column: 'current_amount' },
  { table: 'CategorizationFeedback', column: 'amount' },
  { table: 'LoanEligibilityResult', column: 'recommended_limit' },
  { table: 'Loan', column: 'amount' },
  { table: 'Loan', column: 'monthly_payment' },
];

export function dollarsToCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Invalid money amount');
  }
  return Math.round(value * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Undo repeated ×100 conversions that pushed cent values past a sensible size.
 * Runs in SQLite through Prisma so startup does not need Node's built-in sqlite module.
 */
async function repairInflatedCents(): Promise<void> {
  for (const { table, column } of MONEY_COLUMNS) {
    const sql = `UPDATE "${table}" SET "${column}" = "${column}" / 100 WHERE "${column}" IS NOT NULL AND ABS("${column}") >= ${SANE_MAX_CENTS} AND "${column}" % 100 = 0`;
    for (;;) {
      const changed = await prisma.$executeRawUnsafe(sql);
      if (!changed) break;
    }
  }
}

/**
 * Legacy databases stored dollars. Whole-number cent values are left alone,
 * so a missing marker cannot multiply them again on the next start.
 */
export async function ensureMoneyStoredAsCents(): Promise<void> {
  await repairInflatedCents();

  const marker = await prisma.appMeta.findUnique({ where: { key: 'money_unit' } });
  if (marker?.value === 'cents') return;

  const updates = [
    'UPDATE "Account" SET "current_balance" = ROUND("current_balance" * 100) WHERE "current_balance" != ROUND("current_balance")',
    'UPDATE "Transaction" SET "amount" = ROUND("amount" * 100) WHERE "amount" != ROUND("amount")',
    'UPDATE "Budget" SET "amount" = ROUND("amount" * 100) WHERE "amount" != ROUND("amount")',
    'UPDATE "savings_goals" SET "target_amount" = ROUND("target_amount" * 100) WHERE "target_amount" != ROUND("target_amount")',
    'UPDATE "savings_goals" SET "current_amount" = ROUND("current_amount" * 100) WHERE "current_amount" != ROUND("current_amount")',
    'UPDATE "CategorizationFeedback" SET "amount" = ROUND("amount" * 100) WHERE "amount" != ROUND("amount")',
    'UPDATE "LoanEligibilityResult" SET "recommended_limit" = ROUND("recommended_limit" * 100) WHERE "recommended_limit" IS NOT NULL AND "recommended_limit" != ROUND("recommended_limit")',
    'UPDATE "Loan" SET "amount" = ROUND("amount" * 100) WHERE "amount" != ROUND("amount")',
    'UPDATE "Loan" SET "monthly_payment" = ROUND("monthly_payment" * 100) WHERE "monthly_payment" != ROUND("monthly_payment")',
  ];
  for (const sql of updates) {
    await prisma.$executeRawUnsafe(sql);
  }
  await prisma.appMeta.upsert({
    where: { key: 'money_unit' },
    create: { key: 'money_unit', value: 'cents' },
    update: { value: 'cents' },
  });
}
