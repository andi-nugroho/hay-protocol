import React, { createContext } from 'react';
import { useStacksWallet } from '../hooks/use-stacks-wallet';
import { UserSession } from '@stacks/connect';

interface StacksContextValue {
  address?: string;
  isConnected: boolean;
  userSession?: UserSession;
  connect: () => void;
  disconnect: () => void;
}

const StacksContext = createContext<StacksContextValue | undefined>(undefined);

export { StacksContext };

export const StacksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stacksWallet = useStacksWallet();

  const value: StacksContextValue = {
    address: stacksWallet.address,
    isConnected: stacksWallet.isConnected,
    userSession: stacksWallet.userSession,
    connect: stacksWallet.connect,
    disconnect: stacksWallet.disconnect,
  };

  return <StacksContext.Provider value={value}>{children}</StacksContext.Provider>;
};
