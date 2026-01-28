import { useState, useCallback } from 'react';
import { 
  depositCollateral,
  withdrawCollateral,
  borrowCrossChain,
  signalRepayment,
  depositLending,
  withdrawLending,
  initAdmin,
  addToken,
  HAYYPROTOCOL_CONTRACTS
} from '@/lib/stacks-transactions';
import { STXToMicroSTX } from '@/lib/stacks-contract-reader';
import { FinishedTxData } from '@stacks/connect';
import { useStacks } from './use-stacks';

export interface TransactionState {
  loading: boolean;
  error: string | null;
  txId: string | null;
}

export const useStacksTransactions = () => {
  const { isConnected, userSession } = useStacks();
  
  const [collateralTxState, setCollateralTxState] = useState<TransactionState>({
    loading: false,
    error: null,
    txId: null
  });

  const [lendingTxState, setLendingTxState] = useState<TransactionState>({
    loading: false,
    error: null,
    txId: null
  });

  const [borrowTxState, setBorrowTxState] = useState<TransactionState>({
    loading: false,
    error: null,
    txId: null
  });

  const [repayTxState, setRepayTxState] = useState<TransactionState>({
    loading: false,
    error: null,
    txId: null
  });

  // Reset transaction state
  const resetState = (type: 'collateral' | 'lending' | 'borrow' | 'repay') => {
    const resetObj = { loading: false, error: null, txId: null };
    switch (type) {
      case 'collateral':
        setCollateralTxState(resetObj);
        break;
      case 'lending':
        setLendingTxState(resetObj);
        break;
      case 'borrow':
        setBorrowTxState(resetObj);
        break;
      case 'repay':
        setRepayTxState(resetObj);
        break;
    }
  };

  // Collateral operations
  const depositCollateralWrapper = useCallback(async (
    amountSTX: string,
    senderAddress: string,
    evmAddress?: string
  ) => {
    try {
      setCollateralTxState({ loading: true, error: null, txId: null });
      
      const microSTX = STXToMicroSTX(parseFloat(amountSTX)).toString();
      
      await depositCollateral(
        microSTX,
        (data: FinishedTxData) => {
          setCollateralTxState({ 
            loading: false, 
            error: null, 
            txId: data.txId 
          });
        },
        () => {
          setCollateralTxState({ 
            loading: false, 
            error: 'Transaction cancelled', 
            txId: null 
          });
        }
      );
    } catch (error) {
      setCollateralTxState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to deposit collateral', 
        txId: null 
      });
    }
  }, []);

  const withdrawCollateralWrapper = useCallback(async (
    amountSTX: string,
    senderAddress: string
  ) => {
    try {
      setCollateralTxState({ loading: true, error: null, txId: null });
      
      const microSTX = STXToMicroSTX(parseFloat(amountSTX)).toString();
      
      await withdrawCollateral(
        microSTX,
        (data: FinishedTxData) => {
          setCollateralTxState({ 
            loading: false, 
            error: null, 
            txId: data.txId 
          });
        },
        () => {
          setCollateralTxState({ 
            loading: false, 
            error: 'Transaction cancelled', 
            txId: null 
          });
        }
      );
    } catch (error) {
      setCollateralTxState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to withdraw collateral', 
        txId: null 
      });
    }
  }, []);

  // Lending operations
  const depositLendingWrapper = useCallback(async (
    amountSTX: string,
    senderAddress: string
  ) => {
    try {
      setLendingTxState({ loading: true, error: null, txId: null });
      
      const microSTX = STXToMicroSTX(parseFloat(amountSTX)).toString();
      
      await depositLending(
        microSTX,
        (data: FinishedTxData) => {
          setLendingTxState({ 
            loading: false, 
            error: null, 
            txId: data.txId 
          });
        },
        () => {
          setLendingTxState({ 
            loading: false, 
            error: 'Transaction cancelled', 
            txId: null 
          });
        }
      );
    } catch (error) {
      setLendingTxState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to deposit for lending', 
        txId: null 
      });
    }
  }, []);

  const withdrawLendingWrapper = useCallback(async (
    amountSTX: string,
    senderAddress: string
  ) => {
    try {
      setLendingTxState({ loading: true, error: null, txId: null });
      
      const microSTX = STXToMicroSTX(parseFloat(amountSTX)).toString();
      
      await withdrawLending(
        microSTX,
        (data: FinishedTxData) => {
          setLendingTxState({ 
            loading: false, 
            error: null, 
            txId: data.txId 
          });
        },
        () => {
          setLendingTxState({ 
            loading: false, 
            error: 'Transaction cancelled', 
            txId: null 
          });
        }
      );
    } catch (error) {
      setLendingTxState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to withdraw from lending', 
        txId: null 
      });
    }
  }, []);

  // Borrowing operations
  const borrowTokenWrapper = useCallback(async (
    tokenId: string,
    amount: string,
    evmAddress: string,
    senderAddress: string
  ) => {
    try {
      setBorrowTxState({ loading: true, error: null, txId: null });
      
      await borrowCrossChain(
        tokenId,
        amount,
        evmAddress,
        (data: FinishedTxData) => {
          setBorrowTxState({ 
            loading: false, 
            error: null, 
            txId: data.txId 
          });
        },
        () => {
          setBorrowTxState({ 
            loading: false, 
            error: 'Transaction cancelled', 
            txId: null 
          });
        }
      );
    } catch (error) {
      setBorrowTxState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to borrow token', 
        txId: null 
      });
    }
  }, []);

  // Repayment operations
  const repayTokenWrapper = useCallback(async (
    tokenId: string,
    amount: string,
    senderAddress: string
  ) => {
    try {
      setRepayTxState({ loading: true, error: null, txId: null });
      
      await signalRepayment(
        tokenId,
        amount,
        senderAddress, // This should be evmTxHash, but using senderAddress for now
        (data: FinishedTxData) => {
          setRepayTxState({ 
            loading: false, 
            error: null, 
            txId: data.txId 
          });
        },
        () => {
          setRepayTxState({ 
            loading: false, 
            error: 'Transaction cancelled', 
            txId: null 
          });
        }
      );
    } catch (error) {
      setRepayTxState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to signal repayment', 
        txId: null 
      });
    }
  }, []);

  // Admin Functions
  const executeInitAdmin = useCallback(async () => {
    try {
      console.log('Initializing admin...');
      await initAdmin(
        userSession,
        (data: FinishedTxData) => {
          console.log('Admin init success:', data);
        },
        () => {
          console.log('Admin init cancelled');
        }
      );
    } catch (error) {
      console.error('Admin init failed:', error);
      throw error;
    }
  }, [userSession]);

  const executeAddToken = useCallback(async (
    tokenId: string,
    chain: number = 1,
    apyBps: number = 800,
    liquidity: number = 1000000,
    status: number = 1
  ) => {
    try {
      console.log('Adding token:', tokenId);
      await addToken(
        tokenId,
        chain,
        apyBps,
        liquidity,
        status,
        userSession,
        (data: FinishedTxData) => {
          console.log('Add token success:', data);
        },
        () => {
          console.log('Add token cancelled');
        }
      );
    } catch (error) {
      console.error('Add token failed:', error);
      throw error;
    }
  }, [userSession]);

  return {
    // States
    collateralTxState,
    lendingTxState,
    borrowTxState,
    repayTxState,
    
    // Actions
    depositCollateral: depositCollateralWrapper,
    withdrawCollateral: withdrawCollateralWrapper,
    depositLending: depositLendingWrapper,
    withdrawLending: withdrawLendingWrapper,
    borrowToken: borrowTokenWrapper,
    repayToken: repayTokenWrapper,
    
    // Admin Actions
    executeInitAdmin,
    executeAddToken,
    
    // Utilities
    resetState
  };
};
