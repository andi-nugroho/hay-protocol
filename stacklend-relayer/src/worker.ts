import { borrow } from './evm.js';
import { tokenMap } from './config.js';
import type { BorrowEvent } from './stacks.js';
import pino from 'pino';

const log = pino({ 
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
});

export async function processBorrow(ev: BorrowEvent): Promise<string> {
  log.info({ 
    eventId: ev.id,
    tokenId: ev.tokenId,
    amount: ev.amount.toString(),
    evmRecipient: ev.evmRecipient,
    user: ev.user
  }, 'Starting borrow processing');

  // Validate token mapping
  const token = tokenMap[ev.tokenId];
  if (!token) {
    const error = `Unknown token-id: ${ev.tokenId}. Available tokens: ${Object.keys(tokenMap).join(', ')}`;
    log.error({ tokenId: ev.tokenId, availableTokens: Object.keys(tokenMap) }, error);
    throw new Error(error);
  }

  // Validate EVM recipient
  if (!ev.evmRecipient) {
    const error = 'Missing EVM recipient address';
    log.error({ eventId: ev.id }, error);
    throw new Error(error);
  }

  // Validate amount
  if (ev.amount <= 0n) {
    const error = `Invalid amount: ${ev.amount}`;
    log.error({ eventId: ev.id, amount: ev.amount.toString() }, error);
    throw new Error(error);
  }

  try {
    log.info({ 
      tokenAddress: token,
      recipient: ev.evmRecipient,
      amount: ev.amount.toString()
    }, 'Executing EVM borrow transaction');

    // Execute the borrow transaction
    const hash = await borrow(token, ev.evmRecipient, ev.amount);
    
    log.info({ 
      eventId: ev.id,
      txHash: hash,
      tokenAddress: token,
      recipient: ev.evmRecipient,
      amount: ev.amount.toString()
    }, 'Borrow transaction submitted successfully');

    return hash;
  } catch (error: any) {
    log.error({ 
      eventId: ev.id,
      error: error.message,
      tokenAddress: token,
      recipient: ev.evmRecipient,
      amount: ev.amount.toString()
    }, 'Failed to execute borrow transaction');
    
    // Re-throw with more context
    throw new Error(`Failed to execute borrow for event ${ev.id}: ${error.message}`);
  }
}