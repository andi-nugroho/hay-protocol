import { 
  openContractCall,
  FinishedTxData,
  showConnect
} from '@stacks/connect';
import { 
  stringAsciiCV,
  uintCV
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { getCurrentNetworkConfig, NETWORK_CONFIG } from './config';

const STACKLEND_CONTRACTS = getCurrentNetworkConfig();

// Simplified admin functions that use a direct approach
export const initAdminSimple = async (
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
): Promise<void> => {
  try {
    console.log('Simple init admin approach...');
    
    await openContractCall({
  network: NETWORK_CONFIG.NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET,
      contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
      contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
      functionName: 'init-admin',
      functionArgs: [],
      appDetails: {
        name: 'StackLend',
        icon: window.location.origin + '/favicon.ico',
      },
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
      contractAddress: STACKLEND_CONTRACTS.COLLATERAL.address,
      contractName: STACKLEND_CONTRACTS.COLLATERAL.name,
      functionName: 'add-token',
      functionArgs: [
        stringAsciiCV(tokenId),
        uintCV(1), // chain
        uintCV(800), // apyBps
        uintCV(1000000), // liquidity
        uintCV(1) // status
      ],
      appDetails: {
        name: 'StackLend',
        icon: window.location.origin + '/favicon.ico',
      },
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
