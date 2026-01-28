import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BORROWABLE_TOKENS, TOKENS, TokenSymbol, PRICES_USD } from "@/data/tokens";
import { useAppState } from "@/hooks/use-app-state";
import { useMemo, useState, useEffect } from "react";
import { BridgeDialog } from "@/components/common/BridgeDialog";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SuiBorrowing } from "@/components/borrow/SuiBorrowing";
import { BorrowDrawer } from "@/components/borrow/BorrowDrawer";
import BorrowTable from "@/components/borrow/BorrowTable";
import { useMutateDepositSbtcCollateral } from "@/features/borrow/hooks/useMutateDepositSbtcCollateral";
import { useMutateWithdrawSbtcCollateral } from "@/features/borrow/hooks/useMutateWithdrawSbtcCollateral";
import { useMutateBorrowUsdc } from "@/features/borrow/hooks/useMutateBorrowUsdc";
import { useMutateRepayUsdc } from "@/features/borrow/hooks/useMutateRepayUsdc";
import { useBorrowPosition } from "@/features/borrow/hooks/useBorrowPosition";
import { useUsdcBalance } from "@/features/common/hooks/useUsdcBalance";
import { useSbtcBalance } from "@/features/common/hooks/useSbtcBalance";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Coins, TrendingUp, Info, AlertTriangle, Shield, DollarSign, ArrowUpDown } from "lucide-react";
import { AddressChecker } from "@/components/common/AddressChecker";

const Borrow = () => {
  const { wallet, totals, addBorrowed, addCollateral } = useAppState();
  const currentAccount = useCurrentAccount();
  const [selected, setSelected] = useState<null | TokenSymbol>(null);
  const [bridging, setBridging] = useState(false);
  const [activeTab, setActiveTab] = useState('sui'); // Default to Sui tab
  const [collateralAmount, setCollateralAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  // Get user balances
  const { data: sbtcBalance, isLoading: isSbtcBalanceLoading } = useSbtcBalance();
  const { data: usdcBalance, isLoading: isBalanceLoading } = useUsdcBalance();

  // Set default collateral amount based on user's sBTC balance
  useEffect(() => {
    if (sbtcBalance && sbtcBalance > 0 && collateralAmount === "") {
      const defaultAmount = Math.min(sbtcBalance, 0.01);
      setCollateralAmount(defaultAmount.toFixed(4));
    }
  }, [sbtcBalance]);

  // Borrow hooks
  const {
    mutateAsync: mutateDepositSbtcCollateral,
    isPending: isDepositingCollateral,
  } = useMutateDepositSbtcCollateral();

  const {
    mutateAsync: mutateWithdrawSbtcCollateral,
    isPending: isWithdrawingCollateral,
  } = useMutateWithdrawSbtcCollateral();

  const {
    mutateAsync: mutateBorrowUsdc,
    isPending: isBorrowingUsdc,
  } = useMutateBorrowUsdc();

  const {
    mutateAsync: mutateRepayUsdc,
    isPending: isRepayingUsdc,
  } = useMutateRepayUsdc();

  const {
    data: borrowPosition,
    isLoading: isLoadingPosition,
    refetch: refetchPosition,
  } = useBorrowPosition();

  // Set default borrow amount based on available borrowing capacity
  useEffect(() => {
    if (borrowPosition && borrowAmount === "") {
      const availableToBorrow = borrowPosition.maxBorrowUsd - borrowPosition.usdcBorrowed;
      if (availableToBorrow > 0) {
        // Set to available amount, but cap at reasonable amount (e.g., max 1000)
        const defaultAmount = Math.min(Math.floor(availableToBorrow), 1000);
        setBorrowAmount(defaultAmount.toString());
      }
    }
  }, [borrowPosition, borrowAmount]);

  console.log("Borrow Position in UI:", borrowPosition, "Loading:", isLoadingPosition);

  // Mock liquidity data - in real app, fetch from smart contracts
  const [liquidityData] = useState({
    usdc: { current: 2500, target: 50000, available: 2500 },
    sbtc: { current: 0.5, target: 10, available: 0.5 }
  });

  // Sui borrowable tokens
  const suiBorrowTokens = useMemo(() => [
    { ...TOKENS.USDC, chain: 'Sui', available: true }
  ], []);

  const onConfirm = async (symbol: TokenSymbol, lockStx: number, amount: number) => {
    setBridging(true);
    // Simulate cross-chain transaction
    await new Promise(r => setTimeout(r, 3000));
    setBridging(false);
    addCollateral("STX", lockStx);
    addBorrowed(symbol, amount);
    toast({ 
      title: `Borrowed ${amount} ${symbol}`, 
      description: `Locked ${lockStx} STX as collateral on ${activeTab === 'stacks' ? 'Stacks' : 'Sui'}.` 
    });
  };

  const handleDepositCollateral = async () => {
    if (!currentAccount) {
      toast({ title: "Please connect a Sui wallet first" });
      return;
    }

    const amount = parseFloat(collateralAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await mutateDepositSbtcCollateral({ amount });
      setCollateralAmount(""); // Reset amount after success
      refetchPosition(); // Refresh position data
    } catch (error) {
      console.error("Deposit collateral error:", error);
    }
  };

  const handleWithdrawCollateral = async () => {
    if (!currentAccount) {
      toast({ title: "Please connect a Sui wallet first" });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!borrowPosition || amount > borrowPosition.sbtcCollateralSui) {
      toast({
        title: "Insufficient Collateral",
        description: "You don't have enough sBTC collateral to withdraw",
        variant: "destructive",
      });
      return;
    }

    try {
      await mutateWithdrawSbtcCollateral({ amount });
      setWithdrawAmount(""); // Reset amount after success
      refetchPosition(); // Refresh position data
    } catch (error) {
      console.error("Withdraw collateral error:", error);
    }
  };

  const handleBorrowUsdc = async () => {
    if (!currentAccount) {
      toast({ title: "Please connect a Sui wallet first" });
      return;
    }

    const amount = parseFloat(borrowAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!borrowPosition) {
      toast({
        title: "No Borrow Position",
        description: "Please deposit collateral first",
        variant: "destructive",
      });
      return;
    }

    const availableToBorrow = borrowPosition.maxBorrowUsd - borrowPosition.usdcBorrowed;
    // Use a small tolerance for floating point precision issues
    const tolerance = 0.01;
    if (amount > (availableToBorrow + tolerance)) {
      toast({
        title: "Insufficient Borrowing Power",
        description: `You can only borrow up to $${Math.floor(availableToBorrow)}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await mutateBorrowUsdc({ amount });
      setBorrowAmount(""); // Reset amount after success
      refetchPosition(); // Refresh position data
    } catch (error) {
      console.error("Borrow USDC error:", error);
    }
  };

  const handleRepayUsdc = async () => {
    if (!currentAccount) {
      toast({ title: "Please connect a Sui wallet first" });
      return;
    }

    const amount = parseFloat(repayAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!borrowPosition || amount > borrowPosition.usdcBorrowed) {
      toast({
        title: "Amount Too High",
        description: `You can only repay up to $${borrowPosition?.usdcBorrowed.toLocaleString() || 0} (your current debt)`,
        variant: "destructive",
      });
      return;
    }

    try {
      await mutateRepayUsdc({ amount });
      setRepayAmount(""); // Reset amount after success
      refetchPosition(); // Refresh position data
    } catch (error) {
      console.error("Repay USDC error:", error);
    }
  };

  const currentTotalsUSD = { collateralUSD: totals.usd.collateral, borrowedUSD: totals.usd.borrowed };

  const isLowLiquidity = (poolType: 'usdc' | 'sbtc') => {
    const data = liquidityData[poolType];
    return (data.current / data.target) < 0.2; // Less than 20% of target
  };

  return (
    <>
      <SEO title="HayyProtocol — Borrow" description="Borrow assets against your collateral. Cross-chain borrowing available." canonical="/borrow" />
      <section className="space-y-6 animate-enter">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Borrow Assets</h1>
          <p className="text-muted-foreground mt-1">Borrow against your collateral across multiple blockchains.</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

          {/* Stacks Tab */}
          <TabsContent value="stacks" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">Bitcoin Security</Badge>
              <Badge variant="outline">Coming Soon</Badge>
            </div>

            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-muted-foreground" />
                  Stacks Network Borrowing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Coming Soon!</strong> Direct borrowing on Stacks Network is currently under development.
                    <br /><br />
                    For now, you can:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Deposit STX collateral on the <strong>Lend</strong> page</li>
                      <li>Use <strong>Sui Network</strong> tab to borrow USDC against your STX collateral</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg font-medium">🚧 Feature Under Development</p>
                  <p className="text-sm mt-2">Stay tuned for updates!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sui Tab */}
          <TabsContent value="sui" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">High Performance</Badge>
              <Badge variant="outline">sBTC Collateral</Badge>
            </div>

            {/* USDC Pool Information - Full Width */}
            <AddressChecker />

            {/* User Position Overview */}
            {borrowPosition && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Your Borrow Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Total Collateral</div>
                      <div className="text-2xl font-bold">
                        ${borrowPosition.totalCollateralUsd.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {borrowPosition.stxCollateralStacks > 0 && (
                          <div>{borrowPosition.stxCollateralStacks.toFixed(2)} STX on Stacks</div>
                        )}
                        {borrowPosition.sbtcCollateralSui > 0 && (
                          <div>{borrowPosition.sbtcCollateralSui.toFixed(4)} sBTC on Sui</div>
                        )}
                        {borrowPosition.stxCollateralStacks === 0 && borrowPosition.sbtcCollateralSui === 0 && (
                          <div>No collateral deposited</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Max Borrowing Power</div>
                      <div className="text-2xl font-bold">
                        ${borrowPosition.maxBorrowUsd.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600">70% LTV</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Health Factor</div>
                      <div className={`text-2xl font-bold ${
                        borrowPosition.healthFactor > 2 ? 'text-green-600' : 
                        borrowPosition.healthFactor > 1.5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {borrowPosition.healthFactor > 100 ? '∞' : borrowPosition.healthFactor.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {borrowPosition.usdcBorrowed > 0 ? `$${borrowPosition.usdcBorrowed.toLocaleString()} borrowed` : 'No debt'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deposit Collateral Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
                        ₿
                      </div>
                      Manage sBTC Collateral
                    </span>
                    <Badge variant="default">70% LTV</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Deposit or withdraw sBTC collateral on Sui
                  </div>

                  {/* Current Collateral Display */}
                  {borrowPosition && borrowPosition.sbtcCollateralSui > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium">Current Collateral</div>
                      <div className="text-lg font-bold">{borrowPosition.sbtcCollateralSui.toFixed(4)} sBTC</div>
                      <div className="text-xs text-muted-foreground">
                        ≈ ${(borrowPosition.sbtcCollateralSui * 65000).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  {/* Deposit Section */}
                  <div className="space-y-2">
                    <Label htmlFor="collateral-amount">Deposit sBTC Amount</Label>
                    <Input
                      id="collateral-amount"
                      type="number"
                      placeholder="0.01"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(e.target.value)}
                      disabled={isDepositingCollateral || isWithdrawingCollateral}
                      step="0.001"
                    />
                    <div className="text-xs text-muted-foreground">
                      🪙 Your sBTC Balance: {isSbtcBalanceLoading ? "..." : sbtcBalance ? `${sbtcBalance.toFixed(4)} sBTC` : "0.0000 sBTC"}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleDepositCollateral}
                    className="w-full"
                    disabled={isDepositingCollateral || isWithdrawingCollateral || !currentAccount}
                  >
                    {isDepositingCollateral ? "Depositing..." : "Deposit sBTC Collateral"}
                  </Button>

                  {/* Withdraw Section - Show only if user has collateral */}
                  {borrowPosition && borrowPosition.sbtcCollateralSui > 0 && (
                    <>
                      <div className="border-t pt-4 space-y-2">
                        <Label htmlFor="withdraw-amount">Withdraw sBTC Amount</Label>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          placeholder="Enter withdrawal amount"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          disabled={isDepositingCollateral || isWithdrawingCollateral}
                        />
                        <div className="text-xs text-muted-foreground">
                          Available: {borrowPosition.sbtcCollateralSui.toFixed(4)} sBTC
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleWithdrawCollateral}
                        variant="outline"
                        className="w-full"
                        disabled={
                          isDepositingCollateral || 
                          isWithdrawingCollateral || 
                          !currentAccount ||
                          (borrowPosition && borrowPosition.usdcBorrowed > 0)
                        }
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        {isWithdrawingCollateral ? "Withdrawing..." : "Withdraw sBTC Collateral"}
                      </Button>
                      
                      {/* Show warning when withdraw is disabled due to outstanding debt */}
                      {borrowPosition && borrowPosition.usdcBorrowed > 0 && (
                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                          ⚠️ Cannot withdraw collateral while you have outstanding debt. 
                          Please repay your ${borrowPosition.usdcBorrowed.toLocaleString()} USDC loan first.
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Borrow USDC Card */}
              <Card className={borrowPosition && borrowPosition.maxBorrowUsd > 0 ? "" : "opacity-50"}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      Borrow USDC
                    </span>
                    <Badge variant="default">8% APR</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {borrowPosition && borrowPosition.maxBorrowUsd > 0 
                      ? "Borrow USDC against your sBTC collateral"
                      : "Deposit collateral first to unlock borrowing"
                    }
                  </div>
                  
                  {borrowPosition && borrowPosition.maxBorrowUsd > 0 ? (
                    <>
                      {/* Current Debt Display */}
                      {borrowPosition.usdcBorrowed > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-sm font-medium text-red-700">Current Debt</div>
                          <div className="text-lg font-bold text-red-700">${borrowPosition.usdcBorrowed.toLocaleString()} USDC</div>
                          <div className="text-xs text-red-600">
                            Health Factor: {borrowPosition.healthFactor > 100 ? '∞' : borrowPosition.healthFactor.toFixed(2)}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="borrow-amount">USDC Amount</Label>
                        <Input
                          id="borrow-amount"
                          type="number"
                          placeholder={borrowPosition ? `${Math.floor(borrowPosition.maxBorrowUsd - borrowPosition.usdcBorrowed)}` : "Enter USDC amount"}
                          value={borrowAmount}
                          onChange={(e) => setBorrowAmount(e.target.value)}
                          disabled={isDepositingCollateral || isWithdrawingCollateral || isBorrowingUsdc}
                        />
                        <div className="text-xs text-green-600 font-medium">
                          Available to borrow: ${(borrowPosition.maxBorrowUsd - borrowPosition.usdcBorrowed).toLocaleString()}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleBorrowUsdc}
                        className="w-full"
                        disabled={isDepositingCollateral || isWithdrawingCollateral || isBorrowingUsdc || isRepayingUsdc || !currentAccount}
                      >
                        {isBorrowingUsdc ? "Borrowing..." : "Borrow USDC"}
                      </Button>

                      {/* Repay Section - Show only if user has debt */}
                      {borrowPosition.usdcBorrowed > 0 && (
                        <>
                          <div className="border-t pt-4 space-y-2">
                            <Label htmlFor="repay-amount">Repay USDC Amount</Label>
                            <Input
                              id="repay-amount"
                              type="number"
                              placeholder={`Enter amount (debt: $${borrowPosition.usdcBorrowed})`}
                              value={repayAmount}
                              onChange={(e) => setRepayAmount(e.target.value)}
                              disabled={isDepositingCollateral || isWithdrawingCollateral || isBorrowingUsdc || isRepayingUsdc}
                            />
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRepayAmount(Math.floor(borrowPosition.usdcBorrowed / 2).toString())}
                                disabled={isRepayingUsdc}
                              >
                                50%
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRepayAmount(borrowPosition.usdcBorrowed.toString())}
                                disabled={isRepayingUsdc}
                              >
                                All
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total debt: ${borrowPosition.usdcBorrowed.toLocaleString()} • 
                              Your USDC: {isBalanceLoading ? "..." : `${usdcBalance.toLocaleString()}`}
                            </div>
                          </div>
                          
                          <Button 
                            onClick={handleRepayUsdc}
                            className="w-full"
                            disabled={isDepositingCollateral || isWithdrawingCollateral || isBorrowingUsdc || isRepayingUsdc || !currentAccount || !repayAmount}
                          >
                            {isRepayingUsdc ? "Repaying..." : "Repay USDC"}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <Button disabled className="w-full">
                      Deposit Collateral First
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <BorrowDrawer
          open={selected !== null}
          onOpenChange={(v) => !v && setSelected(null)}
          token={selected ? TOKENS[selected] : null}
          currentTotalsUSD={currentTotalsUSD}
          onConfirm={async (lockStx, amt) => { if (selected) { await onConfirm(selected, lockStx, amt); setSelected(null); } }}
        />

        <BridgeDialog open={bridging} />
      </section>
    </>
  );
};

export default Borrow;
