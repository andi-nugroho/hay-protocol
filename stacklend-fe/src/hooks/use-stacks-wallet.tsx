import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  showConnect, 
  AppConfig, 
  UserSession, 
  FinishedTxData,
  openContractCall 
} from '@stacks/connect';

interface StacksWalletState {
  address?: string;
  isConnected: boolean;
  userSession?: UserSession;
}

const appConfig = new AppConfig(['store_write', 'publish_data']);

export const useStacksWallet = () => {
  const [walletState, setWalletState] = useState<StacksWalletState>({
    isConnected: false,
  });

  const userSession = useMemo(() => new UserSession({ appConfig }), []);

  // Check connection status on component mount and periodically
  useEffect(() => {
    const checkConnection = () => {
      if (userSession.isUserSignedIn()) {
        const userData = userSession.loadUserData();
        if (userData && userData.profile && userData.profile.stxAddress) {
          const stxAddress = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
          
          setWalletState({
            isConnected: true,
            address: stxAddress,
            userSession
          });
        }
      } else {
        setWalletState(prev => ({
          ...prev,
          isConnected: false,
          address: undefined
        }));
      }
    };

    // Initial check
    checkConnection();

    // Periodic check for connection changes
    const intervalId = setInterval(checkConnection, 1000);
    
    return () => clearInterval(intervalId);
  }, [userSession]);

  const connectWallet = useCallback(async () => {
    try {
      showConnect({
        appDetails: {
          name: 'StackLend',
          icon: window.location.origin + '/favicon.ico',
        },
        redirectTo: '/',
        onFinish: () => {
          // Connection status will be updated by the useEffect above
          console.log('Wallet connected successfully');
        },
        userSession,
      });
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }, [userSession]);

  const disconnectWallet = useCallback(() => {
    try {
      if (userSession) {
        userSession.signUserOut();
        setWalletState({
          isConnected: false,
          address: undefined,
        });
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [userSession]);

  return {
    ...walletState,
    connect: connectWallet,
    disconnect: disconnectWallet,
  };
};
