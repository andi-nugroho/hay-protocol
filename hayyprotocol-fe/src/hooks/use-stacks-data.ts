import { useState, useEffect, useCallback } from 'react';
import { 
  getAllUserData, 
  getBorrowTokenMeta, 
  getBorrowedAmount,
  microSTXToSTX,
  bpsToPercentage,
  type TokenMetadata 
} from '@/lib/stacks-contract-reader';

export interface CollateralData {
  collateralAmount: number;
  borrowedAmount: number;
  totalCollateral: number;
  totalBorrowed: number;
  liquidationThresholdBps: number;
  borrowApyBps: number;
}

export interface LendingData {
  lendBalance: number;
  totalLend: number;
  lendApyBps: number;
}

export interface BorrowedTokenData {
  tokenId: string;
  amount: number;
  metadata: TokenMetadata | null;
}

// Supported tokens for borrowing
// Only query for tokens that are actually registered in the contract
// For now, start with an empty list until tokens are properly registered
const SUPPORTED_TOKENS: string[] = [];

export const useStacksContractData = (userAddress?: string) => {
  const [collateralData, setCollateralData] = useState<CollateralData | null>(null);
  const [lendingData, setLendingData] = useState<LendingData | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, TokenMetadata>>({});
  const [borrowedTokens, setBorrowedTokens] = useState<BorrowedTokenData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all contract data
  const fetchAllData = useCallback(async () => {
    if (!userAddress || !userAddress.startsWith('S')) {
      console.log('No valid Stacks address provided, skipping contract calls');
      setCollateralData(null);
      setLendingData(null);
      setTokenMetadata({});
      setBorrowedTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user data from contracts
      const userData = await getAllUserData(userAddress);

      // Set collateral data with protocol constants
      setCollateralData({
        collateralAmount: microSTXToSTX(userData.collateral.collateralAmount),
        borrowedAmount: userData.collateral.borrowedTotal,
        totalCollateral: microSTXToSTX(userData.collateral.totalCollateral),
        totalBorrowed: userData.collateral.totalBorrowed,
        liquidationThresholdBps: 8000, // 80% - from contract constant
        borrowApyBps: 800, // 8% - from contract constant
      });

      setLendingData({
        lendBalance: microSTXToSTX(userData.lending.lendBalance),
        totalLend: microSTXToSTX(userData.lending.totalLend),
        lendApyBps: userData.lending.lendApyBps,
      });

      // Fetch token metadata and borrowed amounts
      const tokenMetadataPromises = SUPPORTED_TOKENS.map(token => 
        getBorrowTokenMeta(token).catch(error => {
          console.error(`Failed to get metadata for ${token}:`, error);
          return null;
        })
      );
      
      const borrowedAmountPromises = SUPPORTED_TOKENS.map(token => 
        getBorrowedAmount(userAddress, token).catch(error => {
          console.error(`Failed to get borrowed amount for ${token}:`, error);
          return 0;
        })
      );

      const [tokenMetadataResults, borrowedAmountResults] = await Promise.all([
        Promise.all(tokenMetadataPromises),
        Promise.all(borrowedAmountPromises)
      ]);

      // Process token metadata
      const metadata: Record<string, TokenMetadata> = {};
      const borrowedData: BorrowedTokenData[] = [];

      SUPPORTED_TOKENS.forEach((token, index) => {
        const meta = tokenMetadataResults[index];
        const borrowedAmount = borrowedAmountResults[index];

        if (meta) {
          metadata[token] = meta;
        }

        if (borrowedAmount > 0) {
          borrowedData.push({
            tokenId: token,
            amount: borrowedAmount,
            metadata: meta
          });
        }
      });

      setTokenMetadata(metadata);
      setBorrowedTokens(borrowedData);

    } catch (err) {
      console.error('Error fetching contract data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contract data');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const refreshData = () => {
    if (userAddress) {
      fetchAllData();
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    collateralData,
    lendingData,
    tokenMetadata,
    borrowedTokens,
    loading,
    error,
    refreshData,
    // Utility functions
    microSTXToSTX,
    bpsToPercentage,
  };
};
