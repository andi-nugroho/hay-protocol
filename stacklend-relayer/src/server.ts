import express from 'express';
import pino from 'pino';
import { env } from './config.js';
import { loadState, saveState } from './state.js';
import { fetchBorrowEventsSince, fetchDepositEventsSince, type DepositEvent } from './stacks.js';
import { processBorrow } from './worker.js';
import { checkRelayerHealth } from './evm.js';

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

const app = express();
app.use(express.json());

let state = loadState();
let isProcessing = false;

// Simple deposit event processor for logging and tracking
function processDeposit(ev: DepositEvent): void {
  log.info({
    eventId: ev.id,
    user: ev.user,
    amount: ev.amount.toString(),
    balance: ev.balance.toString(),
    contractType: ev.contractType
  }, 'Deposit event detected');
}

// Add CORS for frontend integration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

app.get('/health', async (_req, res) => {
  try {
    const evmHealth = await checkRelayerHealth();
    res.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      isProcessing,
      uptime: process.uptime(),
      evm: evmHealth
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/stats', (_req, res) => {
  const recentProcessed = Object.entries(state.processed)
    .filter(([_, data]) => Date.now() - data.t < 24 * 60 * 60 * 1000) // Last 24 hours
    .length;

  res.json({ 
    lastHeight: state.lastHeight, 
    totalProcessed: Object.keys(state.processed).length,
    recentProcessed,
    isProcessing,
    nextPoll: new Date(Date.now() + Number(env.POLL_INTERVAL_MS)).toISOString()
  });
});

app.get('/events', (_req, res) => {
  const recentEvents = Object.entries(state.processed)
    .sort(([_, a], [__, b]) => b.t - a.t)
    .slice(0, 50)
    .map(([key, data]) => ({
      id: key,
      txHash: data.hash,
      timestamp: new Date(data.t).toISOString()
    }));

  res.json({ events: recentEvents });
});

// Enhanced manual trigger with better error handling
app.post('/trigger-sync', async (_req, res) => {
  if (isProcessing) {
    return res.status(429).json({ 
      ok: false, 
      error: 'Sync already in progress' 
    });
  }

  try {
    isProcessing = true;
    log.info('Manual sync triggered');
    
    const [borrowEvents, depositEvents] = await Promise.all([
      fetchBorrowEventsSince(state.lastHeight, Number(env.STACKS_CONFIRMATIONS)),
      fetchDepositEventsSince(state.lastHeight, Number(env.STACKS_CONFIRMATIONS))
    ]);
    const results: Record<string, string> = {};
    
    log.info({ 
      borrowEventCount: borrowEvents.length,
      depositEventCount: depositEvents.length 
    }, 'Found events to process');
    
    // Process deposit events (just logging for now)
    for (const ev of depositEvents) {
      const key = `deposit:${ev.id}`;
      if (!state.processed[key]) {
        processDeposit(ev);
        state.processed[key] = { hash: 'logged', t: Date.now() };
        state.lastHeight = Math.max(state.lastHeight, ev.height);
      }
    }
    
    // Process borrow events
    for (const ev of borrowEvents) {
      const key = `borrow:${ev.id}`;
      if (state.processed[key]) {
        log.debug({ eventId: ev.id }, 'Event already processed, skipping');
        continue;
      }
      
      try {
        log.info({ 
          eventId: ev.id, 
          tokenId: ev.tokenId, 
          amount: ev.amount.toString(),
          evmRecipient: ev.evmRecipient 
        }, 'Processing borrow event');
        
        const hash = await processBorrow(ev);
        state.processed[key] = { hash, t: Date.now() };
        state.lastHeight = Math.max(state.lastHeight, ev.height);
        results[key] = hash;
        
        log.info({ eventId: ev.id, txHash: hash }, 'Successfully processed borrow event');
      } catch (error: any) {
        log.error({ eventId: ev.id, error: error.message }, 'Failed to process event');
        throw error; // Re-throw to stop processing batch
      }
    }
    
    saveState(state);
    log.info({ processedCount: Object.keys(results).length }, 'Manual sync completed');
    
    res.json({ ok: true, results, processedCount: Object.keys(results).length });
  } catch (e: any) {
    log.error(e, 'Manual sync failed');
    res.status(500).json({ ok: false, error: e?.message || 'unknown' });
  } finally {
    isProcessing = false;
  }
});

export function startServer() {
  app.listen(Number(env.PORT), () => {
    log.info({ 
      port: env.PORT,
      environment: process.env.NODE_ENV || 'development',
      pollInterval: env.POLL_INTERVAL_MS + 'ms',
      stacksConfirmations: env.STACKS_CONFIRMATIONS
    }, 'StackLend relayer started');
  });
}

export async function pollLoop() {
  const interval = Number(env.POLL_INTERVAL_MS);
  const confirmations = Number(env.STACKS_CONFIRMATIONS);
  
  log.info({ interval, confirmations }, 'Starting poll loop');
  
  while (true) {
    if (!isProcessing) {
      try {
        isProcessing = true;
        const [borrowEvents, depositEvents] = await Promise.all([
          fetchBorrowEventsSince(state.lastHeight, confirmations),
          fetchDepositEventsSince(state.lastHeight, confirmations)
        ]);
        
        if (borrowEvents.length > 0 || depositEvents.length > 0) {
          log.info({ 
            borrowEventCount: borrowEvents.length,
            depositEventCount: depositEvents.length 
          }, 'Processing new events');
        }
        
        // Process deposit events (just logging for now)
        for (const ev of depositEvents) {
          const key = `deposit:${ev.id}`;
          if (!state.processed[key]) {
            processDeposit(ev);
            state.processed[key] = { hash: 'logged', t: Date.now() };
            state.lastHeight = Math.max(state.lastHeight, ev.height);
            saveState(state);
          }
        }
        
        // Process borrow events
        for (const ev of borrowEvents) {
          const key = `borrow:${ev.id}`;
          if (state.processed[key]) continue;
          
          try {
            log.info({ 
              eventId: ev.id, 
              tokenId: ev.tokenId, 
              amount: ev.amount.toString(),
              evmRecipient: ev.evmRecipient 
            }, 'Processing borrow event');
            
            const hash = await processBorrow(ev);
            state.processed[key] = { hash, t: Date.now() };
            state.lastHeight = Math.max(state.lastHeight, ev.height);
            saveState(state);
            
            log.info({ eventId: ev.id, txHash: hash }, 'Successfully processed borrow event');
          } catch (error: any) {
            log.error({ eventId: ev.id, error: error.message }, 'Failed to process event');
            // Continue processing other events instead of stopping
          }
        }
      } catch (e: any) {
        log.error(e, 'Poll loop error');
      } finally {
        isProcessing = false;
      }
    }
    
    await new Promise(r => setTimeout(r, interval));
  }
}