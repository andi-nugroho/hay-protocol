# Cross-Chain Relayer with Express.js (Stacks → EVM via viem)

This guide shows how to build and run a production-friendly relayer using Express.js and viem. It listens for Stacks `borrow-request` events and mints ERC20s on an EVM chain (Base Sepolia) through a `BorrowController`.

- Why viem: modern, typed, small surface, easy chain presets. Ethers also works; viem is used here by default.
- Trust model (MVP): Relayer is trusted to reflect outcomes on EVM. Upgrade paths: M-of-N guardians, bridge/oracle attestations.

---

## 1) Prerequisites

- Node.js 18+ (20+ recommended)
- Base Sepolia RPC endpoint (Alchemy/Infura/etc.)
- Relayer EVM private key funded with test ETH
- Stacks Testnet API endpoint (Hiro): `https://stacks-node-api.testnet.stacks.co`
- Deployed contracts:
  - Stacks: `collateral-v1` (emits `borrow-request` with `evm-recipient`), `lending-v1`
  - EVM: `BorrowController` + mock ERC20s (see `docs/INTEGRATION.md`)

---

## 2) Project scaffold

Create a new folder for the relayer service (outside your contracts repo or inside `relayer/`).

```bash
mkdir -p relayer-express/src
cd relayer-express
npm init -y
npm pkg set type=module
npm i express viem dotenv zod cross-fetch pino
npm i -D typescript ts-node @types/node @types/express
npx tsc --init --rootDir src --outDir dist --esModuleInterop true --resolveJsonModule true --module nodenext --moduleResolution nodenext --target es2022
```

Minimal `package.json`:

```json
{
  "name": "stacklend-relayer-express",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc -p .",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cross-fetch": "^4.0.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "pino": "^9.3.1",
    "viem": "^2.16.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  }
}
```

> You can also use JavaScript; TypeScript is recommended for better types with viem.

---

## 3) Environment variables

Create `.env` in the project root:

```bash
PORT=8080
# Stacks
STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
COLLATERAL_CONTRACT_ID=SPxxxx.collateral-v1
STACKS_CONFIRMATIONS=1
# EVM
BASE_RPC_URL=https://base-sepolia.example
RELAYER_PRIVATE_KEY=0x...
BORROW_CONTROLLER=0xControllerAddress
# Token-id → ERC20 address mapping (JSON)
TOKEN_MAP={"USDC":"0xUSDC...","USDT":"0xUSDT...","ETH":"0xWETH..."}
# Polling
POLL_INTERVAL_MS=6000
# Persistence
STATE_FILE=./state.json
```

Notes
- `COLLATERAL_CONTRACT_ID` format: `SP...-TESTNET.collateral-v1` on testnet.
- Ensure `RELAYER_PRIVATE_KEY` is hex-prefixed (0x) and funded on Base Sepolia.

---

## 4) ABI for BorrowController

Paste this ABI into `src/abi/borrowController.json`:

```json
[
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "borrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "repay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

---

## 5) Source files

Create these files under `src/`.

### 5.1 config.ts

```ts
import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  PORT: z.string().default('8080'),
  STACKS_API_URL: z.string().url(),
  COLLATERAL_CONTRACT_ID: z.string(),
  STACKS_CONFIRMATIONS: z.string().default('1'),
  BASE_RPC_URL: z.string().url(),
  RELAYER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  BORROW_CONTROLLER: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  TOKEN_MAP: z.string().default('{}'),
  POLL_INTERVAL_MS: z.string().default('6000'),
  STATE_FILE: z.string().default('./state.json'),
});

export const env = Env.parse(process.env);
export const tokenMap: Record<string, `0x${string}`> = JSON.parse(env.TOKEN_MAP);
```

### 5.2 evm.ts (viem clients)

```ts
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import controllerAbi from './abi/borrowController.json' assert { type: 'json' };
import { env } from './config';

const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as `0x${string}`);

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(env.BASE_RPC_URL),
});

export const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(env.BASE_RPC_URL),
});

export async function borrow(token: `0x${string}`, to: `0x${string}`, amount: bigint) {
  return walletClient.writeContract({
    address: env.BORROW_CONTROLLER as `0x${string}`,
    abi: controllerAbi,
    functionName: 'borrow',
    args: [token, to, amount],
  });
}

export async function repay(token: `0x${string}`, from: `0x${string}`, amount: bigint) {
  return walletClient.writeContract({
    address: env.BORROW_CONTROLLER as `0x${string}`,
    abi: controllerAbi,
    functionName: 'repay',
    args: [token, from, amount],
  });
}
```

### 5.3 state.ts (idempotency store)

```ts
import fs from 'fs';
import { env } from './config';

export type State = { lastHeight: number; processed: Record<string, { hash: string; t: number }>; };

export function loadState(): State {
  try { return JSON.parse(fs.readFileSync(env.STATE_FILE, 'utf8')); }
  catch { return { lastHeight: 0, processed: {} }; }
}

export function saveState(s: State) {
  fs.writeFileSync(env.STATE_FILE, JSON.stringify(s, null, 2));
}
```

### 5.4 stacks.ts (event sourcing – concrete via Hiro API)

```ts
import fetch from 'cross-fetch';
import { env } from './config';

export type BorrowEvent = {
  id: string;            // idempotency key: txid:index
  txid: string;
  height: number;
  user: string;          // Stacks principal
  tokenId: string;       // e.g., 'USDC'
  amount: bigint;        // normalize to ERC20 base units externally if needed
  evmRecipient: `0x${string}` | null; // 20-byte recipient (hex)
};

type TxSummary = {
  tx_id: string;
  block_height: number;
  tx_status: 'success' | string;
  tx_type: string;
  contract_call?: { contract_id: string };
  sender_address: string;
};

type TxDetails = {
  tx_id: string;
  block_height: number;
  events: Array<{
    event_type: string; // e.g., 'print' | 'smart_contract_log' | ...
    contract_log?: { value?: { repr?: string } };
    // Some API versions nest under 'print_event' with { value: { repr } }
    print_event?: { value?: { repr?: string } };
  }>;
};

async function getTipHeight(): Promise<number> {
  const r = await fetch(`${env.STACKS_API_URL}/v2/info`);
  if (!r.ok) throw new Error(`info failed: ${r.status}`);
  const j = await r.json();
  return Number(j?.stacks_tip_height ?? j?.tip_height ?? 0);
}

function parseBorrowPrintRepr(repr?: string): null | { event: string; tokenId: string; amount: bigint; evmRecipient: `0x${string}` | null; user?: string } {
  if (!repr) return null;
  // Expect a tuple-like repr: {event: "borrow-request", token-id: "USDC", amount: u1000, evm-recipient: 0xabc..., user: SP...}
  if (!repr.includes('borrow-request')) return null;
  const getStr = (key: string) => {
    const m = repr.match(new RegExp(`${key}[^\S\r\n]*:[^\S\r\n]*"([^"]+)"`));
    return m?.[1] ?? '';
  };
  const getUint = (key: string) => {
    const m = repr.match(new RegExp(`${key}[^\S\r\n]*:[^\S\r\n]*u(\d+)`));
    return m?.[1] ? BigInt(m[1]) : 0n;
  };
  const getHex = (key: string) => {
    const m = repr.match(new RegExp(`${key}[^\S\r\n]*:[^\S\r\n]*(0x[0-9a-fA-F]{40})`));
    return (m?.[1] as `0x${string}` | undefined) ?? null;
  };
  return {
    event: 'borrow-request',
    tokenId: getStr('token-id'),
    amount: getUint('amount'),
    evmRecipient: getHex('evm-recipient'),
    user: getStr('user') || undefined,
  };
}

async function listContractTxs(limit = 50, offset = 0): Promise<TxSummary[]> {
  // Address transactions for the contract principal; filter to calls touching this contract
  const url = `${env.STACKS_API_URL}/extended/v1/address/${encodeURIComponent(env.COLLATERAL_CONTRACT_ID)}/transactions?limit=${limit}&offset=${offset}&unanchored=false`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`tx list failed: ${r.status}`);
  const j = await r.json();
  return (j?.results ?? []) as TxSummary[];
}

async function getTx(txid: string): Promise<TxDetails> {
  const r = await fetch(`${env.STACKS_API_URL}/extended/v1/tx/${txid}?event_limit=200`);
  if (!r.ok) throw new Error(`tx ${txid} failed: ${r.status}`);
  return (await r.json()) as TxDetails;
}

export async function fetchBorrowEventsSince(height: number, confirmations = 1): Promise<BorrowEvent[]> {
  const tip = await getTipHeight();
  const minConfirmed = tip - confirmations;
  const out: BorrowEvent[] = [];

  // Page through recent transactions for the contract address
  let offset = 0;
  const pageSize = 50;
  while (true) {
    const txs = await listContractTxs(pageSize, offset);
    if (txs.length === 0) break;

    for (const t of txs) {
      // Only confirmed successful contract calls
      if (t.tx_status !== 'success') continue;
      if (t.block_height == null || t.block_height <= height) continue;
      if (t.block_height > minConfirmed) continue; // wait required confirmations

      // Ensure it is a call that touches this contract (defensive)
      if (t.tx_type !== 'contract_call') continue;
      if (t.contract_call && t.contract_call.contract_id !== env.COLLATERAL_CONTRACT_ID) continue;

      const det = await getTx(t.tx_id);
      det.events?.forEach((ev, idx) => {
        const repr = ev.print_event?.value?.repr ?? ev.contract_log?.value?.repr;
        const parsed = parseBorrowPrintRepr(repr);
        if (!parsed) return;
        const user = parsed.user || t.sender_address;
        out.push({
          id: `${t.tx_id}:${idx}`,
          txid: t.tx_id,
          height: det.block_height ?? t.block_height,
          user,
          tokenId: parsed.tokenId,
          amount: parsed.amount,
          evmRecipient: parsed.evmRecipient,
        });
      });
    }

    // Stop if we've paged beyond the confirmation window or far beyond last height
    const oldest = txs[txs.length - 1]?.block_height ?? 0;
    if (oldest <= height) break;
    offset += pageSize;
    // Safety cap on pages per poll to avoid long loops
    if (offset >= 500) break;
  }

  // Sort by height then txid:index for stable processing
  out.sort((a, b) => (a.height - b.height) || a.id.localeCompare(b.id));
  return out;
}
```

> Notes
> - Endpoints can vary slightly by node version; if `print_event` vs `smart_contract_log` differs, adjust the `repr` extraction accordingly.
> - If your endpoint doesn’t support contract principal in the address tx list, fall back to listing recent blocks or maintain a dedicated indexer.
> - Always key idempotency by `txid:index` and gate by confirmations to avoid reorg issues.

### 5.5 worker.ts (process events)

```ts
import { borrow } from './evm';
import { tokenMap } from './config';
import type { BorrowEvent } from './stacks';

export async function processBorrow(ev: BorrowEvent) {
  const token = tokenMap[ev.tokenId];
  if (!token) throw new Error(`Unknown token-id: ${ev.tokenId}`);
  if (!ev.evmRecipient) throw new Error('Missing EVM recipient');

  // NOTE: Ensure amount units match token decimals (e.g., 6 or 18). Convert as needed before calling.
  const hash = await borrow(token, ev.evmRecipient, ev.amount);
  return hash; // EVM tx hash
}
```

### 5.6 server.ts (Express API)

```ts
import express from 'express';
import pino from 'pino';
import { env } from './config';
import { loadState, saveState } from './state';
import { fetchBorrowEventsSince } from './stacks';
import { processBorrow } from './worker';

const log = pino({ level: 'info' });
const app = express();
app.use(express.json());

let state = loadState();

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/stats', (_req, res) => res.json({ lastHeight: state.lastHeight, processed: Object.keys(state.processed).length }));

// Optional manual trigger to scan and process now
app.post('/trigger-sync', async (_req, res) => {
  try {
    const events = await fetchBorrowEventsSince(state.lastHeight, Number(env.STACKS_CONFIRMATIONS));
    const results: Record<string, string> = {};
    for (const ev of events) {
      const key = `borrow:${ev.id}`;
      if (state.processed[key]) continue;
      const hash = await processBorrow(ev);
      state.processed[key] = { hash, t: Date.now() };
      state.lastHeight = Math.max(state.lastHeight, ev.height);
      results[key] = hash;
    }
    saveState(state);
    res.json({ ok: true, results });
  } catch (e: any) {
    log.error(e, 'trigger-sync failed');
    res.status(500).json({ ok: false, error: e?.message || 'unknown' });
  }
});

export function startServer() {
  app.listen(Number(env.PORT), () => {
    log.info({ port: env.PORT }, 'relayer listening');
  });
}

export async function pollLoop() {
  const interval = Number(env.POLL_INTERVAL_MS);
  const confirmations = Number(env.STACKS_CONFIRMATIONS);
  while (true) {
    try {
      const events = await fetchBorrowEventsSince(state.lastHeight, confirmations);
      for (const ev of events) {
        const key = `borrow:${ev.id}`;
        if (state.processed[key]) continue;
        const hash = await processBorrow(ev);
        state.processed[key] = { hash, t: Date.now() };
        state.lastHeight = Math.max(state.lastHeight, ev.height);
        saveState(state);
      }
    } catch (e) {
      console.error('poll error', e);
    }
    await new Promise(r => setTimeout(r, interval));
  }
}
```

### 5.7 index.ts (entrypoint)

```ts
import { startServer, pollLoop } from './server';

startServer();
// Fire-and-forget background loop
void pollLoop();
```

---

## 6) Running the service

```bash
npm run dev
# or build & run
npm run build
npm start
```

- Health: GET http://localhost:8080/health → `{ ok: true }`
- Stats: GET http://localhost:8080/stats
- Manual sync: POST http://localhost:8080/trigger-sync

Deploy with PM2 or systemd as in `docs/RELAYER.md`.

---

## 7) Implementing Stacks event fetch

Depending on your Hiro node/API version, choose one strategy:

- Contract events endpoint (if available): fetch events for `COLLATERAL_CONTRACT_ID`, filter confirmed height ≥ current tip - confirmations, and parse `print` entries where `event == "borrow-request"`.
- Block scan: Get recent blocks from last height, list txs that interact with your contract, and parse events from `/extended/v1/tx/{txid}`.
- Custom indexer or websocket: subscribe to confirmed events and push into your service.

Parsing prints
- Extract `user`, `token-id`, `amount`, `evm-recipient` (20-byte). Convert buffer to EVM address: `0x...`.
- Build idempotency key as `{txid}:{log_index}` to avoid double processing.
- Set `height` from the confirmed block height.

---

## 8) Repayment path (optional)

For the MVP:
- User repays on EVM.
- Frontend (or relayer) calls Stacks `signal-repay(token-id, amount)` to reduce principal.

Later hardening options: guardians, bridge/oracle attestations, or optimistic finalize.

---

## 9) Best practices: viem vs ethers

- viem (recommended here): modern API, strong types, explicit chain config, easier to tree-shake. Great DX and safety.
- ethers: mature and widely used, great docs and tooling. Still perfectly fine.
- Either works; pick one stack. If your team already uses ethers elsewhere, you can swap `evm.ts` to ethers with minimal changes.

---

## 10) Common pitfalls

- Recipient type: ensure `evm-recipient` is a 20-byte buffer on Stacks, converted to a checksummed `0x` address.
- Amount units: normalize amounts to match ERC20 decimals (6 vs 18). Consider per-token metadata and conversion.
- Idempotency: always key by `txid:index` and persist in `STATE_FILE`.
- Confirmations: wait 1–2 confirmations to avoid reorgs before executing on EVM.
- Controller config: allowlist tokens and set the relayer role; fund relayer account on Base Sepolia.

---

## 11) Next steps

- Wire `fetchBorrowEventsSince` to your Stacks API flow and test end-to-end.
- Add metrics (/metrics) and structured logs (Pino) shipped to your observability stack.
- Containerize and deploy behind a small reverse proxy; enable basic auth for write endpoints.
- Extend to support repay events if you later emit them on Stacks.

---

## 12) Ethers alternative (quick swap)

If you prefer ethers, replace `evm.ts` with:

```ts
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import controllerAbi from './abi/borrowController.json';
import { env } from './config';

const provider = new JsonRpcProvider(env.BASE_RPC_URL);
const wallet = new Wallet(env.RELAYER_PRIVATE_KEY, provider);
const controller = new Contract(env.BORROW_CONTROLLER, controllerAbi, wallet);

export async function borrow(token: string, to: string, amount: bigint) {
  const tx = await controller.borrow(token, to, amount);
  const rcpt = await tx.wait();
  return rcpt?.hash ?? tx.hash;
}
```

Everything else stays the same.
