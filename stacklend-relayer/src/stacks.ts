import fetch from 'cross-fetch';
import { env } from './config.js';

const logger = {
  warn: (msg: string) => console.warn(`[STACKS] ${msg}`),
  info: (msg: string) => console.info(`[STACKS] ${msg}`),
};

export type BorrowEvent = {
  id: string;            // idempotency key: txid:index
  txid: string;
  height: number;
  user: string;          // Stacks principal
  tokenId: string;       // e.g., 'USDC'
  amount: bigint;        // normalize to ERC20 base units externally if needed
  evmRecipient: `0x${string}` | null; // 20-byte recipient (hex)
};

export type DepositEvent = {
  id: string;            // idempotency key: txid:index
  txid: string;
  height: number;
  user: string;          // Stacks principal
  amount: bigint;        // STX amount in microSTX
  balance: bigint;       // new balance after deposit
  contractType: 'collateral' | 'lending'; // which contract the deposit was made to
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
    ...(getStr('user') && { user: getStr('user') }),
  };
}

function parseDepositPrintRepr(repr?: string): null | { event: string; amount: bigint; balance: bigint; user?: string } {
  if (!repr) return null;
  // Expect a tuple-like repr: (tuple (amount u1) (balance u1) (event "deposit") (user 'PRINCIPAL))
  if (!repr.includes('"deposit"')) return null;
  const getUint = (key: string) => {
    // Look for (amount u123) or (balance u456) patterns
    const m = repr.match(new RegExp(`\\(${key}[^\\)]*u(\\d+)\\)`));
    return m?.[1] ? BigInt(m[1]) : 0n;
  };
  const getUser = () => {
    // Look for (user 'PRINCIPAL) pattern
    const m = repr.match(/\(user\s+'([A-Z0-9]{26,41}(?:\.[a-zA-Z]([a-zA-Z0-9]|[-_])*)*)\)/);
    return m?.[1] ?? '';
  };
  return {
    event: 'deposit',
    amount: getUint('amount'),
    balance: getUint('balance'),
    user: getUser(),
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
  const r = await fetch(`${env.STACKS_API_URL}/extended/v1/tx/${txid}`);
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

export async function fetchDepositEventsSince(height: number, confirmations = 1): Promise<DepositEvent[]> {
  const tip = await getTipHeight();
  const minConfirmed = tip - confirmations;
  const out: DepositEvent[] = [];

  // Fetch from both collateral and lending contracts
  const lendingContractId = env.COLLATERAL_CONTRACT_ID.replace('.collateral-v1', '.lending-v1');
  const contractIds = [env.COLLATERAL_CONTRACT_ID, lendingContractId];

  for (const contractId of contractIds) {
    const contractType = contractId.includes('.collateral-v1') ? 'collateral' : 'lending';
    // Page through recent transactions for each contract address
    let offset = 0;
    const pageSize = 50;
    while (true) {
      const url = `${env.STACKS_API_URL}/extended/v1/address/${encodeURIComponent(contractId)}/transactions?limit=${pageSize}&offset=${offset}&unanchored=false`;
      const r = await fetch(url);
      if (!r.ok) {
        logger.warn(`Failed to fetch deposit events for ${contractId}: ${r.status}`);
        break;
      }
      const j = await r.json();
      const txs = (j?.results ?? []) as TxSummary[];
      
      if (txs.length === 0) break;

      for (const t of txs) {
        // Only confirmed successful contract calls
        if (t.tx_status !== 'success') continue;
        if (t.block_height == null || t.block_height <= height) continue;
        if (t.block_height > minConfirmed) continue; // wait required confirmations

        // Ensure it is a call that touches this contract (defensive)
        if (t.tx_type !== 'contract_call') continue;
        if (t.contract_call && t.contract_call.contract_id !== contractId) continue;

        const det = await getTx(t.tx_id);
        det.events?.forEach((ev, idx) => {
          const repr = ev.print_event?.value?.repr ?? ev.contract_log?.value?.repr;
          const parsed = parseDepositPrintRepr(repr);
          if (!parsed) return;
          const user = parsed.user || t.sender_address;
          out.push({
            id: `${t.tx_id}:${idx}`,
            txid: t.tx_id,
            height: det.block_height ?? t.block_height,
            user,
            amount: parsed.amount,
            balance: parsed.balance,
            contractType,
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
  }

  // Sort by height then txid:index for stable processing
  out.sort((a, b) => (a.height - b.height) || a.id.localeCompare(b.id));
  return out;
}