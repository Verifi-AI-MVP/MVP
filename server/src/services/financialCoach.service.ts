import OpenAI from 'openai';
import { prisma } from '../lib/prisma.js';
import { centsToDollars } from '../lib/money.js';
import { env } from '../config/env.js';

const DISCLAIMER =
  '\n\n---\n*This is educational information only, not financial advice. Consult a licensed advisor for decisions about your money.*';

const SYSTEM_PROMPT = `You are a helpful AI financial coach within the VeriFi AI app. Your role is to provide general guidance only.

## Rules (strict)
1. NEVER give specific investment recommendations, buy/sell advice, or tax advice.
2. NEVER guarantee outcomes or returns.
3. Base advice on the user's anonymized data (budgets, spending by category) when provided.
4. Be explainable: briefly state why you suggest something (e.g. "Because your spending on X is above your budget...").
5. Keep answers concise (2–4 short paragraphs). Use bullet points when listing steps.
6. If you lack context, ask the user to add accounts/budgets or clarify their situation.
7. Always stay supportive and non-judgmental.
8. Do NOT output the disclaimer yourself—it is appended automatically.
9. Use the available tools to fetch real data when users ask about their balance, budgets, spending, or transactions.`;

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_account_balance',
      description: 'Get total balance across all linked accounts',
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_budget_summary',
      description: 'Get budgets and how much has been spent vs limit for each category this month',
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_spending_by_category',
      description: 'Get spending totals by category. Optional: limit to a specific category or time range (e.g. last 7 days, this month).',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category name, e.g. "Groceries"' },
          days: { type: 'number', description: 'Last N days (default: 30)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_transactions',
      description: 'Get recent transactions. Use when user asks what they spent on, latest purchases, etc.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max number of transactions (default 10, max 20)' },
          category: { type: 'string', description: 'Filter by category' },
        },
      },
    },
  },
];

async function runTool(name: string, args: Record<string, unknown>, userId: string): Promise<string> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  switch (name) {
    case 'get_account_balance': {
      const agg = await prisma.account.aggregate({
        where: { userId, isActive: true },
        _sum: { currentBalance: true },
      });
      const total = centsToDollars(agg._sum.currentBalance ?? 0);
      return JSON.stringify({ totalBalance: total, currency: 'USD' });
    }
    case 'get_budget_summary': {
      const budgets = await prisma.budget.findMany({
        where: { userId, startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        select: { category: true, amount: true },
      });
      const txns = await prisma.transaction.findMany({
        where: { account: { userId }, date: { gte: startOfMonth }, amount: { lt: 0 } },
        select: { category: true, amount: true },
      });
      const spentByCat: Record<string, number> = {};
      for (const t of txns) {
        const cat = t.category || 'Uncategorized';
        spentByCat[cat] = (spentByCat[cat] || 0) + centsToDollars(Math.abs(t.amount));
      }
      const summary = budgets.map((b) => ({
        category: b.category,
        limit: centsToDollars(b.amount),
        spent: spentByCat[b.category] || 0,
        remaining: Math.max(0, centsToDollars(b.amount) - (spentByCat[b.category] || 0)),
      }));
      return JSON.stringify(summary);
    }
    case 'get_spending_by_category': {
      const days = Math.min(90, Math.max(1, Number(args.days) || 30));
      const since = new Date();
      since.setDate(since.getDate() - days);
      const catFilter = typeof args.category === 'string' ? args.category.trim() : null;
      const txns = await prisma.transaction.findMany({
        where: {
          account: { userId },
          date: { gte: since },
          amount: { lt: 0 },
          ...(catFilter && { category: { contains: catFilter } }),
        },
        select: { category: true, amount: true },
      });
      const byCat: Record<string, number> = {};
      for (const t of txns) {
        const cat = t.category || 'Uncategorized';
        byCat[cat] = (byCat[cat] || 0) + centsToDollars(Math.abs(t.amount));
      }
      const sorted = Object.entries(byCat)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);
      return JSON.stringify({ period: `last ${days} days`, byCategory: sorted });
    }
    case 'get_recent_transactions': {
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 10));
      const catFilter = typeof args.category === 'string' ? args.category.trim() : null;
      const txns = await prisma.transaction.findMany({
        where: {
          account: { userId },
          ...(catFilter && { category: { contains: catFilter } }),
        },
        orderBy: { date: 'desc' },
        take: limit,
        select: { date: true, name: true, merchantName: true, amount: true, category: true },
      });
      const list = txns.map((t) => ({
        date: t.date.toISOString().slice(0, 10),
        description: t.merchantName || t.name || 'Unknown',
        amount: centsToDollars(Math.abs(t.amount)),
        category: t.category,
      }));
      return JSON.stringify(list);
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function buildFinancialContext(
  budgets: { category: string; amount: unknown; spent: string }[],
  spendingByCategory: { category: string | null; total: string }[],
  totalSpent: string,
  accountBalance: string
): string {
  const lines: string[] = [];

  if (budgets.length > 0) {
    lines.push('User budgets (this month):');
    for (const b of budgets) {
      const spent = parseFloat(b.spent || '0');
      const limit = Number(b.amount) || 0;
      const pct = limit > 0 ? ((spent / limit) * 100).toFixed(0) : '—';
      lines.push(`- ${b.category}: $${limit.toFixed(2)} limit, spent $${spent.toFixed(2)} (${pct}%)`);
    }
  } else {
    lines.push('User has no budgets set.');
  }

  if (spendingByCategory.length > 0) {
    lines.push('\nSpending by category (last 90 days):');
    spendingByCategory.slice(0, 10).forEach((s) => {
      const cat = s.category || 'Uncategorized';
      const total = parseFloat(s.total || '0').toFixed(2);
      lines.push(`- ${cat}: $${total}`);
    });
  }

  lines.push(`\nTotal spent (this month): $${parseFloat(totalSpent || '0').toFixed(2)}`);
  lines.push(`Total account balance (approx): $${parseFloat(accountBalance || '0').toFixed(2)}`);

  return lines.join('\n');
}

export interface CoachResponse {
  message: string;
  disclaimer: string;
  sourcesUsed: string[];
}

async function buildLocalCoachReply(userId: string, userMessage: string): Promise<CoachResponse> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [budgets, accounts, monthlyTx] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
    }),
    prisma.account.findMany({ where: { userId, isActive: true } }),
    prisma.transaction.findMany({
      where: { account: { userId }, date: { gte: startOfMonth }, amount: { lt: 0 } },
      select: { category: true, amount: true },
    }),
  ]);

  const totalBalance = centsToDollars(accounts.reduce((s, a) => s + (a.currentBalance ?? 0), 0));
  const totalSpent = centsToDollars(monthlyTx.reduce((s, t) => s + Math.abs(t.amount), 0));
  const byCategory = Object.entries(
    monthlyTx.reduce<Record<string, number>>((acc, t) => {
      const cat = t.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + centsToDollars(Math.abs(t.amount));
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const q = userMessage.toLowerCase();
  const lines: string[] = [];

  if (/balance|how much.*(have|left)|net worth/i.test(q)) {
    lines.push(
      `Across your linked accounts, your approximate balance is **$${totalBalance.toFixed(2)}** (${accounts.length} account${accounts.length === 1 ? '' : 's'}).`
    );
  } else if (/budget/i.test(q)) {
    if (budgets.length === 0) {
      lines.push('You do not have budgets set yet. Add one under Budgets to track monthly limits.');
    } else {
      lines.push('Here is a quick budget snapshot:');
      for (const b of budgets.slice(0, 5)) {
        const spent = monthlyTx
          .filter((t) => (t.category || '').toLowerCase().includes((b.category || '').toLowerCase()))
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        lines.push(
          `- **${b.name}** (${b.category}): $${centsToDollars(spent).toFixed(2)} of $${centsToDollars(b.amount).toFixed(2)}`
        );
      }
    }
  } else if (/spend|spending|cut|save more|where.*money/i.test(q)) {
    lines.push(`This month you have spent about **$${totalSpent.toFixed(2)}**.`);
    if (byCategory.length > 0) {
      lines.push('Top categories:');
      for (const [cat, amt] of byCategory.slice(0, 4)) {
        lines.push(`- ${cat}: $${amt.toFixed(2)}`);
      }
      lines.push('Consider setting or tightening a budget on your largest category first.');
    } else {
      lines.push('Link accounts and sync transactions so I can break spending down by category.');
    }
  } else if (/loan|eligible|credit|risk/i.test(q)) {
    lines.push(
      'Loan eligibility uses your cash-flow and spending patterns. Keep accounts linked, stay within budgets, and complete identity verification under Verify before applying.'
    );
  } else {
    lines.push(
      `I am running in **local coach mode** (no cloud AI key). Based on your data: balance ≈ **$${totalBalance.toFixed(2)}**, spent this month ≈ **$${totalSpent.toFixed(2)}**.`
    );
    if (byCategory[0]) {
      lines.push(`Your largest category right now is **${byCategory[0][0]}** ($${byCategory[0][1].toFixed(2)}).`);
    }
    lines.push('Ask about balance, budgets, spending, or loans for a more specific summary.');
  }

  return {
    message: lines.join('\n\n') + DISCLAIMER,
    disclaimer:
      'This is educational information only, not financial advice. Consult a licensed advisor for decisions about your money.',
    sourcesUsed: ['local_coach', ...(accounts.length ? ['accounts'] : []), ...(monthlyTx.length ? ['transactions'] : [])],
  };
}

export async function getCoachResponse(
  userId: string,
  userMessage: string,
  history: { role: string; content: string }[] = []
): Promise<CoachResponse> {
  const apiKey = env.openai?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    return buildLocalCoachReply(userId, userMessage);
  }

  try {
    return await getOpenAiCoachResponse(userId, userMessage, history, apiKey);
  } catch (err) {
    console.error('OpenAI coach failed, falling back to local coach:', err);
    const local = await buildLocalCoachReply(userId, userMessage);
    return {
      ...local,
      message:
        'Cloud AI is temporarily unavailable, so here is a local summary based on your VeriFi data:\n\n' +
        local.message,
    };
  }
}

async function getOpenAiCoachResponse(
  userId: string,
  userMessage: string,
  history: { role: string; content: string }[],
  apiKey: string
): Promise<CoachResponse> {
  const openai = new OpenAI({ apiKey });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [budgets, transactionsForSpending, accountAgg] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      select: { category: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        account: { userId },
        date: { gte: ninetyDaysAgo },
        amount: { lt: 0 },
      },
      select: { category: true, amount: true, date: true },
    }),
    prisma.account.aggregate({
      where: { userId, isActive: true },
      _sum: { currentBalance: true },
    }),
  ]);

  const monthlySpending = transactionsForSpending.filter((t) => t.date >= startOfMonth);
  const spendingByCategory = Object.entries(
    transactionsForSpending.reduce<Record<string, number>>((acc, t) => {
      const cat = t.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + centsToDollars(Math.abs(t.amount));
      return acc;
    }, {})
  )
    .map(([category, total]) => ({ category, total: String(total) }))
    .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

  const budgetWithSpent = budgets.map((b) => {
    const cat = (b.category || '').toLowerCase();
    const spent = cat
      ? monthlySpending
          .filter((t) => {
            const tCat = (t.category || '').toLowerCase();
            return tCat === cat || tCat.startsWith(cat + ':') || tCat.includes(cat);
          })
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      : 0;
    return { category: b.category, amount: centsToDollars(b.amount), spent: String(centsToDollars(spent)) };
  });

  const totalSpentThisMonth = centsToDollars(monthlySpending.reduce((s, t) => s + Math.abs(t.amount), 0));
  const totalBalance = centsToDollars(accountAgg._sum.currentBalance ?? 0);

  const context = buildFinancialContext(
    budgetWithSpent,
    spendingByCategory,
    String(totalSpentThisMonth),
    String(totalBalance)
  );

  const systemContent = `${SYSTEM_PROMPT}\n\n## User's financial context (anonymized)\n${context}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    { role: 'user', content: userMessage },
  ];

  let rawMessage = '';
  let loopCount = 0;
  const maxToolLoops = 5;

  while (loopCount < maxToolLoops) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 600,
      temperature: 0.5,
    });

    const msg = completion.choices[0]?.message;
    if (!msg) break;

    if (msg.content) rawMessage = String(msg.content).trim();

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) break;

    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.function.name, arguments: tc.function.arguments ?? '{}' },
      })),
    });

    for (const tc of toolCalls) {
      const name = tc.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments ?? '{}');
      } catch {
        /* ignore */
      }
      const result = await runTool(name, args, userId);
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      });
    }
    loopCount++;
  }

  const finalMessage =
    rawMessage || 'I could not generate a response. Please try rephrasing your question.';

  const sourcesUsed: string[] = [];
  if (budgets.length > 0) sourcesUsed.push('budgets');
  if (transactionsForSpending.length > 0) sourcesUsed.push('transaction history');
  if (loopCount > 0) sourcesUsed.push('ai_tools');

  return {
    message: finalMessage + DISCLAIMER,
    disclaimer:
      'This is educational information only, not financial advice. Consult a licensed advisor for decisions about your money.',
    sourcesUsed,
  };
}
