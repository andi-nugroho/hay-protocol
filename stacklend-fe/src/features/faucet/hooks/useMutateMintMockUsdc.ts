import {
  FAUCET_POOL_ID,
  FAUCET_POOL_MODULE_NAME,
  ORIGINAL_PACKAGE_ID,
} from "@/constants/contract/sui";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

type UseMutateMintMockUsdcParams = {
  amount: number;
};

export function useMutateMintMockUsdc() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  return useMutation({
    mutationFn: async (props: UseMutateMintMockUsdcParams) => {
      if (!currentAccount) throw new Error("No connected wallet");

      const tx = new Transaction();
      tx.moveCall({
        target: `${ORIGINAL_PACKAGE_ID}::${FAUCET_POOL_MODULE_NAME}::mint_usdc`,
        arguments: [
          tx.object(FAUCET_POOL_ID),
          tx.pure.u64(props.amount * Math.pow(10, 6)),
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
  });
}
