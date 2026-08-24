import '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { dollarsToCents, ensureMoneyStoredAsCents } from '../src/lib/money.js';
import { findUserByWallet } from '../src/services/walletAuth.service.js';

// Hardhat test accounts - import in MetaMask for dev testing
// #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
// #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
const DEMO_WALLET = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const ADMIN_WALLET = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

async function upsertWalletUser(
  address: string,
  data: { firstName: string; lastName: string; role: string; kycStatus: string }
) {
  const existing = await findUserByWallet(address);
  if (!existing) {
    return prisma.user.create({
      data: { walletAddress: address, ...data },
    });
  }
  return prisma.user.update({
    where: { id: existing.id },
    data: { role: data.role, kycStatus: data.kycStatus, isActive: true },
  });
}

async function main() {
  await ensureMoneyStoredAsCents();

  const admin = await upsertWalletUser(ADMIN_WALLET, {
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    kycStatus: 'verified',
  });

  const user = await upsertWalletUser(DEMO_WALLET, {
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    kycStatus: 'verified',
  });

  const existingAccount = await prisma.account.findFirst({ where: { userId: user.id } });
  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        institutionName: 'Demo Bank',
        accountName: 'Checking',
        accountType: 'checking',
        mask: '4242',
        currentBalance: dollarsToCents(5000),
      },
    });
  }

  console.log('Seeded wallet users:', admin.walletAddress, user.walletAddress);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
