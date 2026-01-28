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

type UseMutateRepayUsdcParams = {
  amount: number;
};

// Helper to prepare USDC coins for transaction
async function prepareUsdcCoinForTx(
  amount: number,
  userAddress: string,
  client: any,
  tx: Transaction
) {
  // Get user's USDC coins
  const coins = await client.getCoins({
    owner: userAddress,
    coinType: `${ORIGINAL_PACKAGE_ID}::mock_usdc::MOCK_USDC`,
  });

  if (!coins.data || coins.data.length === 0) {
    throw new Error("No USDC coins found");
  }

  const totalAvailable = coins.data.reduce(
    (sum: number, coin: any) => sum + parseInt(coin.balance),
    0
  );

  const amountInMicroUnits = amount * 1_000_000; // USDC has 6 decimals
  if (totalAvailable < amountInMicroUnits) {
    throw new Error(
      `Insufficient USDC balance. Required: ${amount}, Available: ${
        totalAvailable / 1_000_000
      }`
    );
  }

  // If single coin has enough balance, use it directly
  const singleCoinWithEnoughBalance = coins.data.find(
    (coin: any) => parseInt(coin.balance) >= amountInMicroUnits
  );

  if (singleCoinWithEnoughBalance) {
    const coin = tx.object(singleCoinWithEnoughBalance.coinObjectId);
    const [splitCoin] = tx.splitCoins(coin, [tx.pure.u64(amountInMicroUnits)]);
    return splitCoin;
  }

  // Otherwise, merge multiple coins
  const [primaryCoin, ...otherCoins] = coins.data.map((coin: any) =>
    tx.object(coin.coinObjectId)
  );

  if (otherCoins.length > 0) {
    tx.mergeCoins(primaryCoin, otherCoins);
  }

  const [splitCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(amountInMicroUnits)]);
  return splitCoin;
}

export function useMutateRepayUsdc() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  return useMutation({
    mutationFn: async (props: UseMutateRepayUsdcParams) => {
      if (!currentAccount) throw new Error("No connected wallet");

      const tx = new Transaction();

      // Prepare USDC coin for transaction
      const usdcCoin = await prepareUsdcCoinForTx(
        props.amount,
        currentAccount.address,
        suiClient,
        tx
      );

      // Call repay_usdc function
      tx.moveCall({
        target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::repay_usdc`,
        arguments: [
          tx.object(BORROW_REGISTRY_ID), // Registry object
          tx.object(USDC_LENDING_POOL_ID), // USDC lending pool
          usdcCoin, // USDC coin for repayment
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
        title: "USDC Repayment Successful! 💰",
        description: `Successfully repaid ${variables.amount} USDC debt.`,
      });
    },
    onError: (error: Error) => {
      console.error("Repay USDC error:", error);
      toast({
        title: "Repayment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}