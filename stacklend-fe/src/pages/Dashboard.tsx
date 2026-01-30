import { SEO } from "@/components/SEO";
import { TOKENS, TokenSymbol } from "@/data/tokens";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { PositionTable } from "@/components/common/PositionTable";
import { StatCard } from "@/components/common/StatCard";
import { StacksLending } from "@/components/lend/StacksLending";
import { useBorrowPosition } from "@/features/borrow/hooks/useBorrowPosition";
import { useUsdcBalance } from "@/features/common/hooks/useUsdcBalance";
import { useSbtcBalance } from "@/features/common/hooks/useSbtcBalance";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();

  // Real Sui data hooks
  const { data: borrowPosition, isLoading: isLoadingPosition } = useBorrowPosition();
  const { data: sbtcBalance, isLoading: isSbtcBalanceLoading } = useSbtcBalance();
  const { data: usdcBalance, isLoading: isBalanceLoading } = useUsdcBalance();

  // Calculate real totals from Sui data
  const realTotals = useMemo(() => {
    if (!borrowPosition) return { collateralUSD: 0, borrowedUSD: 0, healthFactor: "∞" };
    
    const sbtcPrice = 60000; // Approximate sBTC price in USD
    const collateralUSD = borrowPosition.sbtcCollateralSui * sbtcPrice;
    const borrowedUSD = borrowPosition.usdcBorrowed;
    const healthFactor = borrowedUSD > 0 ? (collateralUSD * 0.7 / borrowedUSD).toFixed(2) : "∞";
    
    return { collateralUSD, borrowedUSD, healthFactor };
  }, [borrowPosition]);

  const borrowedAssets = useMemo(() => {
    if (!borrowPosition || borrowPosition.usdcBorrowed <= 0) return [];
    return [TOKENS.USDC];
  }, [borrowPosition]);

  const firstBorrowed = borrowedAssets[0]?.symbol as TokenSymbol | undefined;

  return (
    <>
      <SEO title="StackLend — Dashboard" description="Overview of your collateral, borrows and health on StackLend Sui." canonical="/" />
      <section className="space-y-6 animate-enter">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground mt-1">Your collateral, borrows, and risk overview on Sui Network.</p>
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Collateral"
            value={isLoadingPosition ? "Loading..." : `${(borrowPosition?.sbtcCollateralSui || 0).toFixed(4)} sBTC`}
            hint={`≈ $${realTotals.collateralUSD.toFixed(2)} USD`}
          />
          <StatCard
            title="Total Borrowed"
            value={isLoadingPosition ? "Loading..." : `$${(borrowPosition?.usdcBorrowed || 0).toFixed(2)} USDC`}
            hint={`Borrowed on Sui Network`}
          />
          <StatCard
            title="Health Factor"
            value={isLoadingPosition ? "Loading..." : realTotals.healthFactor}
            hint="Higher is safer. Based on 70% LTV of sBTC collateral."
          />
          <div className="card-brut p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-muted-foreground">Quick Actions</h3>
              <span aria-label="info" className="cursor-help select-none">ⓘ</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button 
                variant="brutal" 
                disabled={!borrowPosition || borrowPosition.usdcBorrowed <= 0} 
                onClick={() => navigate('/borrow')}
              >
                Repay
              </Button>
              <Button 
                variant="brutal" 
                disabled={!borrowPosition || borrowPosition.sbtcCollateralSui <= 0} 
                onClick={() => navigate('/borrow')}
              >
                Withdraw
              </Button>
            </div>
          </div>
        </div>

        {/* Positions table */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Your Positions</h2>
          <PositionTable
            rows={[
              { 
                symbol: "sBTC", 
                collateral: borrowPosition?.sbtcCollateralSui || 0, 
                borrowed: 0, // sBTC is collateral, not borrowed
                apy: 0, 
                status: "Active" 
              },
              { 
                symbol: "USDC", 
                collateral: 0, // USDC is borrowed, not collateral
                borrowed: borrowPosition?.usdcBorrowed || 0, 
                apy: 8.5, 
                status: "Active" 
              },
            ]}
          />
        </div>

        {/* Sui DeFi Integration */}
        <div className="mt-8 space-y-6">
          {/* Sui Lending */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Sui Lending & Borrowing</h2>
              <p className="text-muted-foreground mb-4">
                Deposit sBTC as collateral and borrow USDC on Sui Network. Visit the <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/borrow')}>Borrow page</Button> to manage your positions.
              </p>
              <StacksLending />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
