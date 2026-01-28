import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Info, TrendingUp, Shield, Droplet, AlertCircle } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { hayyProtocolAPI, type SuggestResponse } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { PRICES_USD } from '@/data/tokens';

interface AddressCheckerProps {
  onAddressSuggestion?: (suggestions: SuggestResponse['suggestions']) => void;
}

// Pool configuration data
const POOL_CONFIG = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    collateralAsset: 'STX',
    totalSupply: 1000000, // Mock data - should come from backend
    availableLiquidity: 850000,
    loanToValue: 70, // 70%
    liquidationThreshold: 75, // 75%
    liquidationPenalty: 10, // 10%
    reserveFactor: 15, // 15%
    utilizationRate: 15, // (totalSupply - availableLiquidity) / totalSupply * 100
    color: 'blue'
  }
};

export function AddressChecker({ onAddressSuggestion }: AddressCheckerProps) {
  const currentAccount = useCurrentAccount();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkCurrentAddress = async () => {
    if (!currentAccount?.address) {
      setError('No Sui wallet connected');
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await hayyProtocolAPI.suggestForSuiAddress(currentAccount.address);
      setResult(response);

      if (response.suggestions && response.suggestions.length > 0) {
        onAddressSuggestion?.(response.suggestions);
      }
    } catch (err) {
      setError('Failed to check address. Make sure API server is running.');
      console.error('Address check error:', err);
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

  if (!currentAccount?.address) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Connect Your Wallet
            </CardTitle>
            <CardDescription>
              Connect your Sui wallet to check for collateral positions and view pool information
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const pool = POOL_CONFIG.USDC;
  const stxPrice = PRICES_USD.STX;
  const position = result?.position;

  return (
    <div className="space-y-6 w-full">
      {/* Pool Information - Full Width */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-blue-500" />
            {pool.symbol} Pool Information
          </CardTitle>
          <CardDescription>
            Collateral: {pool.collateralAsset} → Borrow: {pool.symbol}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Pool Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1 p-3 border rounded-lg">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Supply</p>
              </div>
              <p className="text-base font-bold">${pool.totalSupply.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pool size</p>
            </div>

            <div className="space-y-1 p-3 border rounded-lg">
              <div className="flex items-center gap-1.5">
                <Droplet className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <p className="text-base font-bold text-blue-600">${pool.availableLiquidity.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">To borrow</p>
            </div>

            <div className="space-y-1 p-3 border rounded-lg">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                <p className="text-xs text-muted-foreground">Utilization</p>
              </div>
              <p className="text-base font-bold">{pool.utilizationRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Pool usage</p>
            </div>

            <div className="space-y-1 p-3 border rounded-lg">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Reserve Factor</p>
              </div>
              <p className="text-base font-bold">{pool.reserveFactor}%</p>
              <p className="text-xs text-muted-foreground">Protocol fee</p>
            </div>
          </div>

          {/* Risk Parameters */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Parameters
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex justify-between items-center p-2 border rounded">
                <span className="text-sm text-muted-foreground">Loan-to-Value (LTV)</span>
                <Badge variant="secondary">{pool.loanToValue}%</Badge>
              </div>

              <div className="flex justify-between items-center p-2 border rounded">
                <span className="text-sm text-muted-foreground">Liquidation Threshold</span>
                <Badge variant="secondary">{pool.liquidationThreshold}%</Badge>
              </div>

              <div className="flex justify-between items-center p-2 border rounded">
                <span className="text-sm text-muted-foreground">Liquidation Penalty</span>
                <Badge variant="destructive">{pool.liquidationPenalty}%</Badge>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>LTV {pool.loanToValue}%:</strong> You can borrow up to {pool.loanToValue}% of your collateral value.
              {' • '}
              <strong>Liquidation at {pool.liquidationThreshold}%:</strong> Maintain health factor above 1.0 to avoid liquidation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
