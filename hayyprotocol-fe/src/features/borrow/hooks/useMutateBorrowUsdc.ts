import {
  ORIGINAL_PACKAGE_ID,
  BORROW_CONTROLLER_MODULE_NAME,
  BORROW_REGISTRY_ID,
  USDC_LENDING_POOL_ID,
} from "@/constants/contract/sui";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type UseMutateBorrowUsdcParams = {
  amount: number;
};

export function useMutateBorrowUsdc() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  return useMutation({
    mutationFn: async (props: UseMutateBorrowUsdcParams) => {
      if (!currentAccount) throw new Error("No connected wallet");

      const tx = new Transaction();

      // Call borrow_usdc function
      tx.moveCall({
        target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::borrow_usdc`,
        arguments: [
          tx.object(BORROW_REGISTRY_ID), // Registry object
          tx.object(USDC_LENDING_POOL_ID), // USDC lending pool
          tx.pure.u64(props.amount * 1_000_000), // Amount in USDC units (6 decimals)
        ],
      });

      const { digest } = await signAndExecute({ transaction: tx });
      const txResult = await suiClient.waitForTransaction({
        digest,
        options: { showEffects: true },
      });

      if (!txResult.effects || txResult.effects.status.status !== "success")
        throw new Error("Transaction on-chain failed");

      return { response: txResult };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "USDC Borrow Successful! 💰",
        description: `Successfully borrowed ${variables.amount} USDC against your collateral.`,
      });
    },
    onError: (error: Error) => {
      console.error("Borrow USDC error:", error);
      toast({
        title: "Borrow Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}