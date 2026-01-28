import { 
  fetchCallReadOnlyFunction, 
  ClarityValue, 
  standardPrincipalCV, 
  stringUtf8CV,
  stringAsciiCV,
  uintCV,
  cvToValue,
  ClarityType
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { NETWORK_CONFIG, getCurrentNetworkConfig, PROTOCOL_CONSTANTS } from './config';

// Contract configuration - uses config.ts for addresses
export const STACKLEND_CONTRACTS = getCurrentNetworkConfig();

// Use appropriate network based on configuration
const NETWORK = NETWORK_CONFIG.NETWORK === 'mainnet' 
  ? STACKS_MAINNET 
  : STACKS_TESTNET;

export interface CollateralInfo {
  collateralAmount: number;
  borrowedTotal: number;
  totalCollateral: number;
  totalBorrowed: number;
}

export interface LendingInfo {
  lendBalance: number;
  totalLend: number;
  lendApyBps: number;
}

export interface TokenMetadata {
  token: string;
  chain: number;
  apyBps: number;
  liquidity: number;
  status: number;
}

export interface BorrowedTokenInfo {
  token: string;
  amount: number;
}

/**
 * Read-only function call wrapper with error handling
 */
async function callReadOnly(
  contractAddress: string,
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[] = []
): Promise<ClarityValue> {
  try {
    return await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      network: NETWORK,
      senderAddress: contractAddress,
    });
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
}

/**
 * Get user's collateral balance
 */
export async function getCollateralBalance(userAddress: string): Promise<number> {
  try {
    // Validate address format
    if (!userAddress || !userAddress.startsWith('S')) {
      console.warn('Invalid Stacks address format:', userAddress);
      return 0;
    }

    const result = await callReadOnly(
      STACKLEND_CONTRACTS.COLLATERAL.address,
      STACKLEND_CONTRACTS.COLLATERAL.name,
      'get-collateral',
      [standardPrincipalCV(userAddress)]
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 0);
  } catch (error) {
    console.error('Error getting collateral balance:', error);
    return 0;
  }
}

/**
 * Get user's total borrowed amount
 */
export async function getBorrowedTotal(userAddress: string): Promise<number> {
  try {
    // Validate address format
    if (!userAddress || !userAddress.startsWith('S')) {
      console.warn('Invalid Stacks address format:', userAddress);
      return 0;
    }

    const result = await callReadOnly(
      STACKLEND_CONTRACTS.COLLATERAL.address,
      STACKLEND_CONTRACTS.COLLATERAL.name,
      'get-borrowed-total',
      [standardPrincipalCV(userAddress)]
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 0);
  } catch (error) {
    console.error('Error getting borrowed total:', error);
    return 0;
  }
}

/**
 * Get total collateral in the protocol
 */
export async function getTotalCollateral(): Promise<number> {
  try {
    const result = await callReadOnly(
      STACKLEND_CONTRACTS.COLLATERAL.address,
      STACKLEND_CONTRACTS.COLLATERAL.name,
      'get-total-collateral'
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 0);
  } catch (error) {
    console.error('Error getting total collateral:', error);
    return 0;
  }
}

/**
 * Get total borrowed amount in the protocol
 */
export async function getTotalBorrowed(): Promise<number> {
  try {
    const result = await callReadOnly(
      STACKLEND_CONTRACTS.COLLATERAL.address,
      STACKLEND_CONTRACTS.COLLATERAL.name,
      'get-total-borrowed'
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 0);
  } catch (error) {
    console.error('Error getting total borrowed:', error);
    return 0;
  }
}

/**
 * Get user's lending balance
 */
export async function getLendBalance(userAddress: string): Promise<number> {
  try {
    // Validate address format
    if (!userAddress || !userAddress.startsWith('S')) {
      console.warn('Invalid Stacks address format:', userAddress);
      return 0;
    }

    const result = await callReadOnly(
      STACKLEND_CONTRACTS.LENDING.address,
      STACKLEND_CONTRACTS.LENDING.name,
      'get-lend-balance',
      [standardPrincipalCV(userAddress)]
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 0);
  } catch (error) {
    console.error('Error getting lend balance:', error);
    return 0;
  }
}

/**
 * Get total lending amount in the protocol
 */
export async function getTotalLend(): Promise<number> {
  try {
    const result = await callReadOnly(
      STACKLEND_CONTRACTS.LENDING.address,
      STACKLEND_CONTRACTS.LENDING.name,
      'get-total-lend'
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 0);
  } catch (error) {
    console.error('Error getting total lend:', error);
    return 0;
  }
}

/**
 * Get lending APY in basis points
 */
export async function getLendApyBps(): Promise<number> {
  try {
    const result = await callReadOnly(
      STACKLEND_CONTRACTS.LENDING.address,
      STACKLEND_CONTRACTS.LENDING.name,
      'get-lend-apy-bps'
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 500);
  } catch (error) {
    console.error('Error getting lend APY:', error);
    return 500; // Default 5%
  }
}

/**
 * Get borrow token metadata
 */
export async function getBorrowTokenMeta(tokenId: string): Promise<TokenMetadata | null> {
  try {
    // Validate token ID length (contract expects string-ascii 16)
    if (!tokenId || tokenId.length > 16) {
      console.warn('Invalid token ID length:', tokenId);
      return null;
    }

    const result = await callReadOnly(
      STACKLEND_CONTRACTS.COLLATERAL.address,
      STACKLEND_CONTRACTS.COLLATERAL.name,
      'get-borrow-token-meta',
      [stringAsciiCV(tokenId)]
    );
    
    const value = cvToValue(result);
    
    // If the result is null or undefined, the token is not registered
    if (!value || value === null) {
      console.log(`Token ${tokenId} metadata not found (token not registered)`);
      return null;
    }
    
    if (value && typeof value === 'object') {
      return {
        token: value.token || tokenId,
        chain: Number(value.chain || 0),
        apyBps: Number(value['apy-bps'] || 0),
        liquidity: Number(value.liquidity || 0),
        status: Number(value.status || 0)
      };
    }
    
    // Return default metadata if contract doesn't have this token registered
    return {
      token: tokenId,
      chain: 0, // Default to base chain
      apyBps: 800, // Default 8% APY
      liquidity: 0,
      status: 0 // Coming soon status
    };
  } catch (error) {
    console.error('Error getting token metadata for', tokenId, ':', error);
    // Return default metadata on error
    return {
      token: tokenId,
      chain: 0,
      apyBps: 800,
      liquidity: 0,
      status: 0
    };
  }
}

/**
 * Get user's borrowed amount for a specific token
 */
export async function getBorrowedAmount(userAddress: string, tokenId: string): Promise<number> {
  try {
    // Check if user address is valid
    if (!userAddress || !userAddress.startsWith('S')) {
      console.log('No valid Stacks address provided, skipping contract calls');
      return 0;
    }

    // First check if token is registered by getting the token code
    const tokenCodeResult = await callReadOnly(
      STACKLEND_CONTRACTS.COLLATERAL.address,
      STACKLEND_CONTRACTS.COLLATERAL.name,
      'token-code-of',
      [stringAsciiCV(tokenId)]
    );
    
    const tokenCode = cvToValue(tokenCodeResult);
    
    // If token code is 0, the token is not registered
    if (!tokenCode || tokenCode === 0) {
      console.log(`Token ${tokenId} is not registered in the contract`);
      return 0;
    }
    
    if (!tokenCode || tokenCode === 0) {
      console.log(`Token ${tokenId} not registered in contract, returning 0`);
      return 0;
    }
    
    // Then get the borrowed amount using the token code
    const result = await callReadOnly(
      STACKLEND_CONTRACTS.COLLATERAL.address,
      STACKLEND_CONTRACTS.COLLATERAL.name,
      'get-borrowed',
      [standardPrincipalCV(userAddress), uintCV(Number(tokenCode))]
    );
    
    const value = cvToValue(result);
    return typeof value === 'bigint' ? Number(value) : Number(value || 0);
  } catch (error) {
    console.error('Error getting borrowed amount:', error);
    return 0;
  }
}

/**
 * Get all contract data for a user
 */
export async function getAllUserData(userAddress: string): Promise<{
  collateral: CollateralInfo;
  lending: LendingInfo;
}> {
  try {
    // Validate address format
    if (!userAddress || !userAddress.startsWith('S')) {
      console.warn('Invalid Stacks address format for getAllUserData:', userAddress);
      return {
        collateral: {
          collateralAmount: 0,
          borrowedTotal: 0,
          totalCollateral: 0,
          totalBorrowed: 0
        },
        lending: {
          lendBalance: 0,
          totalLend: 0,
          lendApyBps: 500
        }
      };
    }

    const [
      collateralAmount,
      borrowedTotal,
      totalCollateral,
      totalBorrowed,
      lendBalance,
      totalLend,
      lendApyBps
    ] = await Promise.all([
      getCollateralBalance(userAddress),
      getBorrowedTotal(userAddress),
      getTotalCollateral(),
      getTotalBorrowed(),
      getLendBalance(userAddress),
      getTotalLend(),
      getLendApyBps()
    ]);

    return {
      collateral: {
        collateralAmount,
        borrowedTotal,
        totalCollateral,
        totalBorrowed
      },
      lending: {
        lendBalance,
        totalLend,
        lendApyBps
      }
    };
  } catch (error) {
    console.error('Error getting all user data:', error);
    throw error;
  }
}

/**
 * Utility function to convert microSTX to STX
 */
export function microSTXToSTX(microSTX: number): number {
  return microSTX / PROTOCOL_CONSTANTS.MICRO_STX_PER_STX;
}

/**
 * Utility function to convert STX to microSTX
 */
export function STXToMicroSTX(stx: number): number {
  return Math.floor(stx * PROTOCOL_CONSTANTS.MICRO_STX_PER_STX);
}

/**
 * Utility function to convert basis points to percentage
 */
export function bpsToPercentage(bps: number): number {
  return bps / 100;
}
