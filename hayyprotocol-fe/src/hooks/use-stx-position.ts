import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { hayyProtocolAPI } from '@/lib/api';

interface STXPosition {
  stxCollateral: number;
  maxWithdrawStx: number;
  hasOutstandingDebt: boolean;
  usdcBorrowed: number;
}

export const useSTXPosition = () => {
  const currentAccount = useCurrentAccount();
  const [position, setPosition] = useState<STXPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async () => {
    if (!currentAccount?.address) {
      setPosition(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await hayyProtocolAPI.getPositionBySuiAddress(currentAccount.address);

      if (result.success && result.position) {
        const pos = result.position;
        setPosition({
          stxCollateral: pos.stxCollateral || 0,
          maxWithdrawStx: Math.max(0, (pos.stxCollateral || 0) - (pos.usdcBorrowed || 0) / 0.8 / 37), // Assuming $37 STX price and 80% LTV
          hasOutstandingDebt: (pos.usdcBorrowed || 0) > 0,
          usdcBorrowed: pos.usdcBorrowed || 0
        });
      } else {
        setPosition({
          stxCollateral: 0,
          maxWithdrawStx: 0,
          hasOutstandingDebt: false,
          usdcBorrowed: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch STX position:', err);
      setError('Failed to fetch position data');
      setPosition(null);
    } finally {
      setLoading(false);
    }
  }, [currentAccount?.address]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return {
    position,
    loading,
    error,
    refetch: fetchPosition
  };
};