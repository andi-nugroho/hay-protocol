import { 
  openContractCall,
  FinishedTxData,
  showConnect
} from '@stacks/connect';
import { 
  stringAsciiCV,
  uintCV,
  PostConditionMode,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { getCurrentNetworkConfig, NETWORK_CONFIG } from './config';

const HAYYPROTOCOL_CONTRACTS = getCurrentNetworkConfig();

// Simplified admin functions that use a direct approach
export const initAdminSimple = async (
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  try {
    console.log('Simple init admin approach...');
    
    await openContractCall({
      network: NETWORK_CONFIG.NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET,
      contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
      contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
      functionName: 'init-admin',
      functionArgs: [],
      appDetails: {
        name: 'HayyProtocol',
        icon: window.location.origin + '/favicon.ico',
      },
      // Add fee configuration for higher gas costs (like sandbox explorer)
      fee: "50000", // 0.05 STX - increased from default
      // CRITICAL FIX: Use Allow mode like sandbox explorer (not Deny mode)
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      // Add sponsored mode to bypass some wallet validations
      sponsored: false,
      onFinish: (data) => {
        console.log('Simple init admin success:', data);
        if (onFinish) onFinish(data);
      },
      onCancel: () => {
        console.log('Simple init admin cancelled');
        if (onCancel) onCancel();
      },
    });
  } catch (error) {
    console.error('Simple init admin failed:', error);
    throw error;
  }
};

export const addTokenSimple = async (
  tokenId: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  try {
    console.log('Simple add token approach for:', tokenId);
    
    await openContractCall({
      network: NETWORK_CONFIG.NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET,
      contractAddress: HAYYPROTOCOL_CONTRACTS.COLLATERAL.address,
      contractName: HAYYPROTOCOL_CONTRACTS.COLLATERAL.name,
      functionName: 'add-token',
      functionArgs: [
        stringAsciiCV(tokenId),
        uintCV(1), // chain
        uintCV(800), // apyBps
        uintCV(1000000), // liquidity
        uintCV(1) // status
      ],
      appDetails: {
        name: 'HayyProtocol',
        icon: window.location.origin + '/favicon.ico',
      },
      // Add fee configuration for higher gas costs (like sandbox explorer)
      fee: "50000", // 0.05 STX - increased from default
      // CRITICAL FIX: Use Allow mode like sandbox explorer (not Deny mode)
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      // Add sponsored mode to bypass some wallet validations
      sponsored: false,
      onFinish: (data) => {
        console.log('Simple add token success:', data);
        if (onFinish) onFinish(data);
      },
      onCancel: () => {
        console.log('Simple add token cancelled');
        if (onCancel) onCancel();
      },
    });
  } catch (error) {
    console.error('Simple add token failed:', error);
    throw error;
  }
};
