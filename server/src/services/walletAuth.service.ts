import { randomBytes } from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { verifyMessage } from 'viem';
import { prisma } from '../lib/prisma.js';
import { signToken } from './auth.service.js';

const NONCE_TTL_MS = 5 * 60 * 1000;

interface NonceRecord {
  message: string;
  expires: number;
}

const nonceStore = new Map<string, NonceRecord>();

function normalizeKey(address: string): string {
  if (address.toLowerCase().startsWith('0x')) return address.toLowerCase();
  return address;
}

function purgeExpiredNonces(): void {
  const now = Date.now();
  for (const [key, record] of nonceStore) {
    if (now > record.expires) nonceStore.delete(key);
  }
}

export function createSignInChallenge(address: string): { nonce: string; message: string } {
  purgeExpiredNonces();
  const key = normalizeKey(address);
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const message = [
    'VeriFi AI sign-in',
    `Address: ${key}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
  nonceStore.set(key, { message, expires: Date.now() + NONCE_TTL_MS });
  return { nonce, message };
}

export function consumeNonce(address: string, message: string): boolean {
  const key = normalizeKey(address);
  const stored = nonceStore.get(key);
  if (!stored || stored.message !== message || Date.now() > stored.expires) return false;
  nonceStore.delete(key);
  return true;
}

function isEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr) || /^[a-fA-F0-9]{40}$/.test(addr);
}

export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  if (isEvmAddress(address)) {
    const addr = address.startsWith('0x') ? address.toLowerCase() : `0x${address.toLowerCase()}`;
    const sig = signature.startsWith('0x') ? (signature as `0x${string}`) : (`0x${signature}` as `0x${string}`);

    try {
      return await verifyMessage({
        address: addr as `0x${string}`,
        message,
        signature: sig,
      });
    } catch {
      return false;
    }
  }

  try {
    const pk = bs58.decode(address);
    const msg = new TextEncoder().encode(message);
    const sig = Buffer.from(signature, 'base64');
    if (pk.length !== 32 || sig.length !== 64) return false;
    return nacl.sign.detached.verify(msg, sig, pk);
  } catch {
    return false;
  }
}

interface WalletMatch {
  id: string;
  wallet_address: string;
  role: string;
}

/**
 * Looks up a wallet, including checksummed EVM addresses stored before login
 * normalized them. When several rows share the same EVM address, the admin
 * row (or the oldest row) is kept and later duplicates are disabled.
 */
export async function findUserByWallet(address: string) {
  const key = normalizeKey(address);

  if (!key.startsWith('0x')) {
    return prisma.user.findFirst({ where: { walletAddress: key } });
  }

  const matches = await prisma.$queryRaw<WalletMatch[]>`
    SELECT id, wallet_address, role FROM "User"
    WHERE wallet_address IS NOT NULL AND lower(wallet_address) = ${key}
    ORDER BY created_at ASC
  `;
  if (matches.length === 0) return null;

  const primary = matches.find((row) => row.role === 'admin') ?? matches[0];
  for (const extra of matches) {
    if (extra.id === primary.id) continue;
    await prisma.user.update({
      where: { id: extra.id },
      data: { walletAddress: `disabled-${extra.id}`, isActive: false },
    });
  }

  if (primary.wallet_address !== key) {
    await prisma.user.update({
      where: { id: primary.id },
      data: { walletAddress: key },
    });
  }

  return prisma.user.findUnique({ where: { id: primary.id } });
}

export async function createWalletUser(address: string) {
  const key = normalizeKey(address);
  return prisma.user.create({
    data: {
      walletAddress: key,
      email: null,
      passwordHash: null,
    },
    select: { id: true, walletAddress: true, email: true, firstName: true, lastName: true, role: true },
  });
}

export function signWalletToken(user: { id: string; email?: string | null; role: string }) {
  return signToken({ userId: user.id, email: user.email ?? undefined, role: user.role });
}
