import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { TOKENS, PRICES_USD } from '@/data/tokens';
import { useSbtcBalance } from '@/features/common/hooks/useSbtcBalance';
import { 
  Lock, 
  TrendingDown, 
  Info, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Coins
} from 'lucide-react';

interface CollateralPosition {
  sbtcAmount: number;
  sbtcValueUSD: number;
  borrowCapacityUSD: number;
  currentDebtUSD: number;
  healthFactor: number;
  ltv: number;
}

interface SuiBorrowingProps {
  onCollateralDeposit?: (amount: number) => void;
  onBorrow?: (amount: number) => void;
}

export const SuiBorrowing = ({
  onCollateralDeposit,
  onBorrow
}: SuiBorrowingProps) => {
  // Get user's sBTC balance
  const { data: sbtcBalance, isLoading: isSbtcBalanceLoading } = useSbtcBalance();
  
  // Collateral state
  const [sbtcCollateralAmount, setSbtcCollateralAmount] = useState('');
  const [isDepositingCollateral, setIsDepositingCollateral] = useState(false);
  
  // Borrowing state
  const [usdcBorrowAmount, setUsdcBorrowAmount] = useState('');
  const [isBorrowing, setIsBorrowing] = useState(false);
  
  // User position (mock data - in real app, fetch from contract)
  const [position, setPosition] = useState<CollateralPosition | null>(null);
  
  // Mock pool liquidity
  const poolLiquidity = 125000; // USDC available
  
  // Set default collateral amount based on user's sBTC balance
  useEffect(() => {
    if (sbtcBalance && sbtcBalance > 0 && sbtcCollateralAmount === '') {
      // Set default to user's full balance or 0.01 (whichever is smaller)
      const defaultAmount = Math.min(sbtcBalance, 0.01);
      setSbtcCollateralAmount(defaultAmount.toFixed(4));
    }
  }, [sbtcBalance]);
  
  useEffect(() => {
    // Mock user position - in real app, fetch from borrow_controller
    setPosition({
      sbtcAmount: 0.05, // User has 0.05 sBTC collateral
      sbtcValueUSD: 0.05 * PRICES_USD.sBTC,
      borrowCapacityUSD: 0.05 * PRICES_USD.sBTC * 0.7, // 70% LTV
      currentDebtUSD: 1200, // Already borrowed $1200 USDC
      healthFactor: 2.1,
      ltv: 40 // 40% current LTV
    });
  }, []);
  
  const handleDepositCollateral = async () => {
    const amount = parseFloat(sbtcCollateralAmount);
    if (!amount || amount <= 0) return;
    
    setIsDepositingCollateral(true);
    try {
      // Call smart contract to deposit collateral
      await onCollateralDeposit?.(amount);
      
      // Update position (in real app, refetch from contract)
      if (position) {
        const newSbtcAmount = position.sbtcAmount + amount;
        const newValueUSD = newSbtcAmount * PRICES_USD.sBTC;
        setPosition({
          ...position,
          sbtcAmount: newSbtcAmount,
          sbtcValueUSD: newValueUSD,
          borrowCapacityUSD: newValueUSD * 0.7,
          healthFactor: (newValueUSD * 0.7) / position.currentDebtUSD,
          ltv: (position.currentDebtUSD / newValueUSD) * 100
        });
      }
      
      setSbtcCollateralAmount('');
    } catch (error) {
      console.error('Collateral deposit failed:', error);
    } finally {
      setIsDepositingCollateral(false);
    }
  };
  
  const handleBorrow = async () => {
    const amount = parseFloat(usdcBorrowAmount);
    if (!amount || amount <= 0) return;
    
    setIsBorrowing(true);
    try {
      // Call smart contract to borrow from pool
      await onBorrow?.(amount);
      
      // Update position
      if (position) {
        const newDebtUSD = position.currentDebtUSD + amount;
        setPosition({
          ...position,
          currentDebtUSD: newDebtUSD,
          healthFactor: (position.sbtcValueUSD * 0.7) / newDebtUSD,
          ltv: (newDebtUSD / position.sbtcValueUSD) * 100
        });
      }
      
      setUsdcBorrowAmount('');
    } catch (error) {
      console.error('Borrow failed:', error);
    } finally {
      setIsBorrowing(false);
    }
  };
  
  const availableToBorrow = position 
    ? Math.max(0, position.borrowCapacityUSD - position.currentDebtUSD)
    : 0;
    
  const isHealthy = position ? position.healthFactor > 1.5 : false;
  const hasCollateral = position ? position.sbtcAmount > 0 : false;

  return (
    <div className="space-y-6">
      {/* Position Overview */}
      {position && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Your Borrowing Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {position.sbtcAmount.toFixed(4)} sBTC
                </div>
                <div className="text-xs text-muted-foreground">Collateral</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  ${position.currentDebtUSD.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Borrowed</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                  {position.healthFactor.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Health Factor</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {position.ltv.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">LTV</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Borrow Capacity Used</span>
                <span>{position.ltv.toFixed(1)}% / 70%</span>
              </div>
              <Progress value={position.ltv} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Deposit Collateral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              Deposit sBTC Collateral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Deposit sBTC as collateral to unlock borrowing capacity. Your sBTC will be locked until you repay your debt.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="sbtc-collateral">sBTC Amount</Label>
              <Input
                id="sbtc-collateral"
                type="number"
                value={sbtcCollateralAmount}
                onChange={(e) => setSbtcCollateralAmount(e.target.value)}
                placeholder="0.01"
                step="0.001"
              />
              {sbtcCollateralAmount && (
                <div className="text-xs text-muted-foreground">
                  ≈ ${(parseFloat(sbtcCollateralAmount) * PRICES_USD.sBTC).toLocaleString()} USD
                  <br />
                  Borrowing capacity: ${(parseFloat(sbtcCollateralAmount) * PRICES_USD.sBTC * 0.7).toLocaleString()} USD
                </div>
              )}
              {sbtcBalance && (
                <div className="text-xs text-muted-foreground">
                  🪙 Your sBTC Balance: {sbtcBalance.toFixed(4)} sBTC
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSbtcCollateralAmount('0.01')}
              >
                0.01
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSbtcCollateralAmount('0.005')}
              >
                0.005
              </Button>
              {sbtcBalance && sbtcBalance > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSbtcCollateralAmount(sbtcBalance.toString())}
                >
                  Max ({sbtcBalance.toFixed(4)})
                </Button>
              )}
            </div>
            
            <Button 
              onClick={handleDepositCollateral}
              disabled={isDepositingCollateral || !sbtcCollateralAmount || parseFloat(sbtcCollateralAmount) <= 0}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isDepositingCollateral ? (
                <>
                  <Lock className="h-4 w-4 mr-2 animate-spin" />
                  Depositing Collateral...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Deposit sBTC Collateral
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* Step 2: Borrow USDC */}
        <Card className={hasCollateral ? '' : 'opacity-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full ${hasCollateral ? 'bg-blue-500' : 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold`}>
                2
              </div>
              Borrow USDC
              {!hasCollateral && <Badge variant="secondary">Requires Collateral</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasCollateral ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You need to deposit sBTC collateral first before you can borrow USDC.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Available to borrow: <strong>${availableToBorrow.toLocaleString()} USD</strong>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="usdc-borrow">USDC Amount</Label>
                  <Input
                    id="usdc-borrow"
                    type="number"
                    value={usdcBorrowAmount}
                    onChange={(e) => setUsdcBorrowAmount(e.target.value)}
                    placeholder="1000"
                    step="0.01"
                    disabled={!hasCollateral}
                  />
                  <div className="text-xs text-muted-foreground">
                    Pool liquidity: {poolLiquidity.toLocaleString()} USDC
                    {usdcBorrowAmount && (
                      <>
                        <br />
                        Interest rate: <strong>8% APR</strong>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUsdcBorrowAmount('1000')}
                    disabled={!hasCollateral}
                  >
                    $1K
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUsdcBorrowAmount(Math.min(availableToBorrow, 5000).toString())}
                    disabled={!hasCollateral}
                  >
                    $5K
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUsdcBorrowAmount(availableToBorrow.toString())}
                    disabled={!hasCollateral}
                  >
                    Max
                  </Button>
                </div>
                
                <Button 
                  onClick={handleBorrow}
                  disabled={isBorrowing || !hasCollateral || !usdcBorrowAmount || parseFloat(usdcBorrowAmount) <= 0 || parseFloat(usdcBorrowAmount) > availableToBorrow}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isBorrowing ? (
                    <>
                      <TrendingDown className="h-4 w-4 mr-2 animate-spin" />
                      Borrowing...
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Borrow {usdcBorrowAmount} USDC
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Process Flow Explanation */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-gray-600" />
            How Borrowing Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold mx-auto">
                1
              </div>
              <h4 className="font-semibold">Deposit Collateral</h4>
              <p className="text-muted-foreground">
                Your sBTC is locked in the borrow controller as collateral (jaminan)
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mx-auto">
                2
              </div>
              <h4 className="font-semibold">Borrow from Pool</h4>
              <p className="text-muted-foreground">
                USDC comes from the lending pool funded by lenders (not from your collateral)
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold mx-auto">
                3
              </div>
              <h4 className="font-semibold">Pay Interest</h4>
              <p className="text-muted-foreground">
                Your interest payments go to lenders as yield. Repay to unlock collateral.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};