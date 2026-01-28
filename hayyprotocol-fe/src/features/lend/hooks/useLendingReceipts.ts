import {
  ORIGINAL_PACKAGE_ID,
  USDC_LENDING_POOL_MODULE_NAME,
} from "@/constants/contract/sui";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

export interface LendingReceipt {
  id: string;
  poolId: string;
  lender: string;
  amount: number;
  depositedAt: number;
  displayAmount: string;
}

export function useLendingReceipts() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["lending-receipts", currentAccount?.address],
    queryFn: async (): Promise<LendingReceipt[]> => {
      if (!currentAccount?.address) return [];

      try {
        // Get all objects owned by user
        const objects = await suiClient.getOwnedObjects({
          owner: currentAccount.address,
          filter: {
            StructType: `${ORIGINAL_PACKAGE_ID}::${USDC_LENDING_POOL_MODULE_NAME}::LendingReceipt`,
          },
          options: {
            showContent: true,
            showType: true,
          },
        });

        const receipts: LendingReceipt[] = [];

        for (const obj of objects.data) {
          if (obj.data?.content && "fields" in obj.data.content) {
            const fields = obj.data.content.fields as any;

            console.log("Processing receipt fields:", fields);

            const receipt: LendingReceipt = {
              id: obj.data.objectId,
              poolId: fields.pool_id || "",
              lender: fields.lender || "",
              amount: parseInt(fields.amount || "0"),
              depositedAt: parseInt(fields.deposited_at || "0"),
              displayAmount: (
                parseInt(fields.amount || "0") / 1_000_000
              ).toFixed(2),
            };

            receipts.push(receipt);
          }
        }

        console.log("Processed receipts:", receipts);
        return receipts;
      } catch (error) {
        console.error("Error fetching lending receipts:", error);
        return [];
      }
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
