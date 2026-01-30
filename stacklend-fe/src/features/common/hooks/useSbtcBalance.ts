import { ORIGINAL_PACKAGE_ID } from "@/constants/contract/sui";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

export function useSbtcBalance() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["sbtc-balance", currentAccount?.address],
    queryFn: async (): Promise<number> => {
      if (!currentAccount?.address) return 0;

      try {
        // Get user's sBTC coins
        const coins = await suiClient.getCoins({
          owner: currentAccount.address,
          coinType: `${ORIGINAL_PACKAGE_ID}::mock_sbtc::MOCK_SBTC`,
        });

        if (!coins.data || coins.data.length === 0) {
          return 0;
        }

        // Sum all sBTC coin balances
        const totalBalance = coins.data.reduce(
          (sum: number, coin: any) => sum + parseInt(coin.balance),
          0
        );

        // Convert from micro units (8 decimals) to display units
        return totalBalance / 100_000_000;
      } catch (error) {
        console.error("Error fetching sBTC balance:", error);
        return 0;
      }
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}