import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

function parseBlockchainMode(value: string | undefined): 'off' | 'simulation' | 'live' {
  if (value === 'live' || value === 'off' || value === 'simulation') return value;
  return 'simulation';
}

const DEV_JWT_SECRET = 'dev-secret-change-in-production';
const INSECURE_JWT_SECRETS = new Set([
  '',
  DEV_JWT_SECRET,
  'your-secret-change-in-production',
]);

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.JWT_ACCESS_SECRET ?? '';
  if ((process.env.NODE_ENV ?? 'development') === 'production' && INSECURE_JWT_SECRETS.has(secret)) {
    throw new Error('JWT_SECRET must be set to a unique value in production');
  }
  return secret || DEV_JWT_SECRET;
}

export const env = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  jwt: {
    secret: resolveJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN ?? process.env.JWT_ACCESS_EXPIRY ?? '15m',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 200,
    /** Strict limit for signature verify only (not /me or /nonce). */
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '30', 10),
    nonceMax: parseInt(process.env.NONCE_RATE_LIMIT_MAX ?? '40', 10),
    coachMax: 40,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
  },
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID ?? '',
    secret: process.env.PLAID_SECRET ?? '',
    env: (process.env.PLAID_ENV ?? 'sandbox') as 'sandbox' | 'development' | 'production',
  },
  kyc: {
    /** Opt in for local demos. Unset means an admin must review each submission. */
    autoApprove: process.env.KYC_AUTO_APPROVE === 'true',
  },
  blockchain: {
    mode: parseBlockchainMode(process.env.BLOCKCHAIN_MODE),
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL ?? 'http://127.0.0.1:8545',
    chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID ?? '31337', 10),
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY ?? '',
    loanContractAddress: process.env.LOAN_CONTRACT_ADDRESS ?? '',
    attestationContractAddress: process.env.ATTESTATION_CONTRACT_ADDRESS ?? '',
    explorerBaseUrl: process.env.BLOCKCHAIN_EXPLORER_URL ?? '',
  },
} as const;
