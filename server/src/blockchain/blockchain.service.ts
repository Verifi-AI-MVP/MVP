import { randomBytes } from 'crypto';
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import { VeriFiLoanAbi, trustAttestationAbi } from './abis.js';
import { env } from '../config/env.js';

export type BlockchainMode = 'off' | 'simulation' | 'live';

export interface ChainTxResult {
  mode: BlockchainMode;
  chainId: number;
  txHash: Hex;
  contractAddress: string;
  onChainId: string;
}

export interface CreateOnChainLoanInput {
  loanId: string;
  borrowerAddress: string;
  amount: number;
  interestRatePct: number;
  termMonths: number;
  monthlyPayment: number;
}

export interface AttestTrustInput {
  subjectAddress: string;
  riskScore: number;
  decision: string;
  reasonCodes: unknown;
  factors: unknown;
  modelVersion: string;
}

function simulateTxHash(seed: string): Hex {
  return keccak256(stringToHex(`VeriFi-sim:${seed}:${Date.now()}`));
}

function stableSimId(seed: string): string {
  const hex = keccak256(stringToHex(seed));
  return ((BigInt(hex) % 1_000_000_000_000n) + 1n).toString();
}

function toOffChainId(loanUuid: string): Hex {
  return keccak256(stringToHex(loanUuid));
}

function toCents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

function toBps(ratePct: number): bigint {
  return BigInt(Math.round(ratePct * 100));
}

function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

let publicClient: PublicClient | null = null;
let walletClient: WalletClient | null = null;
let account: Account | null = null;

function getLiveClients(): { publicClient: PublicClient; walletClient: WalletClient; account: Account } {
  if (!env.blockchain.privateKey) {
    throw new Error('BLOCKCHAIN_PRIVATE_KEY is required for live mode');
  }
  if (!publicClient || !walletClient || !account) {
    account = privateKeyToAccount(env.blockchain.privateKey as Hex);
    const chain = {
      ...hardhat,
      id: env.blockchain.chainId,
    };
    const transport = http(env.blockchain.rpcUrl);
    publicClient = createPublicClient({ chain, transport });
    walletClient = createWalletClient({ account, chain, transport });
  }
  return { publicClient, walletClient, account };
}

export function getBlockchainStatus() {
  const mode = env.blockchain.mode;
  return {
    mode,
    enabled: mode !== 'off',
    chainId: env.blockchain.chainId,
    rpcUrl: mode === 'live' ? env.blockchain.rpcUrl : null,
    loanContract: env.blockchain.loanContractAddress || null,
    attestationContract: env.blockchain.attestationContractAddress || null,
    explorerBaseUrl: env.blockchain.explorerBaseUrl || null,
  };
}

export async function createOnChainLoan(input: CreateOnChainLoanInput): Promise<ChainTxResult | null> {
  if (env.blockchain.mode === 'off') return null;
  if (!isEvmAddress(input.borrowerAddress)) return null;

  const contractAddress = env.blockchain.loanContractAddress || '0xSimulatedLoanContract';

  if (env.blockchain.mode === 'simulation') {
    return {
      mode: 'simulation',
      chainId: env.blockchain.chainId,
      txHash: simulateTxHash(`loan-create:${input.loanId}`),
      contractAddress,
      onChainId: stableSimId(`loan:${input.loanId}`),
    };
  }

  const { publicClient: pc, walletClient: wc, account: acc } = getLiveClients();
  if (!env.blockchain.loanContractAddress) {
    throw new Error('LOAN_CONTRACT_ADDRESS is required for live mode');
  }

  const hash = await wc.writeContract({
    address: env.blockchain.loanContractAddress as Hex,
    abi: VeriFiLoanAbi,
    functionName: 'createLoan',
    args: [
      toOffChainId(input.loanId),
      input.borrowerAddress as Hex,
      toCents(input.amount),
      toBps(input.interestRatePct),
      BigInt(input.termMonths),
      toCents(input.monthlyPayment),
    ],
    account: acc,
    chain: wc.chain,
  });

  await pc.waitForTransactionReceipt({ hash });

  const onChainId = String(
    await pc.readContract({
      address: env.blockchain.loanContractAddress as Hex,
      abi: VeriFiLoanAbi,
      functionName: 'offChainIdToLoanId',
      args: [toOffChainId(input.loanId)],
    })
  );

  return {
    mode: 'live',
    chainId: env.blockchain.chainId,
    txHash: hash,
    contractAddress: env.blockchain.loanContractAddress,
    onChainId,
  };
}

export async function updateOnChainLoanStatus(
  onChainLoanId: string,
  action: 'approve' | 'reject' | 'disburse' | 'repay' | 'default'
): Promise<ChainTxResult | null> {
  if (env.blockchain.mode === 'off') return null;

  const contractAddress = env.blockchain.loanContractAddress || '0xSimulatedLoanContract';
  const fnMap = {
    approve: 'approveLoan',
    reject: 'rejectLoan',
    disburse: 'disburseLoan',
    repay: 'markRepaid',
    default: 'markDefaulted',
  } as const;

  if (env.blockchain.mode === 'simulation') {
    return {
      mode: 'simulation',
      chainId: env.blockchain.chainId,
      txHash: simulateTxHash(`loan-${action}:${onChainLoanId}`),
      contractAddress,
      onChainId: onChainLoanId,
    };
  }

  const { publicClient: pc, walletClient: wc, account: acc } = getLiveClients();
  if (!env.blockchain.loanContractAddress) {
    throw new Error('LOAN_CONTRACT_ADDRESS is required for live mode');
  }

  const hash = await wc.writeContract({
    address: env.blockchain.loanContractAddress as Hex,
    abi: VeriFiLoanAbi,
    functionName: fnMap[action],
    args: [BigInt(onChainLoanId)],
    account: acc,
    chain: wc.chain,
  });

  await pc.waitForTransactionReceipt({ hash });

  return {
    mode: 'live',
    chainId: env.blockchain.chainId,
    txHash: hash,
    contractAddress: env.blockchain.loanContractAddress,
    onChainId: onChainLoanId,
  };
}

export async function attestTrustScore(input: AttestTrustInput): Promise<ChainTxResult | null> {
  if (env.blockchain.mode === 'off') return null;
  if (!isEvmAddress(input.subjectAddress)) return null;

  const contractAddress = env.blockchain.attestationContractAddress || '0xSimulatedAttestationContract';
  const decisionHash = keccak256(stringToHex(input.decision));
  const factorsHash = keccak256(
    stringToHex(JSON.stringify({ reasonCodes: input.reasonCodes, factors: input.factors }))
  );

  if (env.blockchain.mode === 'simulation') {
    return {
      mode: 'simulation',
      chainId: env.blockchain.chainId,
      txHash: simulateTxHash(`attest:${input.subjectAddress}:${input.riskScore}`),
      contractAddress,
      onChainId: stableSimId(
        `attest:${input.subjectAddress}:${input.riskScore}:${input.decision}:${input.modelVersion}:${randomBytes(8).toString('hex')}`
      ),
    };
  }

  const { publicClient: pc, walletClient: wc, account: acc } = getLiveClients();
  if (!env.blockchain.attestationContractAddress) {
    throw new Error('ATTESTATION_CONTRACT_ADDRESS is required for live mode');
  }

  const hash = await wc.writeContract({
    address: env.blockchain.attestationContractAddress as Hex,
    abi: trustAttestationAbi,
    functionName: 'attest',
    args: [
      input.subjectAddress as Hex,
      BigInt(input.riskScore),
      decisionHash,
      factorsHash,
      input.modelVersion,
    ],
    account: acc,
    chain: wc.chain,
  });

  await pc.waitForTransactionReceipt({ hash });

  const onChainId = String(
    await pc.readContract({
      address: env.blockchain.attestationContractAddress as Hex,
      abi: trustAttestationAbi,
      functionName: 'latestAttestationId',
      args: [input.subjectAddress as Hex],
    })
  );

  return {
    mode: 'live',
    chainId: env.blockchain.chainId,
    txHash: hash,
    contractAddress: env.blockchain.attestationContractAddress,
    onChainId,
  };
}
