/**
 * Sui transaction functions for HayyProtocol
 * Handles borrow, repay, and collateral operations on Sui blockchain
 */

import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';
import {
  ORIGINAL_PACKAGE_ID,
  BORROW_REGISTRY_ID,
  USDC_LENDING_POOL_ID,
  BORROW_CONTROLLER_MODULE_NAME,
} from '@/constants/contract/sui';

// Initialize Sui client (testnet)
const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

/**
 * Borrow USDC from the lending pool using STX/sBTC collateral
 * @param signAndExecuteTransactionBlock - Sui wallet function from @mysten/dapp-kit
 * @param amount - Amount of USDC to borrow (in microUSDC, 6 decimals)
 * @param userAddress - Sui address of the borrower
 */
export async function borrowUsdc(
  signAndExecuteTransactionBlock: any,
  amount: number,
  userAddress: string
) {
  const tx = new TransactionBlock();

  // Call: borrow_controller::borrow_usdc
  tx.moveCall({
    target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::borrow_usdc`,
    arguments: [
      tx.object(BORROW_REGISTRY_ID), // registry
      tx.object(USDC_LENDING_POOL_ID), // usdc_pool
      tx.pure(amount, 'u64'), // amount in microUSDC
    ],
  });

  // Execute transaction
  const result = await signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  return result;
}

/**
 * Repay USDC loan
 * @param signAndExecuteTransactionBlock - Sui wallet function
 * @param usdcCoinObjectId - Object ID of the USDC coin to repay
 * @param amount - Amount to repay (in microUSDC)
 */
export async function repayUsdc(
  signAndExecuteTransactionBlock: any,
  usdcCoinObjectId: string,
  amount: number
) {
  const tx = new TransactionBlock();

  // Split the coin to exact amount
  const repaymentCoin = tx.splitCoins(tx.object(usdcCoinObjectId), [tx.pure(amount, 'u64')]);

  // Call: borrow_controller::repay_usdc
  tx.moveCall({
    target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::repay_usdc`,
    arguments: [
      tx.object(BORROW_REGISTRY_ID), // registry
      tx.object(USDC_LENDING_POOL_ID), // usdc_pool
      repaymentCoin, // repayment coin
    ],
  });

  const result = await signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  return result;
}

/**
 * Deposit sBTC collateral from Sui
 * @param signAndExecuteTransactionBlock - Sui wallet function
 * @param sbtcCoinObjectId - Object ID of the sBTC coin
 * @param amount - Amount of sBTC to deposit (in satoshis, 8 decimals)
 */
export async function depositSbtcCollateralSui(
  signAndExecuteTransactionBlock: any,
  sbtcCoinObjectId: string,
  amount: number
) {
  const tx = new TransactionBlock();

  // Split the coin to exact amount
  const collateralCoin = tx.splitCoins(tx.object(sbtcCoinObjectId), [tx.pure(amount, 'u64')]);

  // Call: borrow_controller::deposit_sbtc_collateral_sui
  tx.moveCall({
    target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::deposit_sbtc_collateral_sui`,
    arguments: [
      tx.object(BORROW_REGISTRY_ID), // registry
      collateralCoin, // sbtc coin
    ],
  });

  const result = await signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  return result;
}

/**
 * Withdraw sBTC collateral (only if no outstanding debt)
 * @param signAndExecuteTransactionBlock - Sui wallet function
 * @param amount - Amount of sBTC to withdraw (in satoshis)
 */
export async function withdrawSbtcCollateralSui(
  signAndExecuteTransactionBlock: any,
  amount: number
) {
  const tx = new TransactionBlock();

  // Call: borrow_controller::withdraw_sbtc_collateral_sui
  tx.moveCall({
    target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::withdraw_sbtc_collateral_sui`,
    arguments: [
      tx.object(BORROW_REGISTRY_ID), // registry
      tx.pure(amount, 'u64'), // amount
    ],
  });

  const result = await signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  return result;
}

/**
 * Get borrow position for a user
 * @param userAddress - Sui address
 */
export async function getBorrowPosition(userAddress: string) {
  try {
    const tx = new TransactionBlock();

    // Call view function: borrow_controller::get_collateral_amounts
    tx.moveCall({
      target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::get_collateral_amounts`,
      arguments: [
        tx.object(BORROW_REGISTRY_ID),
        tx.pure(userAddress, 'address'),
      ],
    });

    // Also get total debt
    const tx2 = new TransactionBlock();
    tx2.moveCall({
      target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::get_total_debt`,
      arguments: [
        tx2.object(BORROW_REGISTRY_ID),
        tx2.pure(userAddress, 'address'),
      ],
    });

    // Also get borrow power
    const tx3 = new TransactionBlock();
    tx3.moveCall({
      target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::get_borrow_power`,
      arguments: [
        tx3.object(BORROW_REGISTRY_ID),
        tx3.pure(userAddress, 'address'),
      ],
    });

    // Execute using devInspect (read-only)
    const [collateralResult, debtResult, borrowPowerResult] = await Promise.all([
      suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: userAddress,
      }),
      suiClient.devInspectTransactionBlock({
        transactionBlock: tx2,
        sender: userAddress,
      }),
      suiClient.devInspectTransactionBlock({
        transactionBlock: tx3,
        sender: userAddress,
      }),
    ]);

    // Parse results
    // Format: (sbtc_collateral_sui, sbtc_collateral_stacks, stx_collateral_stacks)
    const collateral = collateralResult.results?.[0]?.returnValues;
    const debt = debtResult.results?.[0]?.returnValues;
    const borrowPower = borrowPowerResult.results?.[0]?.returnValues;

    if (!collateral || !debt || !borrowPower) {
      throw new Error('Failed to parse position data');
    }

    // Parse BCS values (simplified - actual parsing depends on BCS format)
    return {
      sbtcCollateralSui: parseInt(collateral[0]?.[0] || '0'),
      sbtcCollateralStacks: parseInt(collateral[1]?.[0] || '0'),
      stxCollateralStacks: parseInt(collateral[2]?.[0] || '0'),
      usdcBorrowed: parseInt(debt[0]?.[0] || '0'),
      borrowPower: parseInt(borrowPower[0]?.[0] || '0'),
    };
  } catch (error) {
    console.error('Error fetching borrow position:', error);
    // Return empty position if user doesn't have one
    return {
      sbtcCollateralSui: 0,
      sbtcCollateralStacks: 0,
      stxCollateralStacks: 0,
      usdcBorrowed: 0,
      borrowPower: 0,
    };
  }
}

/**
 * Check if user has a position
 * @param userAddress - Sui address
 */
export async function hasPosition(userAddress: string): Promise<boolean> {
  try {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::has_position`,
      arguments: [
        tx.object(BORROW_REGISTRY_ID),
        tx.pure(userAddress, 'address'),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress,
    });

    const hasPos = result.results?.[0]?.returnValues?.[0]?.[0];
    return hasPos === 1 || hasPos === true;
  } catch (error) {
    console.error('Error checking position:', error);
    return false;
  }
}

/**
 * Get user's USDC balance
 * @param userAddress - Sui address
 */
export async function getUsdcBalance(userAddress: string): Promise<{
  totalBalance: number;
  coins: Array<{ objectId: string; balance: number }>;
}> {
  try {
    const usdcType = `${ORIGINAL_PACKAGE_ID}::mock_usdc::MOCK_USDC`;

    const coins = await suiClient.getCoins({
      owner: userAddress,
      coinType: usdcType,
    });

    let totalBalance = 0;
    const coinObjects = coins.data.map((coin) => {
      totalBalance += parseInt(coin.balance);
      return {
        objectId: coin.coinObjectId,
        balance: parseInt(coin.balance),
      };
    });

    return {
      totalBalance,
      coins: coinObjects,
    };
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return { totalBalance: 0, coins: [] };
  }
}

/**
 * Get user's sBTC balance
 * @param userAddress - Sui address
 */
export async function getSbtcBalance(userAddress: string): Promise<{
  totalBalance: number;
  coins: Array<{ objectId: string; balance: number }>;
}> {
  try {
    const sbtcType = `${ORIGINAL_PACKAGE_ID}::mock_sbtc::MOCK_SBTC`;

    const coins = await suiClient.getCoins({
      owner: userAddress,
      coinType: sbtcType,
    });

    let totalBalance = 0;
    const coinObjects = coins.data.map((coin) => {
      totalBalance += parseInt(coin.balance);
      return {
        objectId: coin.coinObjectId,
        balance: parseInt(coin.balance),
      };
    });

    return {
      totalBalance,
      coins: coinObjects,
    };
  } catch (error) {
    console.error('Error fetching sBTC balance:', error);
    return { totalBalance: 0, coins: [] };
  }
}
