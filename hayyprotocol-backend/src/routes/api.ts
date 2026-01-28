import { Hono } from 'hono';
import { SuiClient } from '@mysten/sui.js/client';
import fs from 'fs/promises';
import { config } from '../config.js';
import pino from 'pino';

const logger = pino({ level: config.LOG_LEVEL });

// Initialize Sui client
const suiClient = new SuiClient({ url: config.SUI_RPC_URL });

// In-memory cache for recently registered collaterals
// Format: { stacksAddress: { timestamp, suiTxDigest, amount } }
const recentRegistrations = new Map<string, { 
  timestamp: number; 
  suiTxDigest: string; 
  amount: number;
  suiAddress: string;
}>();

// Clear old registrations after 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of recentRegistrations.entries()) {
    if (value.timestamp < fiveMinutesAgo) {
      recentRegistrations.delete(key);
    }
  }
}, 60 * 1000); // Check every minute

// Types
interface AddressMappings {
  [stacksAddress: string]: string;
}

interface RelayerState {
  addressMappings: AddressMappings;
  [key: string]: any;
}

interface Position {
  suiAddress: string;
  stxCollateral: number;
  sbtcCollateral: number;
  usdcBorrowed: number;
  isLiquidatable: boolean;
  borrowPower: number;
  objectId: string;
}

// Helper functions
async function getRelayerState(): Promise<RelayerState> {
  try {
    const data = await fs.readFile(config.STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logger.error({ error }, 'Error reading relayer state');
    return { addressMappings: {} };
  }
}

async function saveRelayerState(state: RelayerState): Promise<void> {
  try {
    await fs.writeFile(config.STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    logger.error({ error }, 'Error saving relayer state');
  }
}

// Export function to mark recent registration (called by relayer)
export function markRecentRegistration(
  stacksAddress: string, 
  suiAddress: string,
  amount: number, 
  suiTxDigest: string
): void {
  recentRegistrations.set(stacksAddress, {
    timestamp: Date.now(),
    suiTxDigest,
    amount,
    suiAddress
  });
  logger.info({ stacksAddress, suiTxDigest }, 'Marked recent registration in cache');
}

async function getStacksAddressFromSui(suiAddress: string): Promise<string | null> {
  const state = await getRelayerState();
  
  for (const [stacksAddr, mappedSuiAddr] of Object.entries(state.addressMappings)) {
    if (mappedSuiAddr === suiAddress) {
      return stacksAddr;
    }
  }
  
  return null;
}

async function fetchPositionFromSui(suiAddress: string): Promise<Position | null> {
  try {
    // Get the registry object to access its dynamic fields
    const registryObject = await suiClient.getObject({
      id: config.SUI_BORROW_REGISTRY_ID,
      options: { showContent: true }
    });

    if (!registryObject.data?.content || registryObject.data.content.dataType !== 'moveObject') {
      logger.debug('Registry object not found or invalid');
      return null;
    }

    const registryFields = (registryObject.data.content as any).fields;
    
    // Get dynamic fields parent ID
    const parentId = registryFields.id?.id;
    if (!parentId) {
      logger.debug('No parent ID found in registry');
      return null;
    }

    // Find user's position in dynamic fields
    const dynamicFields = await suiClient.getDynamicFields({
      parentId: parentId
    });

    const userField = dynamicFields.data.find(field => {
      if (field.name && typeof field.name === 'object' && 'value' in field.name) {
        return field.name.value === suiAddress;
      }
      return false;
    });

    if (!userField?.objectId) {
      logger.debug({ suiAddress }, 'No position found for user');
      return null;
    }

    // Get the position object
    const userPosition = await suiClient.getObject({
      id: userField.objectId,
      options: { showContent: true }
    });

    if (!userPosition.data?.content || userPosition.data.content.dataType !== 'moveObject') {
      logger.debug('Position object invalid');
      return null;
    }

    // Access fields correctly: fields.value.fields (nested structure)
    const positionContent = (userPosition.data.content as any).fields;
    const positionFields = positionContent.value?.fields || positionContent.fields;
    
    logger.debug({ positionFields }, 'Position fields retrieved');
    
    // Parse fields with proper decimal conversion
    const stxCollateral = parseInt(positionFields.stx_collateral_stacks || '0') / 1000000; // 6 decimals
    const sbtcCollateral = parseInt(positionFields.sbtc_collateral_sui || positionFields.sbtc_collateral_stacks || '0') / 100000000; // 8 decimals
    const usdcBorrowed = parseInt(positionFields.usdc_borrowed || '0') / 1000000; // 6 decimals
    
    return {
      suiAddress,
      stxCollateral,
      sbtcCollateral,
      usdcBorrowed,
      isLiquidatable: positionFields.is_liquidatable || false,
      borrowPower: stxCollateral * 0.7, // 70% LTV
      objectId: userField.objectId
    };
  } catch (error) {
    logger.error({ error, suiAddress }, 'Error fetching position from Sui');
    return null;
  }
}

export function setupAPIRoutes(app: Hono) {
  // Health check endpoint
  app.get('/api/health', (c) => {
    return c.json({
      success: true,
      message: 'HayyProtocol API is running',
      timestamp: new Date().toISOString()
    });
  });

  // Get position by Sui address
  app.get('/api/position/:address', async (c) => {
    try {
      const address = c.req.param('address');
      
      if (!address) {
        return c.json({ success: false, message: 'Address required' }, 400);
      }

      logger.info({ address }, 'Trying API lookup for address');

      const position = await fetchPositionFromSui(address);
      
      if (position) {
        logger.info({ position }, 'Found position via API');
        return c.json({
          success: true,
          position
        });
      } else {
        return c.json({
          success: false,
          message: 'Position not found'
        }, 404);
      }
    } catch (error) {
      logger.error({ error }, 'Position lookup error');
      return c.json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  // Withdraw STX collateral
  app.post('/api/withdraw', async (c) => {
    try {
      const body = await c.req.json();
      const { suiAddress, amount } = body;

      if (!suiAddress || !amount) {
        return c.json({
          success: false,
          message: 'Missing required fields: suiAddress, amount'
        }, 400);
      }

      const amountStx = parseFloat(amount);
      if (amountStx <= 0) {
        return c.json({
          success: false,
          message: 'Amount must be greater than 0'
        }, 400);
      }

      // Get position
      const position = await fetchPositionFromSui(suiAddress);
      if (!position) {
        return c.json({
          success: false,
          message: 'Position not found'
        }, 404);
      }

      // Check if user has enough collateral
      if (position.stxCollateral < amountStx) {
        return c.json({
          success: false,
          message: `Insufficient collateral. Available: ${position.stxCollateral} STX`
        }, 400);
      }

      // Check if withdrawal would leave position healthy (if user has debt)
      if (position.usdcBorrowed > 0) {
        const remainingCollateral = position.stxCollateral - amountStx;
        const maxDebtAfterWithdrawal = remainingCollateral * 2.0 * 0.6; // STX price * LTV
        
        if (position.usdcBorrowed > maxDebtAfterWithdrawal) {
          return c.json({
            success: false,
            message: 'Cannot withdraw: would under-collateralize position. Please repay debt first.'
          }, 400);
        }
      }

      // Get Stacks address mapping
      const stacksAddress = await getStacksAddressFromSui(suiAddress);
      if (!stacksAddress) {
        return c.json({
          success: false,
          message: 'Stacks address mapping not found'
        }, 404);
      }

      // Import unlock functions
      const { unlockStacksCollateral } = await import('../suiClient.js');
      const { unlockStacksCollateralOnChain } = await import('../stacksUnlocker.js');

      // 1. Unlock on Sui first
      console.log(`🔓 Unlocking ${amountStx} STX on Sui for ${suiAddress}`);
      const suiTx = await unlockStacksCollateral(suiAddress, amountStx * 1000000);

      // 2. Unlock on Stacks (with fallback for insufficient funds)
      console.log(`🔓 Unlocking ${amountStx} STX on Stacks for ${stacksAddress}`);
      let stacksTx = null;
      let stacksWarning = null;
      
      try {
        stacksTx = await unlockStacksCollateralOnChain(stacksAddress, amountStx * 1000000);
      } catch (error) {
        console.error('Stacks unlock failed:', error instanceof Error ? error.message : error);
        if (error instanceof Error && error.message.includes('NotEnoughFunds')) {
          stacksWarning = 'Stacks unlock skipped: insufficient relayer funds. STX unlocked on Sui only.';
        } else {
          // Re-throw non-funds errors
          throw error;
        }
      }

      return c.json({
        success: true,
        message: 'Withdrawal successful',
        warning: stacksWarning,
        suiAddress,
        stacksAddress,
        amount: amountStx,
        transactions: {
          sui: suiTx.digest,
          stacks: stacksTx
        }
      });

    } catch (error) {
      logger.error({ error }, 'Withdraw error');
      return c.json({
        success: false,
        message: 'Withdrawal failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  // Manual trigger for indexer refresh
  app.post('/api/indexer/refresh', async (c) => {
    try {
      logger.info('Manual indexer refresh triggered');
      
      // Import and trigger relayer refresh
      const { triggerStacksMonitorRefresh } = await import('../stacksMonitor.js');
      await triggerStacksMonitorRefresh();
      
      return c.json({
        success: true,
        message: 'Indexer refresh triggered successfully'
      });
    } catch (error) {
      logger.error({ error }, 'Indexer refresh error');
      return c.json({
        success: false,
        message: 'Indexer refresh failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  // Get relayer state
  app.get('/api/state', async (c) => {
    try {
      const state = await getRelayerState();
      return c.json({
        success: true,
        state
      });
    } catch (error) {
      logger.error({ error }, 'Get state error');
      return c.json({
        success: false,
        message: 'Failed to get state',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  // Lookup collateral by Stacks address
  app.get('/api/lookup/:stacksAddress', async (c) => {
    const stacksAddress = c.req.param('stacksAddress');
    
    try {
      const state = await getRelayerState();
      const suiAddress = state.addressMappings[stacksAddress];
      
      if (!suiAddress) {
        return c.json({
          success: false,
          message: 'No Sui address mapped for this Stacks address',
          stacksAddress
        }, 404);
      }

      const position = await fetchPositionFromSui(suiAddress);
      
      if (!position) {
        return c.json({
          success: false,
          message: 'No collateral position found',
          stacksAddress,
          suiAddress
        }, 404);
      }

      return c.json({
        success: true,
        stacksAddress,
        position
      });
    } catch (error) {
      logger.error({ error }, 'Lookup error');
      return c.json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  // Suggest correct address for user (reverse lookup + suggestions)
  app.get('/api/suggest/:suiAddress', async (c) => {
    const suiAddress = c.req.param('suiAddress');

    try {
      // Check if current address has position
      const currentPosition = await fetchPositionFromSui(suiAddress);

      if (currentPosition) {
        return c.json({
          success: true,
          message: 'Current address already has collateral',
          currentAddress: suiAddress,
          position: currentPosition,
          suggestions: [] // No suggestions needed
        });
      }

      // IMPORTANT: Don't suggest other users' addresses
      // Only return empty suggestions since we don't want to expose all positions
      return c.json({
        success: true,
        message: 'No collateral found at current address',
        currentAddress: suiAddress,
        suggestions: [] // Don't expose other users' positions
      });
    } catch (error) {
      logger.error({ error }, 'Suggest error');
      return c.json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  // Check collateral registration status for Stacks address
  app.get('/api/collateral-status/:stacksAddress', async (c) => {
    const stacksAddress = c.req.param('stacksAddress');
    
    try {
      // Validate Stacks address format
      if (!stacksAddress || !stacksAddress.startsWith('S')) {
        return c.json({
          status: 'invalid',
          message: 'Invalid Stacks address format'
        }, 400);
      }

      // ⚡ QUICK CHECK: Recently registered? Fetch actual position from Sui!
      const recentReg = recentRegistrations.get(stacksAddress);
      if (recentReg) {
        const age = Date.now() - recentReg.timestamp;
        logger.info({ stacksAddress, age, txDigest: recentReg.suiTxDigest }, 'Found recent registration in cache!');
        
        // Fetch ACTUAL position from Sui instead of using cached deposit amount
        const position = await fetchPositionFromSui(recentReg.suiAddress);
        if (position && position.stxCollateral > 0) {
          return c.json({
            status: 'registered',
            message: 'Collateral successfully registered! You can now borrow.',
            stacksAddress,
            suiAddress: recentReg.suiAddress,
            collateral: {
              stxAmount: position.stxCollateral, // Use TOTAL collateral, not deposit amount
              borrowPower: position.borrowPower,
              objectId: position.objectId
            }
          });
        }
        // If position not found yet, fallthrough to normal check
      }

      const state = await getRelayerState();
      
      // Check if Sui address is mapped
      const suiAddress = state.addressMappings[stacksAddress];
      
      if (!suiAddress) {
        return c.json({
          status: 'pending',
          message: 'Waiting for deposit transaction to be detected...',
          stacksAddress,
          estimatedTime: '10-30 seconds'
        });
      }

      // Check if collateral is registered on Sui
      logger.info({ suiAddress, stacksAddress }, 'Checking position on Sui for collateral status');
      const position = await fetchPositionFromSui(suiAddress);
      logger.info({ position, hasPosition: !!position }, 'Position fetch result');
      
      if (position && position.stxCollateral > 0) {
        logger.info({ stxAmount: position.stxCollateral }, 'Collateral registered! Returning success');
        return c.json({
          status: 'registered',
          message: 'Collateral successfully registered! You can now borrow.',
          stacksAddress,
          suiAddress,
          collateral: {
            stxAmount: position.stxCollateral,
            borrowPower: position.borrowPower,
            objectId: position.objectId
          }
        });
      } else {
        // Sui address mapped but not yet registered
        return c.json({
          status: 'pending',
          message: 'Registering collateral on Sui blockchain...',
          stacksAddress,
          suiAddress: suiAddress.substring(0, 20) + '...' + suiAddress.slice(-10),
          estimatedTime: '15-45 seconds'
        });
      }

    } catch (error) {
      logger.error({ error }, 'Collateral status check error');
      return c.json({
        status: 'error',
        message: 'Failed to check collateral status',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });
}