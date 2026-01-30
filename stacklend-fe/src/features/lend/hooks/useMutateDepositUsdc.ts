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
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type PrepareCoinForTxParams = {
  suiClient: SuiClient;
  owner: string;
  coin: { type: string; amount: number };
  tx: Transaction;
};

export async function prepareCoinForTx({
  suiClient,
  owner,
  coin,
  tx,
}: PrepareCoinForTxParams) {
  // For other coin types, we need to find and prepare the coin objects
  const coins = await suiClient.getCoins({ owner, coinType: coin.type });
  console.log("User coins of type", coin.type, coins);
  if (!coins.data || coins.data.length === 0)
    throw new Error(
      `You don't have any ${coin.type.split("::").pop()!} coins.`,
    );
  // If the user has more than one coin object, merge them into the primary one.
  const primaryCoin = tx.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx.mergeCoins(
      primaryCoin,
      coins.data.slice(1).map((c) => tx.object(c.coinObjectId)),
    );
  }
  return tx.splitCoins(primaryCoin, [coin.amount]);
}

type UseMutateDepositUsdcParams = {
  amount: number;
};

export function useMutateDepositUsdc() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  return useMutation({
    mutationFn: async (props: UseMutateDepositUsdcParams) => {
      if (!currentAccount) throw new Error("No connected wallet");

      console.log("Depositing USDC...");
      const tx = new Transaction();

      const [usdcCoin] = await prepareCoinForTx({
        suiClient,
        owner: currentAccount.address,
        coin: {
          type: `${ORIGINAL_PACKAGE_ID}::mock_usdc::MOCK_USDC`, // Type USDC coin
          amount: props.amount * Math.pow(10, 6),
        },
        tx,
      });

      tx.moveCall({
        target: `${ORIGINAL_PACKAGE_ID}::${USDC_LENDING_POOL_MODULE_NAME}::deposit_usdc`,
        arguments: [
          tx.object(USDC_LENDING_POOL_ID), // Pool object
          usdcCoin,
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
    onSuccess: (_data, variables) => {
      toast({
        title: "USDC Deposit Successful! 🎉",
        description: `Successfully deposited ${variables.amount} USDC to the lending pool.`,
      });
    },
    onError: (error: Error) => {
      console.error("Deposit USDC error:", error);
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
