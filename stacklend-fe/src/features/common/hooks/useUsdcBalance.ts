import { ORIGINAL_PACKAGE_ID } from "@/constants/contract/sui";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

export function useUsdcBalance() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["usdc-balance", currentAccount?.address],
    queryFn: async (): Promise<number> => {
      if (!currentAccount?.address) return 0;

      try {
        // Get user's USDC coins
        const coins = await suiClient.getCoins({
          owner: currentAccount.address,
          coinType: `${ORIGINAL_PACKAGE_ID}::mock_usdc::MOCK_USDC`,
        });

        if (!coins.data || coins.data.length === 0) {
          return 0;
        }

        // Sum all USDC coin balances
        const totalBalance = coins.data.reduce(
          (sum: number, coin: any) => sum + parseInt(coin.balance),
          0
        );

        // Convert from micro units (6 decimals) to display units
        return totalBalance / 1_000_000;
      } catch (error) {
        console.error("Error fetching USDC balance:", error);
        return 0;
      }
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}