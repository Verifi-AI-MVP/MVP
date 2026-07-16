

# VeriFi AI

Wallet auth, bank linking, budgets, AI coach, loan scoring — plus optional on-chain loan records and risk attestations.

## Requirements

- Node.js >= 20

## Stack

- React + Vite + Tailwind + Tremor
- Express + Prisma + SQLite
- Wallet login (EVM + Solana)
- Hardhat contracts + viem (optional; sim mode works without a node)
- OpenAI for the coach (optional)

## Setup

```bash
npm install
npm run dev
```

The first start creates `.env` from `.env.example`, creates the SQLite database, and seeds the demo wallets. Set `OPENAI_API_KEY` in `.env` if you want the cloud coach.

API: http://localhost:3001 · App: http://localhost:5173

`BLOCKCHAIN_MODE=simulation` is the default — fake tx hashes so you can demo without running a chain.

### Actually hitting a chain

```bash
npm run contracts:install
npm run contracts:compile
npm run contracts:node          # terminal 1
npm run contracts:deploy        # terminal 2
```

Stick the printed addresses + Hardhat account #0 key in `.env`, set `BLOCKCHAIN_MODE=live`.

Contracts live in `contracts/`:
- `VeriFiLoan` — create / approve / disburse / repay
- `TrustAttestation` — park a risk score against a wallet

Eligibility check writes an attestation (EVM wallets). Loan apply creates an on-chain loan. Admin status changes sync to the contract. Users can see it under Chain.

## Features

- Wallet login (MetaMask, Coinbase, Phantom, etc.)
- Mock bank link (swap for real Plaid later)
- Transactions, budgets, insights
- AI coach (`OPENAI_API_KEY`)
- Loan eligibility + apply
- Admin dashboard (approve / disburse loans)
- Light/dark theme

## Layout

```
contracts/          Hardhat + Solidity
server/             Express API
  src/blockchain/   viem helpers
  src/loan-scoring/
src/                React app
```

## Scripts

| | |
|---|---|
| `npm run dev` | database, api, and frontend |
| `npm run db:push` / `db:seed` | same database steps, if you want them alone |
| `npm run contracts:compile` | solc |
| `npm run contracts:test` | hardhat tests |
| `npm run contracts:node` | local chain |
| `npm run contracts:deploy` | deploy to localhost |
