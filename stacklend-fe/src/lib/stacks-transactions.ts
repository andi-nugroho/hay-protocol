import { 
  openContractCall,
  FinishedTxData,
  UserSession
} from '@stacks/connect';
import { 
  stringUtf8CV, 
  uintCV,
  ClarityValue, 
  standardPrincipalCV,
  principalCV,
  bufferCV,
  someCV,
  noneCV,
  stringAsciiCV
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { getCurrentNetworkConfig, NETWORK_CONFIG } from './config';

// Select network based on configuration
const NETWORK = NETWORK_CONFIG.NETWORK === 'mainnet' 
  ? STACKS_MAINNET
  : STACKS_TESTNET;

export interface TransactionResult {
  txid: string;
}

export interface ContractCallOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  userSession?: UserSession;
  onFinish?: (data: FinishedTxData) => void;
  onCancel?: () => void;
}

// StackLend Protocol Contract Addresses - uses config.ts for addresses
export const STACKLEND_CONTRACTS = getCurrentNetworkConfig();

const callContract = async (options: ContractCallOptions): Promise<void> => {
  const {
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    userSession,
    onFinish,
    onCancel
  } = options;

  try {
    console.log('Calling contract function:', {
      contractAddress,
      contractName,
      functionName,
      functionArgs: functionArgs.map(arg => arg.toString())
    });

    console.log('Network being used:', NETWORK_CONFIG.NETWORK);
    console.log('UserSession provided:', !!userSession);

    const callOptions = {
      network: NETWORK,
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      appDetails: {
        name: 'StackLend',
        icon: window.location.origin + '/favicon.ico',
      },
      // Provide userSession when available to ensure proper wallet routing
      ...(userSession ? { userSession } : {}),
      onFinish: onFinish || ((data) => {
        console.log('Transaction completed:', data);
      }),
      onCancel: onCancel || (() => {
        console.log('Transaction cancelled by user');
      }),
    };

    console.log('Call options:', callOptions);

    const result = await openContractCall(callOptions);

    console.log('openContractCall result:', result);
  } catch (error) {
    console.error('Contract call failed:', error);
    if (onCancel) {
      onCancel();
    }
    throw error;
  }
};

// Collateral Management Functions
export const depositCollateral = async (
  amount: string, 
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
    contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
    functionName: 'deposit-collateral',
    functionArgs: [
      uintCV(amount) // amount in microSTX
    ],
    onFinish,
    onCancel
  });
};

export const withdrawCollateral = async (
  amount: string, 
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
    contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
    functionName: 'withdraw-collateral',
    functionArgs: [uintCV(amount)],
    onFinish,
    onCancel
  });
};

// Lending Functions
export const lendAsset = async (
  tokenId: string,
  amount: string, 
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.LENDING.address,
    contractName: STACKLEND_CONTRACTS.LENDING.name,
    functionName: 'lend',
    functionArgs: [
      stringAsciiCV(tokenId), // Token identifier (e.g., "USDC", "USDT", "WBTC")
      uintCV(amount) // Amount to lend
    ],
    onFinish,
    onCancel: onCancel || (() => {
      console.log('Lending cancelled');
    })
  });
};

// Cross-Chain Operations
export const borrowCrossChain = async (
  tokenSymbol: string, 
  amount: string, 
  evmRecipient: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
    contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
    functionName: 'borrow-cross-chain',
    functionArgs: [
      stringAsciiCV(tokenSymbol),
      uintCV(amount),
      stringUtf8CV(evmRecipient)
    ],
    onFinish,
    onCancel
  });
};

export const signalRepayment = async (
  tokenSymbol: string, 
  amount: string, 
  evmTxHash: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
    contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
    functionName: 'signal-repayment',
    functionArgs: [
      stringAsciiCV(tokenSymbol),
      uintCV(amount),
      bufferCV(Buffer.from(evmTxHash.replace('0x', ''), 'hex'))
    ],
    onFinish,
    onCancel
  });
};

// Admin Functions for Contract Setup
export const initAdmin = async (
  userSession?: UserSession,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
    contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
    functionName: 'init-admin',
    functionArgs: [],
    userSession,
    onFinish,
    onCancel
  });
};

export const addToken = async (
  tokenId: string,
  chain: number,
  apyBps: number,
  liquidity: number,
  status: number,
  userSession?: UserSession,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
    contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
    functionName: 'add-token',
    functionArgs: [
      stringAsciiCV(tokenId),
      uintCV(chain),
      uintCV(apyBps),
      uintCV(liquidity),
      uintCV(status)
    ],
    userSession,
    onFinish,
    onCancel
  });
};

// Lending functions for the lending contract
export const depositLending = async (
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.LENDING.address,
    contractName: STACKLEND_CONTRACTS.LENDING.name,
    functionName: 'deposit-lend-collateral',
    functionArgs: [
      uintCV(amount) // Amount to lend
    ],
    onFinish,
    onCancel: onCancel || (() => {
      console.log('Lending deposit cancelled');
    })
  });
};

export const withdrawLending = async (
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  return callContract({
    contractAddress: STACKLEND_CONTRACTS.LENDING.address,
    contractName: STACKLEND_CONTRACTS.LENDING.name,
    functionName: 'withdraw-lend-collateral',
    functionArgs: [
      uintCV(amount) // Amount to withdraw
    ],
    onFinish,
    onCancel: onCancel || (() => {
      console.log('Lending withdrawal cancelled');
    })
  });
};

// Legacy function names for backward compatibility
export const lendSTX = depositCollateral;
export const borrowToken = borrowCrossChain;
export const repayLoan = signalRepayment;
