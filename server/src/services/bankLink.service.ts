import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { centsToDollars, dollarsToCents } from '../lib/money.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

export const DEMO_INSTITUTIONS = [
  { id: 'ins_chase', name: 'Chase', detail: 'Checking & savings' },
  { id: 'ins_boa', name: 'Bank of America', detail: 'Checking' },
  { id: 'ins_wells', name: 'Wells Fargo', detail: 'Everyday checking' },
  { id: 'ins_citi', name: 'Citi', detail: 'Citi Priority' },
  { id: 'ins_capone', name: 'Capital One', detail: '360 Checking' },
] as const;

const MERCHANTS = ['Amazon', 'Starbucks', 'Walmart', 'Netflix', 'Spotify', 'Shell', 'Whole Foods', 'Uber', 'Target', 'Costco'];
const CATEGORIES: [string, string][] = [
  ['Food and Drink', 'Restaurants'],
  ['Travel', 'Gas'],
  ['Entertainment', 'Streaming'],
  ['Shopping', 'Online'],
  ['Bills', 'Utilities'],
  ['Food and Drink', 'Groceries'],
];

function plaidConfigured(): boolean {
  return Boolean(env.plaid.clientId && env.plaid.secret);
}

function plaidHost(): string {
  if (env.plaid.env === 'production') return 'https://production.plaid.com';
  if (env.plaid.env === 'development') return 'https://development.plaid.com';
  return 'https://sandbox.plaid.com';
}

export function getBankLinkConfig() {
  const mode = plaidConfigured() ? 'plaid' : 'demo';
  return {
    mode,
    providerLabel: mode === 'plaid' ? `Plaid (${env.plaid.env})` : 'Demo sandbox',
    institutions: DEMO_INSTITUTIONS.map(({ id, name, detail }) => ({ id, name, detail })),
    message:
      mode === 'plaid'
        ? 'Plaid credentials detected. Link tokens use the Plaid sandbox API; completion still seeds local demo balances until live item exchange is fully wired.'
        : 'Running without Plaid keys — pick an institution to seed realistic sample balances and transactions. Set PLAID_CLIENT_ID and PLAID_SECRET to enable the Plaid path.',
  };
}

export async function createLinkToken(userId: string): Promise<{
  mode: 'demo' | 'plaid';
  linkToken: string;
  expiration: string;
}> {
  if (!plaidConfigured()) {
    return {
      mode: 'demo',
      linkToken: `demo-link-${userId.slice(0, 8)}-${randomUUID().slice(0, 8)}`,
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  const res = await fetch(`${plaidHost()}/link/token/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.plaid.clientId,
      secret: env.plaid.secret,
      user: { client_user_id: userId },
      client_name: 'VeriFi AI',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new AppError(502, `Plaid link token failed: ${body.slice(0, 200)}`, 'PLAID_ERROR');
  }

  const data = (await res.json()) as { link_token: string; expiration: string };
  return { mode: 'plaid', linkToken: data.link_token, expiration: data.expiration };
}

async function seedTransactions(accountId: string, count: number, daysBack: number) {
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * daysBack);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const [cat, sub] = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const merchant = MERCHANTS[i % MERCHANTS.length];
    const amt = dollarsToCents(-(Math.floor(Math.random() * 15000) + 500) / 100);
    await prisma.transaction.create({
      data: {
        accountId,
        amount: amt,
        date: d,
        name: merchant,
        merchantName: merchant,
        category: cat,
        subcategory: sub,
      },
    });
  }
}

export async function completeBankLink(
  userId: string,
  opts: { institutionId?: string; publicToken?: string } = {}
) {
  const institution =
    DEMO_INSTITUTIONS.find((i) => i.id === opts.institutionId) ??
    DEMO_INSTITUTIONS[Math.floor(Math.random() * DEMO_INSTITUTIONS.length)];

  const mode = plaidConfigured() ? 'plaid' : 'demo';
  const externalItemId =
    opts.publicToken != null
      ? `item_${opts.publicToken.slice(0, 24)}`
      : `demo_item_${randomUUID()}`;

  const balance = dollarsToCents(Math.round((800 + Math.random() * 4200) * 100) / 100);

  const account = await prisma.account.create({
    data: {
      userId,
      institutionName: institution.name,
      accountName: `${institution.name} Checking`,
      accountType: 'checking',
      mask: String(Math.floor(Math.random() * 9000) + 1000),
      currentBalance: balance,
      provider: mode,
      externalItemId,
      linkStatus: 'linked',
    },
  });

  await seedTransactions(account.id, 18, 75);

  return {
    account: {
      ...account,
      currentBalance: centsToDollars(account.currentBalance),
    },
    provider: mode,
    institution: institution.name,
  };
}

export async function syncAccountTransactions(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new AppError(404, 'Account not found', 'NOT_FOUND');

  await seedTransactions(account.id, 5, 7);
  const bump = dollarsToCents(Math.round((Math.random() * 40 - 20) * 100) / 100);
  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { currentBalance: Math.max(0, account.currentBalance + bump) },
  });

  return { synced: 5, currentBalance: centsToDollars(updated.currentBalance) };
}
