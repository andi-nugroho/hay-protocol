import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Coins, 
  TrendingUp, 
  Users, 
  Zap, 
  Gift,
  Target,
  Clock,
  Star
} from 'lucide-react';

interface LiquidityBootstrapProps {
  poolType: 'USDC' | 'sBTC';
  currentLiquidity: number;
  targetLiquidity: number;
  onBootstrapDeposit: () => void;
}

export const LiquidityBootstrap: React.FC<LiquidityBootstrapProps> = ({
  poolType,
  currentLiquidity,
  targetLiquidity,
  onBootstrapDeposit
}) => {
  const liquidityPercentage = (currentLiquidity / targetLiquidity) * 100;
  const isLowLiquidity = liquidityPercentage < 20;
  
  const bootstrapIncentives = {
    USDC: {
      baseAPY: 2.5,
      bonusAPY: 12.0, // Extra APY for early lenders
      totalAPY: 14.5,
      stakingRewards: '500 STACK tokens',
      nftRewards: 'Early Lender NFT',
      minimumDeposit: 1000
    },
    sBTC: {
      baseAPY: 6.5,
      bonusAPY: 8.0,
      totalAPY: 14.5,
      stakingRewards: '250 STACK tokens',
      nftRewards: 'Pioneer Lender NFT', 
      minimumDeposit: 0.1
    }
  };

  const incentive = bootstrapIncentives[poolType];

  return (
    <div className="space-y-4">
      {/* Bootstrap Alert */}
      {isLowLiquidity && (
        <Alert className="border-amber-200 bg-amber-50">
          <Zap className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Bootstrap Phase Active!</strong> This pool needs initial liquidity. 
            Early lenders get massive bonus rewards! 🚀
          </AlertDescription>
        </Alert>
      )}

      {/* Liquidity Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Liquidity Progress
            </span>
            <Badge variant={isLowLiquidity ? "destructive" : "secondary"}>
              {liquidityPercentage.toFixed(1)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={liquidityPercentage} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Current: {currentLiquidity.toLocaleString()} {poolType}</span>
            <span>Target: {targetLiquidity.toLocaleString()} {poolType}</span>
          </div>
        </CardContent>
      </Card>

      {/* Bootstrap Incentives */}
      {isLowLiquidity && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Gift className="h-5 w-5" />
              Early Lender Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* APY Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {incentive.baseAPY}%
                </div>
                <div className="text-sm text-muted-foreground">Base APY</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  +{incentive.bonusAPY}%
                </div>
                <div className="text-sm text-muted-foreground">Bootstrap Bonus</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border-2 border-green-300">
                <div className="text-2xl font-bold text-green-700">
                  {incentive.totalAPY}%
                </div>
                <div className="text-sm text-green-600 font-medium">Total APY</div>
              </div>
            </div>

            {/* Additional Rewards */}
            <div className="space-y-2">
              <h4 className="font-semibold text-green-800">Bonus Rewards:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="h-4 w-4 text-yellow-600" />
                  <span>{incentive.stakingRewards}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-purple-600" />
                  <span>{incentive.nftRewards}</span>
                </div>
              </div>
            </div>

            {/* Bootstrap CTA */}
            <div className="pt-2">
              <Button 
                onClick={onBootstrapDeposit}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Bootstrap Pool (Min. {incentive.minimumDeposit} {poolType})
              </Button>
              <p className="text-xs text-green-700 mt-2 text-center">
                Limited time: Bootstrap rewards end when pool reaches 20% capacity
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protocol Owned Liquidity Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Protocol Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Protocol Owned Liquidity</span>
            <Badge variant="outline">10,000 {poolType}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Emergency Liquidity Reserve</span>
            <Badge variant="outline">5,000 {poolType}</Badge>
          </div>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Protocol will seed initial liquidity once bootstrap target is reached
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};