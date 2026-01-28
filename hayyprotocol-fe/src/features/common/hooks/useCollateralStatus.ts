import { useQuery } from "@tanstack/react-query";

export interface CollateralStatusResponse {
  status: 'pending' | 'registered' | 'error' | 'invalid';
  message: string;
  stacksAddress?: string;
  suiAddress?: string;
  estimatedTime?: string;
  collateral?: {
    stxAmount: number;
    borrowPower: number;
    objectId: string;
  };
  error?: string;
}

/**
 * Hook to check collateral registration status on Sui
 * Polls backend until status changes from 'pending' to 'registered'
 * @param stacksAddress - Stacks address to check
 * @param enabled - Whether to enable polling (default: true when stacksAddress exists)
 */
export function useCollateralStatus(
  stacksAddress: string | null | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["collateral-status", stacksAddress],
    queryFn: async (): Promise<CollateralStatusResponse> => {
      if (!stacksAddress) {
        return {
          status: 'invalid',
          message: 'No Stacks address provided'
        };
      }

      try {
        // Get API base URL from environment (already includes /api prefix)
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        
        const response = await fetch(
          `${apiBaseUrl}/collateral-status/${stacksAddress}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error("Error fetching collateral status:", error);
        return {
          status: 'error',
          message: 'Failed to check collateral status',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },
    enabled: !!stacksAddress && enabled,
    // Keep polling while enabled (parent controls when to stop)
    refetchInterval: (query) => {
      const data = query.state.data;
      
      // Stop polling on error
      if (data?.status === 'error') {
        console.log('❌ Stopping polling - error encountered');
        return false;
      }
      
      // Stop polling on invalid
      if (data?.status === 'invalid') {
        return false;
      }
      
      // Continue polling every 2 seconds (even if registered)
      // Parent component will disable polling via 'enabled' prop when done
      console.log('🔄 Polling for collateral status...');
      return 2000;
    },
    // Retry on network errors
    retry: 2, // Reduce retry count
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    // Cache data to prevent excessive refetches
    staleTime: 1000, // Consider data fresh for 1 second
    gcTime: 30000, // Keep in cache for 30 seconds
  });
}
