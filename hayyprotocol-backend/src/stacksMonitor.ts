import fetch from 'cross-fetch';
import { config, STACKS_CONFIRMATIONS } from './config.js';
import pino from 'pino';

const logger = pino({ level: config.LOG_LEVEL });

export interface StacksCollateralEvent {
  eventType: 'deposit' | 'withdraw-request';
  id: string; // Unique event ID: `${txId}:${eventIndex}`
  txId: string;
  blockHeight: number;
  user: string; // Stacks principal
  amount: number; // in microSTX
  suiAddress?: string; // Sui address (0x...) - optional for backward compatibility
  timestamp: number;
}

interface StacksTxSummary {
  tx_id: string;
  block_height: number;
  tx_status: 'success' | string;
  tx_type: string;
  contract_call?: {
    contract_id: string;
    function_name: string;
  };
  sender_address: string;
}

interface StacksTxDetails {
  tx_id: string;
  block_height: number;
  tx_status: string;
  events: Array<{
    event_index: number;
    event_type: string;
    contract_log?: {
      value: {
        repr: string;
      };
    };
  }>;
}

/**
 * Get current Stacks chain tip height
 */
async function getTipHeight(): Promise<number> {
  const response = await fetch(`${config.STACKS_API_URL}/v2/info`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Stacks tip: ${response.status}`);
  }
  const data = await response.json();
  return data.stacks_tip_height || data.burn_block_height || 0;
}

/**
 * Fetch transactions for the collateral contract
 */
async function fetchContractTransactions(
  contractId: string,
  limit = 50,
  offset = 0
): Promise<StacksTxSummary[]> {
  // Fetch transactions TO the contract
  // unanchored=true allows fetching pending transactions for faster detection
  const url = `${config.STACKS_API_URL}/extended/v1/address/${contractId}/transactions?limit=${limit}&offset=${offset}&unanchored=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Fetch detailed transaction data including events
 */
async function fetchTransactionDetails(txId: string): Promise<StacksTxDetails> {
  const url = `${config.STACKS_API_URL}/extended/v1/tx/${txId}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch tx details: ${response.status}`);
  }

  return await response.json();
}

/**
 * Parse collateral-deposited event from print repr
 */
function parseDepositEvent(repr: string, txId: string, blockHeight: number, sender: string): StacksCollateralEvent | null {
  if (!repr.includes('collateral-deposited')) {
    return null;
  }

  // Extract amount: look for "(amount u<number>)" in Clarity tuple format
  const amountMatch = repr.match(/\(amount\s+u(\d+)\)/);
  if (!amountMatch) {
    logger.warn({ repr }, 'Could not parse amount from deposit event');
    return null;
  }

  const amount = parseInt(amountMatch[1]);

  // Extract user: look for "(user '<address>)" in Clarity tuple format
  const userMatch = repr.match(/\(user\s+'([A-Z0-9]+)\)/);
  const user = userMatch?.[1] || sender;

  // Extract Sui address: look for "(sui-address "0x...")" in Clarity tuple format
  const suiAddressMatch = repr.match(/\(sui-address\s+"(0x[a-fA-F0-9]{64})"\)/);
  const suiAddress = suiAddressMatch?.[1];

  if (!suiAddress) {
    logger.warn({ repr, user }, 'No Sui address found in deposit event');
  }

  return {
    eventType: 'deposit',
    id: `${txId}:deposit`,
    txId,
    blockHeight,
    user,
    amount,
    suiAddress,
    timestamp: Date.now(),
  };
}

/**
 * Parse withdraw-requested event from print repr
 */
function parseWithdrawEvent(repr: string, txId: string, blockHeight: number, sender: string): StacksCollateralEvent | null {
  if (!repr.includes('withdraw-requested')) {
    return null;
  }

  // Extract amount: look for "(amount u<number>)" in Clarity tuple format
  const amountMatch = repr.match(/\(amount\s+u(\d+)\)/);
  if (!amountMatch) {
    logger.warn({ repr }, 'Could not parse amount from withdraw event');
    return null;
  }

  const amount = parseInt(amountMatch[1]);

  // Extract user: look for "(user '<address>)" in Clarity tuple format
  const userMatch = repr.match(/\(user\s+'([A-Z0-9]+)\)/);
  const user = userMatch?.[1] || sender;

  return {
    eventType: 'withdraw-request',
    id: `${txId}:withdraw`,
    txId,
    blockHeight,
    user,
    amount,
    timestamp: Date.now(),
  };
}

/**
 * Fetch collateral events since a given block height
 */
export async function fetchCollateralEventsSince(
  sinceHeight: number
): Promise<StacksCollateralEvent[]> {
  const events: StacksCollateralEvent[] = [];
  const tipHeight = await getTipHeight();
  const confirmedHeight = tipHeight - STACKS_CONFIRMATIONS;

  logger.debug({ sinceHeight, tipHeight, confirmedHeight }, 'Fetching Stacks events');

  let offset = 0;
  const pageSize = 50;

  while (offset < 200) { // Safety limit
    const transactions = await fetchContractTransactions(
      config.STACKS_COLLATERAL_CONTRACT,
      pageSize,
      offset
    );

    if (transactions.length === 0) {
      break;
    }

    for (const tx of transactions) {
      // Only process confirmed successful transactions
      if (tx.tx_status !== 'success') continue;
      if (!tx.block_height || tx.block_height <= sinceHeight) continue;
      if (tx.block_height > confirmedHeight) continue;

      // Only process contract calls to our collateral contract
      if (tx.tx_type !== 'contract_call') continue;
      if (tx.contract_call?.contract_id !== config.STACKS_COLLATERAL_CONTRACT) continue;

      // Fetch transaction details to get events
      let details: StacksTxDetails;
      try {
        details = await fetchTransactionDetails(tx.tx_id);
      } catch (error) {
        // Skip transactions that can't be fetched (old txs, API issues, etc)
        logger.debug({ txId: tx.tx_id, blockHeight: tx.block_height, error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch tx details, skipping');
        continue;
      }

      for (const event of details.events || []) {
        if (!event.contract_log?.value?.repr) continue;

        const repr = event.contract_log.value.repr;

        // Try parsing as deposit event
        const depositEvent = parseDepositEvent(repr, tx.tx_id, tx.block_height, tx.sender_address);
        if (depositEvent) {
          events.push(depositEvent);
          continue;
        }

        // Try parsing as withdraw event
        const withdrawEvent = parseWithdrawEvent(repr, tx.tx_id, tx.block_height, tx.sender_address);
        if (withdrawEvent) {
          events.push(withdrawEvent);
        }
      }
    }

    // Check if we've gone past the target height
    const oldestBlockInPage = transactions[transactions.length - 1]?.block_height || 0;
    if (oldestBlockInPage <= sinceHeight) {
      break;
    }

    offset += pageSize;
  }

  // Sort by block height, then by txId for deterministic processing
  events.sort((a, b) => {
    if (a.blockHeight !== b.blockHeight) {
      return a.blockHeight - b.blockHeight;
    }
    return a.txId.localeCompare(b.txId);
  });

  logger.info({ count: events.length }, 'Fetched Stacks collateral events');
  return events;
}

/**
 * Manual trigger for indexer refresh
 */
export async function triggerStacksMonitorRefresh(): Promise<void> {
  logger.info('Manual Stacks monitor refresh triggered');
  
  try {
    // Get latest block height
    const response = await fetch(`${config.STACKS_API_URL}/extended/v1/block?limit=1`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const latestHeight = data.results[0]?.height || 0;
    
    // Fetch events from a reasonable lookback (e.g., last 100 blocks)
    const lookbackBlocks = 100;
    const fromHeight = Math.max(0, latestHeight - lookbackBlocks);
    
    logger.info({ fromHeight, latestHeight }, 'Refreshing Stacks events');
    
    const events = await fetchCollateralEventsSince(fromHeight);
    
    logger.info({ 
      eventsFound: events.length,
      fromHeight,
      latestHeight 
    }, 'Manual refresh completed');
    
  } catch (error) {
    logger.error({ error }, 'Failed to refresh Stacks monitor');
    throw error;
  }
}
