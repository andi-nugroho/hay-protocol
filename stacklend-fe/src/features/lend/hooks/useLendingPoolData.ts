import {
  ORIGINAL_PACKAGE_ID,
  USDC_LENDING_POOL_ID,
  USDC_LENDING_POOL_MODULE_NAME,
} from "@/constants/contract/sui";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

export function useLendingPoolData() {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();

  return useQuery({
    queryKey: ["lending-pool-data", USDC_LENDING_POOL_ID, currentAccount?.address],
    queryFn: async () => {
      // Get lending pool object data
      const poolObject = await suiClient.getObject({
        id: USDC_LENDING_POOL_ID,
        options: { showContent: true },
      });

      if (
        !poolObject.data?.content ||
        poolObject.data.content.dataType !== "moveObject"
      ) {
        throw new Error("Invalid pool object");
      }

      const poolData = poolObject.data.content.fields as any;

      // Extract data from contract fields
      const usdcBalance = parseInt(poolData.usdc_balance || "0");
      const totalLent = parseInt(poolData.total_lent || "0");
      const accumulatedYield = parseInt(poolData.accumulated_yield || "0");
      const apyBps = parseInt(poolData.apy_bps || "500"); // Default 5% APY

      // Calculate total deposits (balance + lent out)
      const totalDeposits = usdcBalance + totalLent;
      
      // Get user deposits if connected
      const userDeposits = currentAccount ? await getUserDeposits(currentAccount.address, poolData.lender_deposits) : 0;

      return {
        totalDeposits: totalDeposits / 1_000_000, // Convert from 6 decimals to regular number
        totalBorrowed: totalLent / 1_000_000, // Convert from 6 decimals
        availableLiquidity: usdcBalance / 1_000_000, // Available for borrowing
        accumulatedYield: accumulatedYield / 1_000_000,
        interestRate: apyBps / 100, // Convert basis points to percentage (500 bps = 5%)
        userDeposits: userDeposits / 1_000_000, // Convert from 6 decimals
        utilizationRate: totalDeposits > 0 ? (totalLent / totalDeposits * 100) : 0,
      };
    },
    enabled: !!USDC_LENDING_POOL_ID,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  async function getUserDeposits(userAddress: string, lenderDepositsTable: any) {
    try {
      // For Table data structure, we need to query the table contents
      // This is a simplified approach - in production you might need dynamic field access
      if (lenderDepositsTable?.fields?.id?.id) {
        // Try to get user's deposit from the table
        const tableId = lenderDepositsTable.fields.id.id;
        
        // Query dynamic fields of the table for this user's address
        const dynamicFields = await suiClient.getDynamicFields({
          parentId: tableId,
        });
        
        // Look for the user's address in the dynamic fields
        const userField = dynamicFields.data.find(field => 
          field.name.type === "address" && field.name.value === userAddress
        );
        
        if (userField) {
          const fieldObject = await suiClient.getDynamicFieldObject({
            parentId: tableId,
            name: {
              type: "address",
              value: userAddress,
            },
          });
          
          if (fieldObject.data?.content?.dataType === "moveObject") {
            const value = (fieldObject.data.content.fields as any).value;
            return parseInt(value || "0");
          }
        }
      }
      
      return 0;
    } catch (error) {
      console.error("Error fetching user deposits:", error);
      return 0;
    }
  }
}

