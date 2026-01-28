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

type UseMutateDepositSbtcCollateralParams = {
  amount: number;
};

// Helper to prepare sBTC coins for transaction
async function prepareSbtcCoinForTx(
  amount: number,
  userAddress: string,
  client: any,
  tx: Transaction
) {
  // Get user's sBTC coins
  const coins = await client.getCoins({
    owner: userAddress,
    coinType: `${ORIGINAL_PACKAGE_ID}::mock_sbtc::MOCK_SBTC`,
  });

  if (!coins.data || coins.data.length === 0) {
    throw new Error("No sBTC coins found");
  }

  const totalAvailable = coins.data.reduce(
    (sum: number, coin: any) => sum + parseInt(coin.balance),
    0
  );

  const amountInMicroUnits = amount * 100_000_000; // sBTC has 8 decimals
  if (totalAvailable < amountInMicroUnits) {
    throw new Error(
      `Insufficient sBTC balance. Required: ${amount}, Available: ${
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

export function useMutateDepositSbtcCollateral() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  return useMutation({
    mutationFn: async (props: UseMutateDepositSbtcCollateralParams) => {
      if (!currentAccount) throw new Error("No connected wallet");

      const tx = new Transaction();

      // Prepare sBTC coin for transaction
      const sbtcCoin = await prepareSbtcCoinForTx(
        props.amount,
        currentAccount.address,
        suiClient,
        tx
      );

      // Call deposit_sbtc_collateral_sui function
      tx.moveCall({
        target: `${ORIGINAL_PACKAGE_ID}::${BORROW_CONTROLLER_MODULE_NAME}::deposit_sbtc_collateral_sui`,
        arguments: [
          tx.object(BORROW_REGISTRY_ID), // Registry object
          sbtcCoin, // sBTC coin to deposit
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
        title: "Collateral Deposit Successful! 🏦",
        description: `Successfully deposited ${variables.amount} sBTC as collateral.`,
      });
    },
    onError: (error: Error) => {
      console.error("Deposit sBTC collateral error:", error);
      toast({
        title: "Collateral Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
