import { SEO } from "@/components/SEO";
import { TOKENS, TokenSymbol, PRICES_USD } from "@/data/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMemo, useState, useEffect } from "react";
import { PositionTable } from "@/components/common/PositionTable";
import { StatCard } from "@/components/common/StatCard";
import { StacksLending } from "@/components/lend/StacksLending";
import { useBorrowPosition } from "@/features/borrow/hooks/useBorrowPosition";
import { useUsdcBalance } from "@/features/common/hooks/useUsdcBalance";
import { useSbtcBalance } from "@/features/common/hooks/useSbtcBalance";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useNavigate } from "react-router-dom";
import {
  Info,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { hayyProtocolAPI, type SuggestResponse } from "@/lib/api";
import { useSTXPosition } from "@/hooks/use-stx-position";
import { WithdrawModal } from "@/components/borrow/WithdrawModal";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();

  // Real Sui data hooks
  const { data: borrowPosition, isLoading: isLoadingPosition } =
    useBorrowPosition();
  const { data: sbtcBalance, isLoading: isSbtcBalanceLoading } =
    useSbtcBalance();
  const { data: usdcBalance, isLoading: isBalanceLoading } = useUsdcBalance();

  // STX Position hook
  const {
    position: stxPosition,
    loading: stxPositionLoading,
    refetch: refetchStxPosition,
  } = useSTXPosition();

  // Collateral Position from API
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const checkCurrentAddress = async () => {
    if (!currentAccount?.address) {
      setError("No Sui wallet connected");
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await hayyProtocolAPI.suggestForSuiAddress(
        currentAccount.address,
      );
      setResult(response);
    } catch (err) {
      setError("Failed to check address. Make sure API server is running.");
      console.error("Address check error:", err);
    } finally {
      setChecking(false);
    }
  };

  // Auto-check when account changes
  useEffect(() => {
    if (currentAccount?.address) {
      checkCurrentAddress();
    }
  }, [currentAccount?.address]);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Calculate health factor with proper color
  const healthFactorColor = useMemo(() => {
    if (!borrowPosition || borrowPosition.healthFactor > 100)
      return "text-green-600";
    if (borrowPosition.healthFactor > 2) return "text-green-600";
    if (borrowPosition.healthFactor > 1.5) return "text-yellow-600";
    return "text-red-600";
  }, [borrowPosition]);

  const stxPrice = PRICES_USD.STX;
  const position = result?.position;

  return (
    <>
      <SEO
        title="HayyProtocol — Dashboard"
        description="Overview of your collateral, borrows and health on HayyProtocol."
        canonical="/"
      />
      <section className="space-y-6 animate-enter">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">
            Your collateral, borrows, and risk overview on Sui Network.
          </p>
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total Collateral
                </p>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-3xl font-bold">
                {isLoadingPosition
                  ? "..."
                  : `${(borrowPosition?.sbtcCollateralSui || 0).toFixed(4)} sBTC`}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {borrowPosition?.stxCollateralStacks &&
                borrowPosition.stxCollateralStacks > 0
                  ? `+ ${borrowPosition.stxCollateralStacks.toFixed(2)} STX on Stacks`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Borrowed</p>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-3xl font-bold">
                {isLoadingPosition
                  ? "..."
                  : `$${(borrowPosition?.usdcBorrowed || 0).toFixed(2)} USDC`}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                On Sui Network
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Health Factor</p>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className={`text-3xl font-bold ${healthFactorColor}`}>
                {isLoadingPosition
                  ? "..."
                  : borrowPosition?.healthFactor &&
                      borrowPosition.healthFactor > 100
                    ? "∞"
                    : borrowPosition?.healthFactor.toFixed(2) || "∞"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {borrowPosition?.usdcBorrowed && borrowPosition.usdcBorrowed > 0
                  ? "Safe"
                  : "No debt"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Quick Actions</p>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button
                  variant="default"
                  size="sm"
                  disabled={!borrowPosition || borrowPosition.usdcBorrowed <= 0}
                  onClick={() => navigate("/borrow")}
                  className="w-full"
                >
                  Repay
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    !borrowPosition ||
                    (borrowPosition.sbtcCollateralSui <= 0 &&
                      borrowPosition.stxCollateralStacks <= 0)
                  }
                  onClick={() => navigate("/borrow")}
                  className="w-full"
                >
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Positions table */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Your Positions</h2>
          <PositionTable
            rows={[
              {
                symbol: "sBTC",
                collateral: borrowPosition?.sbtcCollateralSui || 0,
                borrowed: 0,
                apy: 0,
                status:
                  borrowPosition && borrowPosition.sbtcCollateralSui > 0
                    ? "Active"
                    : "Inactive",
              },
              {
                symbol: "STX",
                collateral: borrowPosition?.stxCollateralStacks || 0,
                borrowed: 0,
                apy: 0,
                status:
                  borrowPosition && borrowPosition.stxCollateralStacks > 0
                    ? "Active"
                    : "Inactive",
              },
              {
                symbol: "USDC",
                collateral: 0,
                borrowed: borrowPosition?.usdcBorrowed || 0,
                apy: 8.5,
                status:
                  borrowPosition && borrowPosition.usdcBorrowed > 0
                    ? "Active"
                    : "Inactive",
              },
            ]}
          />
        </div>

        {/* Sui DeFi Integration */}
        <div className="mt-8 space-y-6">
          {/* Cross-Chain Stacks Position */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold">
              Stacks Network - Cross-Chain Collateral
            </h3>
            <p className="text-sm text-muted-foreground -mt-4 mb-4">
              Deposit STX on Stacks as collateral to{" "}
              <Button
                variant="link"
                className="p-0 h-auto underline"
                onClick={() => navigate("/borrow")}
              >
                borrow
              </Button>{" "}
              USDC on Sui Network.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Collateral Position */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {position && position.stxCollateral > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    Your Collateral Position
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cross-chain collateral status for Sui address
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Address Display & Refresh */}
                  {currentAccount?.address && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Connected Address
                        </p>
                        <p className="text-sm font-mono font-medium">
                          {truncateAddress(currentAccount.address)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkCurrentAddress}
                        disabled={checking}
                      >
                        {checking ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Position
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Loading State */}
                  {checking && (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Position Data */}
                  {!checking && result && (
                    <>
                      {position && position.stxCollateral > 0 ? (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Active Position Found!</strong> You have STX
                            collateral deposited from Stacks.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No collateral position found. Deposit STX from
                            Stacks to start borrowing on Sui.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Position Stats Grid */}
                      {position && position.stxCollateral > 0 && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">
                                STX Collateral
                              </p>
                              <p className="text-lg font-bold">
                                {position.stxCollateral.toFixed(2)} STX
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ≈ $
                                {(position.stxCollateral * stxPrice).toFixed(2)}
                              </p>
                            </div>

                            <div className="space-y-1 p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">
                                Borrow Power
                              </p>
                              <p className="text-lg font-bold text-green-600">
                                $
                                {(
                                  position.stxCollateral *
                                  stxPrice *
                                  0.7
                                ).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                70% LTV
                              </p>
                            </div>

                            <div className="space-y-1 p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">
                                USDC Borrowed
                              </p>
                              <p className="text-lg font-bold">
                                ${position.usdcBorrowed.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                On Sui Network
                              </p>
                            </div>

                            <div className="space-y-1 p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">
                                Health Factor
                              </p>
                              <p
                                className={`text-lg font-bold ${
                                  position.usdcBorrowed === 0
                                    ? "text-green-600"
                                    : (position.stxCollateral * stxPrice) /
                                          position.usdcBorrowed >
                                        2
                                      ? "text-green-600"
                                      : (position.stxCollateral * stxPrice) /
                                            position.usdcBorrowed >
                                          1.5
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                }`}
                              >
                                {position.usdcBorrowed === 0
                                  ? "∞"
                                  : (
                                      (position.stxCollateral * stxPrice) /
                                      position.usdcBorrowed
                                    ).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {position.usdcBorrowed > 0
                                  ? "Active debt"
                                  : "No debt"}
                              </p>
                            </div>
                          </div>

                          {/* Withdraw Button */}
                          {stxPosition && (
                            <>
                              <Button
                                onClick={() => setShowWithdrawModal(true)}
                                variant="default"
                                className="w-full"
                                disabled={
                                  stxPositionLoading ||
                                  stxPosition.maxWithdrawStx <= 0
                                }
                              >
                                <ArrowUpDown className="h-4 w-4 mr-2" />
                                Withdraw STX Directly
                              </Button>

                              {stxPosition.hasOutstandingDebt &&
                                stxPosition.maxWithdrawStx <= 0 && (
                                  <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                      ⚠️ Pay off your USDC debt to unlock collateral for withdrawal
                                    </AlertDescription>
                                  </Alert>
                                )}
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <StacksLending />
            </div>
          </div>
        </div>
      </section>

      {/* Withdraw Modal */}
      {currentAccount?.address && stxPosition && (
        <WithdrawModal
          open={showWithdrawModal}
          onOpenChange={setShowWithdrawModal}
          maxWithdrawStx={stxPosition.maxWithdrawStx}
          suiAddress={currentAccount.address}
          onSuccess={() => {
            refetchStxPosition();
            checkCurrentAddress(); // Refresh API data
            toast({
              title: "Withdrawal Successful",
              description:
                "Your STX collateral has been withdrawn successfully",
            });
          }}
        />
      )}
    </>
  );
};

export default Dashboard;
