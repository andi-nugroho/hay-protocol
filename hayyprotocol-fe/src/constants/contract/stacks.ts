/**
 * Stacks Contract Configuration
 * HayyProtocol - Collateral Management on Stacks
 */

export const STACKS_CONFIG = {
  network: import.meta.env.VITE_STACKS_NETWORK as 'testnet' | 'mainnet',
  contractAddress: import.meta.env.VITE_STACKS_CONTRACT_ADDRESS,
  collateralContractName: import.meta.env.VITE_STACKS_COLLATERAL_CONTRACT_NAME,
} as const;

/**
 * Get full contract identifier
 * Format: ADDRESS.CONTRACT_NAME
 */
export const getStacksContractId = () => {
  return `${STACKS_CONFIG.contractAddress}.${STACKS_CONFIG.collateralContractName}`;
};

/**
 * Contract Functions
 */
export const STACKS_FUNCTIONS = {
  // User Functions
  DEPOSIT_COLLATERAL: 'deposit-collateral',
  REQUEST_WITHDRAW: 'request-withdraw',

  // Read-only Functions
  GET_COLLATERAL: 'get-collateral',
  GET_TOTAL_COLLATERAL: 'get-total-collateral',
  GET_PORTFOLIO: 'get-portfolio',
  IS_ADMIN: 'is-admin',

  // Admin Functions
  INIT_ADMIN: 'init-admin',
  ADMIN_UNLOCK_COLLATERAL: 'admin-unlock-collateral',
  ADMIN_EMERGENCY_WITHDRAW: 'admin-emergency-withdraw',
} as const;

/**
 * Error Codes from Contract
 */
export const STACKS_ERROR_CODES = {
  ERR_NON_POSITIVE: 100,
  ERR_INSUFFICIENT_FUNDS: 101,
  ERR_NOT_ADMIN: 105,
} as const;

/**
 * Helper: Convert STX to microSTX
 */
export const stxToMicroStx = (stx: number): bigint => {
  return BigInt(Math.floor(stx * 1_000_000));
};

/**
 * Helper: Convert microSTX to STX
 */
export const microStxToStx = (microStx: bigint | number): number => {
  return Number(microStx) / 1_000_000;
};

/**
 * Stacks Explorer URLs
 */
export const getExplorerUrl = {
  transaction: (txId: string) => {
    const network = STACKS_CONFIG.network;
    return `https://explorer.hiro.so/txid/${txId}?chain=${network}`;
  },

  address: (address: string) => {
    const network = STACKS_CONFIG.network;
    return `https://explorer.hiro.so/address/${address}?chain=${network}`;
  },

  contract: () => {
    const network = STACKS_CONFIG.network;
    return `https://explorer.hiro.so/txid/${getStacksContractId()}?chain=${network}`;
  },
};

/**
 * Validate environment variables
 */
export const validateStacksConfig = () => {
  const errors: string[] = [];

  if (!STACKS_CONFIG.network) {
    errors.push('VITE_STACKS_NETWORK is not set');
  }

  if (!STACKS_CONFIG.contractAddress) {
    errors.push('VITE_STACKS_CONTRACT_ADDRESS is not set');
  }

  if (!STACKS_CONFIG.collateralContractName) {
    errors.push('VITE_STACKS_COLLATERAL_CONTRACT_NAME is not set');
  }

  if (errors.length > 0) {
    console.error('Stacks configuration errors:', errors);
    return false;
  }

  return true;
};

// Validate on import
if (import.meta.env.MODE !== 'test') {
  validateStacksConfig();
}

export default STACKS_CONFIG;
