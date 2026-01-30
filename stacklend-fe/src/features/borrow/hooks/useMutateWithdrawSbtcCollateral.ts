import {
  ORIGINAL_PACKAGE_ID,
  BORROW_CONTROLLER_MODULE_NAME,
  BORROW_REGISTRY_ID,
} from "@/constants/contract/sui";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type UseMutateWithdrawSbtcCollateralParams = {
  amount: number;
};

export function useMutateWithdrawSbtcCollateral() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  return useMutation({
    mutationFn: async (props: UseMutateWithdrawSbtcCollateralParams) => {
      if (!currentAccount) throw new Error("No connected wallet");

      const tx = new Transaction();

      // Call withdraw_sbtc_collateral_sui function (need to add this to smart contract)
      tx.moveCall({
        target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::withdraw_sbtc_collateral_sui`,
        arguments: [
          tx.object(BORROW_REGISTRY_ID), // Registry object
          tx.pure.u64(props.amount * 100_000_000), // Amount in sBTC units (8 decimals)
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
        title: "Collateral Withdrawal Successful! 💰",
        description: `Successfully withdrew ${variables.amount} sBTC collateral.`,
      });
    },
    onError: (error: Error) => {
      console.error("Withdraw sBTC collateral error:", error);
      toast({
        title: "Collateral Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}