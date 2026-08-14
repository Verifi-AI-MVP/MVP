import { prisma } from '../../lib/prisma.js';
import { centsToDollars } from '../../lib/money.js';
import type { IFinancialDataPort, FinancialData } from '../ports/data-port.js';
import type { FraudFlag } from '../domain/types.js';

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function cashflowSignals(
  transactions: { amountCents: number; date: Date }[],
  currentBalanceCents: number,
  now = new Date()
): { overdraftCount: number; negativeBalanceDays: number } {
  const start = new Date(now);
  start.setDate(start.getDate() - 90);
  start.setHours(0, 0, 0, 0);

  const inWindow = transactions.filter((tx) => tx.date >= start);
  const sumInWindow = inWindow.reduce((sum, tx) => sum + tx.amountCents, 0);
  let balance = currentBalanceCents - sumInWindow;

  const byDay = new Map<string, number[]>();
  const ordered = [...inWindow].sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const tx of ordered) {
    const key = dayKey(tx.date);
    const list = byDay.get(key) ?? [];
    list.push(tx.amountCents);
    byDay.set(key, list);
  }

  let overdraftCount = 0;
  let negativeBalanceDays = 0;
  const cursor = new Date(start);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const dayAmounts = byDay.get(dayKey(cursor)) ?? [];
    let negativeToday = balance < 0;
    for (const amount of dayAmounts) {
      const previous = balance;
      balance += amount;
      if (previous >= 0 && balance < 0) overdraftCount += 1;
      if (balance < 0) negativeToday = true;
    }
    if (negativeToday) negativeBalanceDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return { overdraftCount, negativeBalanceDays };
}

export class PrismaFinancialDataAdapter implements IFinancialDataPort {
  async getFinancialData(userId: string): Promise<FinancialData> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [accounts, transactions, budgets, fraudSignals] = await Promise.all([
      prisma.account.findMany({
        where: { userId, isActive: true },
        select: { id: true, currentBalance: true },
      }),
      prisma.transaction.findMany({
        where: { account: { userId } },
        select: { amount: true, date: true, category: true },
        orderBy: { date: 'asc' },
      }),
      prisma.budget.findMany({
        where: {
          userId,
          startDate: { lte: new Date() },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        select: { category: true, amount: true },
      }),
      prisma.fraudSignal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalBalanceCents = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
    const { overdraftCount, negativeBalanceDays } = cashflowSignals(
      transactions.map((tx) => ({ amountCents: tx.amount, date: tx.date })),
      totalBalanceCents
    );

    const tx90 = transactions.filter((tx) => tx.date >= ninetyDaysAgo);
    const transactionCount90d = tx90.length;
    const totalSpend90d = centsToDollars(
      tx90.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    );
    const totalCredits90d = centsToDollars(
      tx90.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
    );

    const monthlyCredits: number[] = [];
    const monthlyDebits: number[] = [];
    for (let i = 2; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const monthTx = tx90.filter((tx) => tx.date >= start && tx.date < end);
      monthlyCredits.push(
        centsToDollars(monthTx.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0))
      );
      monthlyDebits.push(
        centsToDollars(
          monthTx.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        )
      );
    }

    let budgetAdherencePct = 0;
    if (budgets.length > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthSpend = tx90.filter((tx) => tx.date >= startOfMonth && tx.amount < 0);
      let underBudget = 0;
      for (const budget of budgets) {
        const category = budget.category.toLowerCase();
        const spent = monthSpend
          .filter((tx) => (tx.category || '').toLowerCase() === category)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        if (spent <= budget.amount) underBudget += 1;
      }
      budgetAdherencePct = Math.round((underBudget / budgets.length) * 100);
    }

    const fraudFlags: FraudFlag[] = fraudSignals.map((flag) => ({
      code: flag.signalType,
      severity: flag.severity as FraudFlag['severity'],
      description: flag.description ?? undefined,
    }));

    return {
      totalBalance: centsToDollars(totalBalanceCents),
      transactionCount90d,
      totalSpend90d,
      totalCredits90d,
      monthlyCredits,
      monthlyDebits,
      overdraftCount,
      negativeBalanceDays,
      budgetCount: budgets.length,
      budgetAdherencePct,
      fraudFlags,
    };
  }
}
