import { openContractCall, FinishedTxData, UserSession } from "@stacks/connect";
import {
  stringUtf8CV,
  uintCV,
  ClarityValue,
  bufferCV,
  stringAsciiCV,
  PostConditionMode,
  principalCV,
} from "@stacks/transactions";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";
import { STACKS_CONFIG, STACKS_FUNCTIONS } from "@/constants/contract/stacks";

// Select network based on configuration
const NETWORK =
  STACKS_CONFIG.network === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

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

// HayyProtocol Contract Addresses
export const HAYYPROTOCOL_CONTRACTS = {
  COLLATERAL: {
    address: STACKS_CONFIG.contractAddress,
    name: STACKS_CONFIG.collateralContractName,
  },
  // Add LENDING contract (currently same as collateral for MVP)
  LENDING: {
    address: STACKS_CONFIG.contractAddress,
    name: STACKS_CONFIG.collateralContractName,
  },
};

const callContract = async (options: ContractCallOptions): Promise<void> => {
  const {
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    userSession,
    onFinish,
    onCancel,
  } = options;

  try {
    console.log("Calling contract function:", {
      contractAddress,
      contractName,
      functionName,
      functionArgs: functionArgs.map((arg) => arg.toString()),
    });

    console.log("Network being used:", STACKS_CONFIG.network);
    console.log("UserSession provided:", !!userSession);

    const callOptions = {
      network: NETWORK,
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      appDetails: {
        name: "HayyProtocol",
        icon: window.location.origin + "/favicon.ico",
      },
      // Provide userSession when available to ensure proper wallet routing
      ...(userSession ? { userSession } : {}),
      // Add fee configuration for higher gas costs
      fee: "50000", // 0.05 STX - increased from default to handle medium-cost deployments
      // CRITICAL FIX: Use Allow mode like sandbox explorer (not Deny mode)
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      // Add sponsored mode to bypass some wallet validations
      sponsored: false,
      onFinish:
        onFinish ||
        ((data) => {
          console.log("Transaction completed:", data);
        }),
      onCancel:
        onCancel ||
        (() => {
          console.log("Transaction cancelled by user");
        }),
    };

    console.log("Call options:", callOptions);

    const result = await openContractCall(callOptions);

    console.log("openContractCall result:", result);
  } catch (error) {
    console.error("Contract call failed:", error);
    if (onCancel) {
      onCancel();
    }
    throw error;
  }
};

// Collateral Management Functions
export const depositCollateral = async (
  amount: string,
  suiAddress: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: "deposit-collateral",
    functionArgs: [
      uintCV(amount), // amount in microSTX
      stringAsciiCV(suiAddress), // Sui wallet address (0x...)
    ],
    onFinish,
    onCancel,
  });
};

export const requestWithdraw = async (
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: STACKS_FUNCTIONS.REQUEST_WITHDRAW,
    functionArgs: [uintCV(amount)],
    onFinish,
    onCancel,
  });
};

// Lending Functions
export const lendAsset = async (
  tokenId: string,
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.LENDING.address,
    contractName: HAYYPROTOCOL_CONTRACTS.LENDING.name,
    functionName: "lend",
    functionArgs: [
      stringAsciiCV(tokenId), // Token identifier (e.g., "USDC", "USDT", "WBTC")
      uintCV(amount), // Amount to lend
    ],
    onFinish,
    onCancel:
      onCancel ||
      (() => {
        console.log("Lending cancelled");
      }),
  });
};

// Cross-Chain Operations
export const borrowCrossChain = async (
  tokenSymbol: string,
  amount: string,
  evmRecipient: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: "borrow-cross-chain",
    functionArgs: [
      stringAsciiCV(tokenSymbol),
      uintCV(amount),
      stringUtf8CV(evmRecipient),
    ],
    onFinish,
    onCancel,
  });
};

export const signalRepayment = async (
  tokenSymbol: string,
  amount: string,
  evmTxHash: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: "signal-repayment",
    functionArgs: [
      stringAsciiCV(tokenSymbol),
      uintCV(amount),
      bufferCV(Buffer.from(evmTxHash.replace("0x", ""), "hex")),
    ],
    onFinish,
    onCancel,
  });
};

// Admin Functions for Contract Setup
export const initAdmin = async (
  userSession?: UserSession,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: "init-admin",
    functionArgs: [],
    userSession,
    onFinish,
    onCancel,
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
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: "add-token",
    functionArgs: [
      stringAsciiCV(tokenId),
      uintCV(chain),
      uintCV(apyBps),
      uintCV(liquidity),
      uintCV(status),
    ],
    userSession,
    onFinish,
    onCancel,
  });
};

// Lending functions for the lending contract
export const depositLending = async (
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.LENDING.address,
    contractName: HAYYPROTOCOL_CONTRACTS.LENDING.name,
    functionName: "deposit-lend-collateral",
    functionArgs: [
      uintCV(amount), // Amount to lend
    ],
    onFinish,
    onCancel:
      onCancel ||
      (() => {
        console.log("Lending deposit cancelled");
      }),
  });
};

export const withdrawLending = async (
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.LENDING.address,
    contractName: HAYYPROTOCOL_CONTRACTS.LENDING.name,
    functionName: "withdraw-lend-collateral",
    functionArgs: [
      uintCV(amount), // Amount to withdraw
    ],
    onFinish,
    onCancel:
      onCancel ||
      (() => {
        console.log("Lending withdrawal cancelled");
      }),
  });
};

// Legacy function names for backward compatibility
export const lendSTX = depositCollateral;
export const borrowToken = borrowCrossChain;
export const repayLoan = signalRepayment;

// ========================================
// ADMIN FUNCTIONS (Manual Operations)
// ========================================

// Admin unlock collateral - manual operation (normally done by relayer)
export const adminUnlockCollateral = async (
  userAddress: string,
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: "admin-unlock-collateral",
    functionArgs: [
      principalCV(userAddress), // User principal
      uintCV(amount), // Amount to unlock (in microSTX)
    ],
    onFinish:
      onFinish ||
      ((data) => {
        console.log("Collateral unlocked successfully:", data);
      }),
    onCancel:
      onCancel ||
      (() => {
        console.log("Collateral unlock cancelled");
      }),
  });
};

// Emergency admin withdrawal
export const adminEmergencyWithdraw = async (
  recipient: string,
  amount: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void,
): Promise<void> => {
  return callContract({
    contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
    contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
    functionName: "admin-emergency-withdraw",
    functionArgs: [
      principalCV(recipient), // Recipient principal
      uintCV(amount), // Amount to withdraw (in microSTX)
    ],
    onFinish:
      onFinish ||
      ((data) => {
        console.log("Emergency withdrawal successful:", data);
      }),
    onCancel:
      onCancel ||
      (() => {
        console.log("Emergency withdrawal cancelled");
      }),
  });
};
