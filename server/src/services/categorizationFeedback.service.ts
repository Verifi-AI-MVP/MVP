import { prisma } from '../lib/prisma.js';
import { centsToDollars, dollarsToCents } from '../lib/money.js';

export interface RecordFeedbackInput {
  userId: string;
  transactionId?: string;
  merchantName: string;
  amount: number;
  description?: string;
  originalCategory?: string | null;
  userCategory: string;
  userSubcategory?: string | null;
}

export async function recordFeedback(input: RecordFeedbackInput): Promise<void> {
  await prisma.categorizationFeedback.create({
    data: {
      userId: input.userId,
      transactionId: input.transactionId,
      merchantName: input.merchantName,
      amount: dollarsToCents(input.amount),
      description: input.description,
      originalCategory: input.originalCategory,
      userCategory: input.userCategory,
      userSubcategory: input.userSubcategory,
    },
  });
}

export async function getTrainingData(userId?: string): Promise<
  { merchantName: string; amount: string; description: string | null; label: string; sublabel: string | null }[]
> {
  const where = userId ? { userId } : {};
  const rows = await prisma.categorizationFeedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });
  return rows.map((r) => ({
    merchantName: r.merchantName,
    amount: String(centsToDollars(r.amount)),
    description: r.description,
    label: r.userCategory,
    sublabel: r.userSubcategory,
  }));
}
