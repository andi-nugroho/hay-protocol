import pino from 'pino';
import { config, POLL_INTERVAL_MS, PRICE_UPDATE_INTERVAL_MS } from './config.js';
import { loadState, saveState, isEventProcessed, markEventProcessed, RelayerState, addAddressMapping, getSuiAddressForStacks } from './state.js';
import { fetchCollateralEventsSince, StacksCollateralEvent } from './stacksMonitor.js';
import { registerStacksCollateral, hasOutstandingDebt } from './suiClient.js';
import { fetchPrices, calculateStxValue, calculateBorrowingPower } from './priceOracle.js';
import { unlockStacksCollateralOnChain } from './stacksUnlocker.js';

const logger = pino({ level: config.LOG_LEVEL });

let state: RelayerState;
let pollInterval: NodeJS.Timeout | null = null;
let priceInterval: NodeJS.Timeout | null = null;

/**
 * Initialize relayer state
 */
export function initializeRelayer(): void {
  state = loadState();
  console.log(`✅ Relayer initialized (Last block: ${state.lastStacksBlock})\n`);
}

/**
 * Handle collateral deposit event
 */
async function handleDepositEvent(event: StacksCollateralEvent): Promise<void> {
  const eventId = event.id;

  if (isEventProcessed(state, eventId)) {
    console.log(`⚠️  Event ${eventId} already processed, skipping`);
    return;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📥 Processing Deposit`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`TX: ${event.txId.substring(0, 20)}...`);
  console.log(`User: ${event.user}`);
  console.log(`Amount: ${(event.amount / 1_000_000).toFixed(2)} STX`);

  try {
    // CRITICAL FIX: Require Sui address from event (contract v3 always provides it)
    if (!event.suiAddress) {
      throw new Error(`❌ No Sui address in event! User must provide Sui address when depositing. Event: ${event.txId}`);
    }

    const suiAddress = event.suiAddress;
    console.log(`🎯 Sui Address from Event: ${suiAddress.substring(0, 20)}...${suiAddress.slice(-10)}`);

    // SAVE DYNAMIC ADDRESS MAPPING for future withdrawals
    addAddressMapping(state, event.user, suiAddress);

    // Get STX price
    const stxPrice = state.priceCache.stxUsd;
    if (!stxPrice || stxPrice === 0) {
      throw new Error('STX price not available');
    }

    // Calculate USD value
    const valueUsd = calculateStxValue(event.amount, stxPrice);
    const borrowingPower = calculateBorrowingPower(valueUsd);

    console.log(`💰 Value: $${valueUsd.toFixed(2)} USD (STX @ $${stxPrice})`);
    console.log(`🔓 Borrow Power: $${borrowingPower.toFixed(2)} USD`);
    console.log(`🔗 Sui Address: ${suiAddress.substring(0, 20)}...`);

    const suiTx = await registerStacksCollateral(
      suiAddress,
      event.amount,
      valueUsd
    );

    // 🚀 IMMEDIATELY notify API cache that registration is done!
    const { markRecentRegistration } = await import('./routes/api.js');
    markRecentRegistration(event.user, suiAddress, event.amount, suiTx.digest);

    // Mark as processed
    markEventProcessed(state, eventId, event.txId, suiTx.digest);

    // Update last processed block
    if (event.blockHeight > state.lastStacksBlock) {
      state.lastStacksBlock = event.blockHeight;
      saveState(state);
    }

    console.log(`✅ Sui TX: ${suiTx.digest}`);
    console.log(`${'─'.repeat(60)}\n`);
  } catch (error) {
    console.log(`❌ ERROR: ${(error as Error).message}`);
    console.log(`${'─'.repeat(60)}\n`);
    markEventProcessed(state, eventId, event.txId, undefined, (error as Error).message);
    throw error;
  }
}

/**
 * Handle withdrawal request event
 */
async function handleWithdrawRequestEvent(event: StacksCollateralEvent): Promise<void> {
  const eventId = event.id;

  if (isEventProcessed(state, eventId)) {
    console.log(`⚠️  Withdraw event ${eventId} already processed, skipping`);
    logger.debug({ eventId }, 'Event already processed, skipping');
    return;
  }

  logger.info({ event }, 'Processing withdrawal request');

  try {
    // Get Sui address from dynamic mapping (learned from previous deposits)
    const suiAddress = getSuiAddressForStacks(state, event.user);
    
    if (!suiAddress) {
      throw new Error(`❌ No Sui address mapping found for ${event.user}. User must deposit STX with Sui address first.`);
    }

    console.log(`🎯 Found Sui Address: ${suiAddress.substring(0, 20)}...${suiAddress.slice(-10)}`);

    // Check if user has outstanding debt on Sui
    const hasDebt = await hasOutstandingDebt(suiAddress);

    if (hasDebt) {
      logger.warn(
        { user: event.user, suiAddress },
        'User has outstanding debt, cannot process withdrawal'
      );

      // Mark as processed but with error
      markEventProcessed(
        state,
        eventId,
        event.txId,
        undefined,
        'User has outstanding debt'
      );
      return;
    }

    logger.info(
      { user: event.user, amount: event.amount },
      'No debt found, proceeding with unlock'
    );

    // Unlock collateral on Stacks
    const stacksTx = await unlockStacksCollateralOnChain(
      event.user,
      event.amount
    );

    // Mark as processed
    markEventProcessed(state, eventId, event.txId, stacksTx);

    // Update last processed block
    if (event.blockHeight > state.lastStacksBlock) {
      state.lastStacksBlock = event.blockHeight;
      saveState(state);
    }

    logger.info(
      {
        stacksUnlockTx: stacksTx,
        user: event.user,
        amount: event.amount,
      },
      'Withdrawal processed successfully'
    );
  } catch (error) {
    logger.error({ error, event }, 'Failed to process withdrawal');
    markEventProcessed(state, eventId, event.txId, undefined, (error as Error).message);
    throw error;
  }
}

/**
 * Process all pending events
 */
async function processEvents(): Promise<void> {
  try {
    // Fetch events since last processed block
    const events = await fetchCollateralEventsSince(state.lastStacksBlock);

    if (events.length === 0) {
      return;
    }

    console.log(`\n🔍 Found ${events.length} event(s) to process...`);

    // Process events sequentially
    for (const event of events) {
      try {
        if (event.eventType === 'deposit') {
          await handleDepositEvent(event);
        } else if (event.eventType === 'withdraw-request') {
          await handleWithdrawRequestEvent(event);
        }

        // Small delay between events to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        // Continue processing other events even if one fails
      }
    }
  } catch (error) {
    console.log(`❌ Error fetching events: ${(error as Error).message}`);
  }
}

/**
 * Update price cache
 */
async function updatePriceCache(): Promise<void> {
  try {
    const prices = await fetchPrices();
    state.priceCache = {
      stxUsd: prices.stxUsd,
      sbtcUsd: prices.sbtcUsd,
      lastUpdate: Date.now(),
    };
    saveState(state);

    console.log(`💵 Prices updated: STX=$${prices.stxUsd}, sBTC=$${prices.sbtcUsd}`);
  } catch (error) {
    // Silent fail, use cached prices
  }
}

/**
 * Main relayer loop
 */
export async function startRelayer(): Promise<void> {
  console.log('⏳ Updating price cache...');

  // Initialize price cache
  await updatePriceCache();

  // Set up price update interval
  setInterval(updatePriceCache, PRICE_UPDATE_INTERVAL_MS);

  console.log(`🔄 Polling every ${POLL_INTERVAL_MS/1000}s for new events...\n`);

  // Main event processing loop
  while (true) {
    try {
      await processEvents();
    } catch (error) {
      console.log(`❌ Error in relayer loop: ${(error as Error).message}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Setup and start the relayer as background service
 */
export function setupRelayer(): () => void {
  logger.info('🚀 Starting HayyProtocol Relayer');
  
  // Initialize state
  state = loadState();
  logger.info({ lastBlock: state.lastStacksBlock }, 'Relayer initialized');

  // Start polling
  pollInterval = setInterval(async () => {
    try {
      await processEvents();
    } catch (error) {
      logger.error({ error }, 'Error in relayer loop');
    }
  }, POLL_INTERVAL_MS);

  // Start price updates
  priceInterval = setInterval(async () => {
    try {
      await fetchPrices();
    } catch (error) {
      logger.error({ error }, 'Error updating prices');
    }
  }, PRICE_UPDATE_INTERVAL_MS);

  logger.info('✅ Relayer background services started');

  // Return cleanup function
  return () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (priceInterval) {
      clearInterval(priceInterval);
      priceInterval = null;
    }
    logger.info('🛑 Relayer background services stopped');
  };
}
