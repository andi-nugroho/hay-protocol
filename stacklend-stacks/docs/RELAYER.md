# Cross-Chain Relayer Setup Guide (Stacks ↔ EVM)

This guide walks you through building a minimal, reliable relayer so users can borrow EVM tokens using real STX testnet collateral.

- Stacks (testnet): Clarity contracts track STX collateral and debt principal.
- EVM (Base Sepolia): Mock ERC20s minted/burned by a BorrowController with relayer-only methods.
- Relayer (Node.js): Listens to Stacks events and submits corresponding EVM txs.

> MVP trust model: The relayer is trusted to reflect EVM outcomes. You can later upgrade to guardians (M-of-N) or a bridge/oracle.

---

## 1) Architecture

- User deposits STX collateral on Stacks: `deposit-collateral`.
- User signals borrow: `request-borrow(token-id, amount, some(evmRecipient20))`.
  - Contract emits: `borrow-request { user, token-id, amount, evm-recipient }`.
- Relayer sees the event and calls EVM `BorrowController.borrow(token, recipient, amount)`.
- Repay (MVP): user repays on EVM; frontend (or user) calls `signal-repay(token-id, amount)` on Stacks to reduce principal.

---

## 2) Prerequisites

- Node.js v18+ (v20 recommended)
- Base Sepolia RPC endpoint (Alchemy/Infura/Ankr/etc.)
- Relayer EVM key with test ETH
- Stacks Testnet API endpoint (Hiro): e.g., `https://stacks-node-api.testnet.stacks.co`
- Deployed contracts:
  - Stacks: `collateral-v1`, `lending-v1`
  - Base Sepolia: `BorrowController`, mock ERC20 tokens (USDC, USDT, WETH)

---

## 3) Configuration

Create a `.env` file for the relayer:

```
# Stacks
STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
COLLATERAL_CONTRACT_ID=SPxxxxxxx.collateral-v1
NETWORK=mainnet:testnet  # use testnet

# EVM (Base Sepolia)
BASE_RPC_URL=https://base-sepolia.example
RELAYER_PRIVATE_KEY=0x...
BORROW_CONTROLLER=0xControllerAddress

# Token mapping (JSON string): token-id → ERC20 address
TOKEN_MAP={"USDC":"0xUSDC...","USDT":"0xUSDT...","ETH":"0xWETH..."}

# Relayer behavior
POLL_INTERVAL_MS=6000
CONFIRMATIONS=1
STATE_DB=./relayer-state.json
```

> CONTRACT_ID format is `SP...-TESTNET.contract-name` on testnet. Confirm your deployed IDs.

---

## 4) EVM contracts

You’ll need the `BorrowController` and mock tokens. See `docs/INTEGRATION.md` for full source.

Controller ABI fragment (paste into the relayer):

```json
[
  {"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"borrow","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"repay","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
```

---

## 5) Project bootstrap

Initialize a minimal Node project (local or on a small VM):

- Dependencies: `ethers`, `cross-fetch`
- Optional: `dotenv`, `pino` or `winston` for logging

Example `package.json`:

```json
{
  "name": "stacklend-relayer",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "cross-fetch": "^4.0.0",
    "dotenv": "^16.4.5",
    "ethers": "^6.12.0"
  }
}
```

---

## 6) Relayer logic (template)

Create `src/index.js`:

```js
import 'dotenv/config';
import fetch from 'cross-fetch';
import { ethers } from 'ethers';
import fs from 'fs';

const {
  STACKS_API_URL,
  COLLATERAL_CONTRACT_ID,
  BASE_RPC_URL,
  RELAYER_PRIVATE_KEY,
  BORROW_CONTROLLER,
  TOKEN_MAP,
  POLL_INTERVAL_MS = '6000',
  CONFIRMATIONS = '1',
  STATE_DB = './relayer-state.json',
} = process.env;

const tokenMap = JSON.parse(TOKEN_MAP || '{}');

// EVM setup
const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
const controllerAbi = [
  {
    name: 'borrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'repay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'from', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
];
const controller = new ethers.Contract(BORROW_CONTROLLER, controllerAbi, wallet);

// Simple idempotency store
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_DB, 'utf8')); } catch { return { lastBlock: 0, processed: {} }; }
}
function saveState(s) { fs.writeFileSync(STATE_DB, JSON.stringify(s, null, 2)); }
let state = loadState();

// Fetch recent confirmed transactions for a contract and extract borrow-request prints
async function fetchBorrowEvents(sinceBlock) {
  // Note: Stacks API offers multiple endpoints to fetch contract tx logs.
  // Use your preferred event source (confirmed tx log stream or websocket).
  // Below is a generic placeholder that should be adapted to your API client.
  const url = `${STACKS_API_URL}/extended/v1/tx?limit=50&offset=0`; // Replace with contract-scoped events in your client
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stacks API error: ${res.status}`);
  const data = await res.json();

  // TODO: Filter to txs calling COLLATERAL_CONTRACT_ID::request-borrow
  // TODO: Parse print events with event: "borrow-request"
  // Return an array of { id, tokenId, amount, evmRecipient, user }
  return [];
}

function hexBuff20ToAddress(buff) {
  // buff should be a 20-byte hex like 0xdead...; ensure it maps to a valid EVM address
  if (!buff || buff === '0x0000000000000000000000000000000000000000') return null;
  return ethers.getAddress(buff);
}

async function processBorrow(ev) {
  const key = `borrow:${ev.id}`;
  if (state.processed[key]) return;
  const token = tokenMap[ev.tokenId];
  if (!token) throw new Error(`Unknown token-id: ${ev.tokenId}`);
  const to = hexBuff20ToAddress(ev.evmRecipient);
  if (!to) throw new Error('Missing EVM recipient');
  const amount = ev.amount; // Ensure unit alignment with ERC20 decimals
  const tx = await controller.borrow(token, to, amount);
  const rcpt = await tx.wait();
  console.log('[EVM] borrow sent', { hash: tx.hash, gasUsed: rcpt.gasUsed?.toString?.() });
  state.processed[key] = { hash: tx.hash, t: Date.now() };
  saveState(state);
}

async function loop() {
  try {
    const events = await fetchBorrowEvents(state.lastBlock);
    for (const ev of events) await processBorrow(ev);
  } catch (e) {
    console.error('loop error', e);
  } finally {
    setTimeout(loop, Number(POLL_INTERVAL_MS));
  }
}

console.log('Relayer starting...');
loop();
```

> IMPORTANT: Implement `fetchBorrowEvents` using your preferred Stacks API method to read contract events and filter for `borrow-request`. Keep a robust idempotency key (e.g., concat of txid + log index) to avoid double-processing.

---

## 7) Event sourcing on Stacks (options)

You can source events via:

- Polling confirmed tx logs for your contract and parsing `print` events
- Websocket subscriptions (if available) to new confirmed events
- Indexer service (recommended for production) that stores events in a DB

Tips
- Maintain a `lastBlock` or `lastHeight` checkpoint.
- Derive an idempotency key like `{txid}:{event_index}`.
- Only process after N confirmations (see `CONFIRMATIONS`).

---

## 8) Repayment path (MVP)

- User repays on EVM: `approve(BorrowController, amount)` then off-chain repayment via controller (optional).
- Frontend (or user) calls Stacks: `signal-repay(token-id, amount)` to reduce principal.
- Collateral withdraw enabled once `get-borrowed-total(user) == 0`.

> To enforce EVM repayment proofs on Stacks, add a guardian committee or bridge/oracle later.

---

## 9) Deployment options

- PM2: `pm2 start src/index.js --name stacklend-relayer`
- systemd unit (example):

```ini
[Unit]
Description=StackLend Relayer
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/stacklend-relayer
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- Docker (optional):
  - Build a simple image with node:20-alpine
  - Mount `.env` and `relayer-state.json`

---

## 10) Security & reliability

- Use a dedicated relayer key with limited funds; rotate regularly.
- Restrict `BorrowController` to a RELAYER role.
- Enforce an allowlist of tokens in the controller (`setAllowedToken`).
- Add alerts for failures and retries with exponential backoff.
- Use per-token decimals consistently; normalize amounts across chains.
- Log the Stacks txid and EVM tx hash for each processed request.

---

## 11) Troubleshooting

- No events seen:
  - Verify `COLLATERAL_CONTRACT_ID` and the Stacks API endpoint.
  - Ensure `request-borrow` transactions are confirmed (not just mempool).
- EVM tx fails:
  - Check relayer wallet balance (Base Sepolia test ETH).
  - Confirm `allowedToken[token] == true` in the controller.
  - Ensure the `evm-recipient` is a valid 20-byte address.
- Amount mismatch:
  - Align units (USTX vs ERC20 decimals). Consider a conversion layer in the relayer.

---

## 12) Roadmap upgrades (optional)

- Add request IDs and pending/finalized states on Stacks to improve UX without a relayer trust change.
- Guardian M-of-N finalization on Stacks for EVM outcomes.
- Bridge/oracle attestation to avoid trusting the relayer for outcome truth.
- On-chain interest accrual with rate indexes if needed later.
