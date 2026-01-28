import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  principalCV,
} from '@stacks/transactions';
import { StacksTestnet, StacksMainnet } from '@stacks/network';
import { config } from './config.js';
import pino from 'pino';

const logger = pino({ level: config.LOG_LEVEL });

const network = config.STACKS_NETWORK === 'mainnet'
  ? new StacksMainnet()
  : new StacksTestnet();

/**
 * Check if relayer has sufficient STX balance for fees
 */
async function checkRelayerBalance(): Promise<void> {
  try {
    const relayerAddress = 'ST1WVZNYKMK1MS2V2B728ZWJ2C76TAN49C6HSY7JF'; // Extract from private key if needed
    const response = await fetch(`${config.STACKS_API_URL}/extended/v1/address/${relayerAddress}/balances`);
    const data = await response.json();
    
    const stxBalance = parseInt(data.stx.balance);
    const requiredFee = 2000; // 0.002 STX
    
    if (stxBalance < requiredFee) {
      throw new Error(`Insufficient relayer balance: ${stxBalance} microSTX, need ${requiredFee} microSTX for fees`);
    }
    
    logger.info({ balance: stxBalance, requiredFee }, 'Relayer balance check passed');
  } catch (error) {
    logger.warn({ error }, 'Could not check relayer balance, proceeding anyway');
  }
}

/**
 * Call admin-unlock-collateral on Stacks contract
 * This unlocks STX and sends it back to the user
 */
export async function unlockStacksCollateralOnChain(
  userAddress: string,
  amount: number
): Promise<string> {
  logger.info({ userAddress, amount }, 'Unlocking collateral on Stacks');

  // Check relayer balance first
  await checkRelayerBalance();

  const [contractAddress, contractName] = config.STACKS_COLLATERAL_CONTRACT.split('.');

  const txOptions = {
    contractAddress,
    contractName,
    functionName: 'admin-unlock-collateral',
    functionArgs: [
      principalCV(userAddress), // user
      uintCV(amount), // amount in microSTX
    ],
    senderKey: config.RELAYER_STACKS_PRIVATE_KEY,
    validateWithAbi: false,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 2000n, // 0.002 STX fee (reduced from 0.01)
  };

  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);

    if ('error' in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error} - ${broadcastResponse.reason}`);
    }

    logger.info(
      { txId: broadcastResponse.txid, userAddress, amount },
      'Unlock transaction broadcasted'
    );

    return broadcastResponse.txid;
  } catch (error) {
    logger.error({ error, userAddress, amount }, 'Failed to unlock collateral');
    throw error;
  }
}

/**
 * Check if an address is admin (for safety checks)
 */
export async function isAdmin(address: string): Promise<boolean> {
  // TODO: Implement read-only call to is-admin function
  // For now, return true if address matches relayer address
  return true; // Placeholder
}
