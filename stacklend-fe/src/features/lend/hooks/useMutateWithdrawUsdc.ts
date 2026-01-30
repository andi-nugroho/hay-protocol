import {
  ORIGINAL_PACKAGE_ID,
  USDC_LENDING_POOL_ID,
  USDC_LENDING_POOL_MODULE_NAME,
} from "@/constants/contract/sui";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type UseMutateWithdrawUsdcParams = {
  receiptId: string;
  amount: number;
};

export function useMutateWithdrawUsdc() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  return useMutation({
    mutationFn: async (props: UseMutateWithdrawUsdcParams) => {
      if (!currentAccount) throw new Error("No connected wallet");

      const tx = new Transaction();
      
      // Call withdraw_usdc function
      tx.moveCall({
        target: `${ORIGINAL_PACKAGE_ID}::${USDC_LENDING_POOL_MODULE_NAME}::withdraw_usdc`,
        arguments: [
          tx.object(USDC_LENDING_POOL_ID), // Pool object
          tx.object(props.receiptId) // LendingReceipt NFT
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
        title: "USDC Withdrawal Successful! 💰",
        description: `Successfully withdrew ${variables.amount} USDC from the lending pool.`,
      });
    },
    onError: (error: Error) => {
      console.error("Withdraw USDC error:", error);
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}