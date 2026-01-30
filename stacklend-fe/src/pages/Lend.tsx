import React, { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useMutateDepositUsdc } from "@/features/lend/hooks/useMutateDepositUsdc";
import { useMutateWithdrawUsdc } from "@/features/lend/hooks/useMutateWithdrawUsdc";
import { useLendingPoolData } from "@/features/lend/hooks/useLendingPoolData";
import { useLendingReceipts } from "@/features/lend/hooks/useLendingReceipts";
import { useUsdcBalance } from "@/features/common/hooks/useUsdcBalance";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Coins, TrendingUp, Info, DollarSign, PiggyBank, TrendingDown } from "lucide-react";

const Lend = () => {
  const currentAccount = useCurrentAccount();
  const [activeTab, setActiveTab] = useState('sui');
  const [depositAmount, setDepositAmount] = useState("");

  const {
    mutateAsync: mutateDepositUsdc,
    isPending: isDepositPending,
  } = useMutateDepositUsdc();

  const {
    mutateAsync: mutateWithdrawUsdc,
    isPending: isWithdrawPending,
  } = useMutateWithdrawUsdc();

  const {
    data: poolData,
    isLoading: isPoolDataLoading,
    refetch: refetchPoolData,
  } = useLendingPoolData();

  const {
    data: lendingReceipts = [],
    isLoading: isReceiptsLoading,
    refetch: refetchReceipts,
  } = useLendingReceipts();

  const {
    data: usdcBalance = 0,
    isLoading: isBalanceLoading,
  } = useUsdcBalance();

  const handleSupplyUSDC = async () => {
    if (!currentAccount) {
      toast({ title: "Please connect a Sui wallet first" });
      return;
    }

    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await mutateDepositUsdc({ amount });
      setDepositAmount(""); // Reset amount after success
      refetchPoolData(); // Refresh pool data after deposit
    } catch (error) {
      console.error("Deposit error:", error);
    }
  };

  const handleWithdrawReceipt = async (receiptId: string, amount: number) => {
    if (!currentAccount) {
      toast({ title: "Please connect a Sui wallet first" });
      return;
    }

    try {
      await mutateWithdrawUsdc({ 
        receiptId,
        amount: amount / 1_000_000 // Convert to display amount
      });
      refetchPoolData(); // Refresh pool data after withdrawal
      refetchReceipts(); // Refresh receipts after withdrawal
    } catch (error) {
      console.error("Withdraw error:", error);
    }
  };

  return (
    <>
      <SEO title="StackLend — Lend" description="Supply assets and earn yield." canonical="/lend" />
      <section className="space-y-6 animate-enter">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Lend Your Assets</h1>
          <p className="text-muted-foreground mt-1">Earn yield by supplying liquidity to lending pools.</p>
        </header>

        {/* Pool Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pool Liquidity</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isPoolDataLoading ? "..." : `$${(poolData?.totalDeposits || 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Available for borrowing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Deposits</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isPoolDataLoading ? "..." : `$${(poolData?.userDeposits || 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Earning {poolData?.interestRate || 8.5}% APY</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isPoolDataLoading ? "..." : `$${(poolData?.totalBorrowed || 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                {((poolData?.totalBorrowed || 0) / (poolData?.totalDeposits || 1) * 100).toFixed(1)}% utilization
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User's Lending Receipts */}
        {currentAccount && lendingReceipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Your Lending Receipts ({lendingReceipts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {isReceiptsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading receipts...</div>
                ) : (
                  lendingReceipts.map((receipt) => (
                    <div 
                      key={receipt.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {receipt.displayAmount} USDC
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Deposited: {new Date(receipt.depositedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          ID: {receipt.id.slice(0, 8)}...{receipt.id.slice(-4)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleWithdrawReceipt(receipt.id, receipt.amount)}
                        disabled={isDepositPending || isWithdrawPending}
                      >
                        {isWithdrawPending ? "Withdrawing..." : "Withdraw"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stacks" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Stacks Network
            </TabsTrigger>
            <TabsTrigger value="sui" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sui Network
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stacks" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">Bitcoin Security</Badge>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Stacks lending is coming soon! For now, try lending on Sui Network.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
                        STX
                      </div>
                      Stacks Lending
                    </span>
                    <Badge variant="outline">Soon</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    STX and sBTC lending pools will be available soon.
                  </div>
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sui" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">High Performance</Badge>
              <Badge variant="outline">Available Now</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      USD Coin (USDC)
                    </span>
                    <Badge variant="default">8.5% APY</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Stable coin lending with competitive rates on Sui
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    💰 Low risk • High liquidity • Stable returns
                  </div>
                  
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Deposit Amount</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="Enter USDC amount to lend"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      disabled={isDepositPending || isWithdrawPending}
                    />
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDepositAmount("1000")}
                        disabled={isDepositPending || isWithdrawPending}
                      >
                        1K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDepositAmount("5000")}
                        disabled={isDepositPending || isWithdrawPending}
                      >
                        5K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDepositAmount("10000")}
                        disabled={isDepositPending || isWithdrawPending}
                      >
                        10K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDepositAmount(usdcBalance.toString())}
                        disabled={isDepositPending || isWithdrawPending || isBalanceLoading}
                      >
                        Max
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      💳 Your USDC Balance: {isBalanceLoading ? "..." : `${usdcBalance.toLocaleString()} USDC`}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSupplyUSDC}
                    className="w-full"
                    disabled={isDepositPending || isWithdrawPending || !currentAccount}
                  >
                    {isDepositPending ? "Depositing..." : "Supply USDC"}
                  </Button>

                  {/* Hint for withdrawal */}
                  {lendingReceipts.length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      💡 To withdraw, use your lending receipts below
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
                        <img src="https://asset-metadata-service-production.s3.amazonaws.com/asset_icons/7a322b610252ca8a28b950773b0fb8855ebc2611e6611d20525284bcdd9fde63.png" />
                      </div>
                      Stacks Bitcoin (sBTC)
                    </span>
                    <Badge variant="outline">Soon</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    sBTC lending pool coming soon
                  </div>
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
};

export default Lend;
