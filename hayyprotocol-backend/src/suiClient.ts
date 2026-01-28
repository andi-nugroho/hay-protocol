import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import { fromB64, fromHEX } from '@mysten/sui.js/utils';
import { config } from './config.js';
import pino from 'pino';

const logger = pino({ level: config.LOG_LEVEL });

// Initialize Sui client
export const suiClient = new SuiClient({ url: config.SUI_RPC_URL });

// Initialize relayer keypair from private key
// Support both Bech32 format (suiprivkey1...) and base64 format
let relayerKeypairInstance: Ed25519Keypair;

if (config.RELAYER_SUI_PRIVATE_KEY.startsWith('suiprivkey1')) {
  // Bech32 format - decode using decodeSuiPrivateKey
  const decoded = decodeSuiPrivateKey(config.RELAYER_SUI_PRIVATE_KEY);
  relayerKeypairInstance = Ed25519Keypair.fromSecretKey(decoded.secretKey);
} else if (config.RELAYER_SUI_PRIVATE_KEY.startsWith('0x')) {
  // Hex format
  relayerKeypairInstance = Ed25519Keypair.fromSecretKey(
    fromHEX(config.RELAYER_SUI_PRIVATE_KEY)
  );
} else {
  // Base64 format
  relayerKeypairInstance = Ed25519Keypair.fromSecretKey(
    fromB64(config.RELAYER_SUI_PRIVATE_KEY)
  );
}

export const relayerKeypair = relayerKeypairInstance;
export const relayerAddress = relayerKeypair.getPublicKey().toSuiAddress();

logger.info({ relayerAddress }, 'Sui relayer initialized');

/**
 * Register STX collateral on Sui borrow registry
 * @param borrower - Sui address of the borrower
 * @param amountStx - STX amount in microSTX
 * @param valueUsd - USD value of the collateral
 */
export async function registerStacksCollateral(
  borrower: string,
  amountStx: number,
  valueUsd: number
): Promise<SuiTransactionBlockResponse> {
  logger.info(
    { borrower, amountStx, valueUsd },
    'Registering STX collateral on Sui'
  );

  const tx = new TransactionBlock();

  // Set the sender address explicitly
  tx.setSender(relayerAddress);

  // Call: borrow_controller::register_stacks_collateral
  tx.moveCall({
    target: `${config.SUI_PACKAGE_ID}::borrow_controller::register_stacks_collateral`,
    arguments: [
      tx.object(config.SUI_BORROW_REGISTRY_ID), // registry
      tx.pure(borrower, 'address'), // borrower
      tx.pure(3, 'u8'), // collateral_type: 3 = STX from Stacks (COLLATERAL_TYPE_STX_STACKS)
      tx.pure(amountStx, 'u64'), // amount in microSTX
    ],
  });

  const result = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: relayerKeypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Sui tx failed: ${result.effects?.status?.error}`);
  }

  logger.info(
    { digest: result.digest, borrower, amountStx },
    'STX collateral registered on Sui'
  );

  return result;
}

/**
 * Unlock STX collateral on Sui after debt verification
 * @param borrower - Sui address of the borrower
 * @param amountStx - STX amount to unlock in microSTX
 */
export async function unlockStacksCollateral(
  borrower: string,
  amountStx: number
): Promise<SuiTransactionBlockResponse> {
  logger.info(
    { borrower, amountStx },
    'Unlocking STX collateral on Sui'
  );

  const tx = new TransactionBlock();

  // Call: borrow_controller::withdraw_stx_collateral
  tx.moveCall({
    target: `${config.SUI_PACKAGE_ID}::borrow_controller::withdraw_stx_collateral`,
    arguments: [
      tx.object(config.SUI_BORROW_REGISTRY_ID), // registry
      tx.pure(borrower, 'address'), // borrower
      tx.pure(amountStx, 'u64'), // amount in microSTX
    ],
  });

  const result = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: relayerKeypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Sui tx failed: ${result.effects?.status?.error}`);
  }

  logger.info(
    { digest: result.digest, borrower, amountStx },
    'STX collateral unlocked on Sui'
  );

  return result;
}

/**
 * Get borrow position for a user on Sui
 */
export async function getBorrowPosition(borrower: string): Promise<{
  stxCollateral: number;
  sbtcCollateral: number;
  usdcBorrowed: number;
  totalCollateralUsd: number;
  maxBorrowUsd: number;
  healthFactor: number;
}> {
  const tx = new TransactionBlock();

  // Call read-only function: borrow_controller::get_position
  tx.moveCall({
    target: `${config.SUI_PACKAGE_ID}::borrow_controller::get_position`,
    arguments: [
      tx.object(config.SUI_BORROW_REGISTRY_ID),
      tx.pure(borrower, 'address'),
    ],
  });

  const result = await suiClient.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: relayerAddress,
  });

  // Parse result (this is simplified - actual parsing depends on your Move contract return format)
  // You'll need to adjust this based on your actual struct format
  if (result.results?.[0]?.returnValues) {
    const values = result.results[0].returnValues;

    return {
      stxCollateral: parseInt(values[0]?.[0] || '0'),
      sbtcCollateral: parseInt(values[1]?.[0] || '0'),
      usdcBorrowed: parseInt(values[2]?.[0] || '0'),
      totalCollateralUsd: parseInt(values[3]?.[0] || '0'),
      maxBorrowUsd: parseInt(values[4]?.[0] || '0'),
      healthFactor: parseInt(values[5]?.[0] || '0'),
    };
  }

  throw new Error('Failed to parse borrow position');
}

/**
 * Check if user has outstanding debt on Sui
 */
export async function hasOutstandingDebt(borrower: string): Promise<boolean> {
  try {
    const position = await getBorrowPosition(borrower);
    return position.usdcBorrowed > 0;
  } catch (error) {
    logger.error({ error, borrower }, 'Failed to check debt status');
    // If we can't check, assume they have debt (safer)
    return true;
  }
}
