import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Loader2, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCollateralStatus } from '@/features/common/hooks/useCollateralStatus';

interface ProcessingBannerProps {
  stacksAddress: string | null | undefined;
  initialCollateral?: number; // STX collateral amount BEFORE this deposit
  onComplete?: (newCollateral?: number) => void;
  autoHideAfter?: number; // milliseconds, default 5000
}

export function ProcessingBanner({ 
  stacksAddress,
  initialCollateral = 0,
  onComplete,
  autoHideAfter = 5000 
}: ProcessingBannerProps) {
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasDetectedIncrease, setHasDetectedIncrease] = useState(false);
  
  const { 
    data: status, 
    isLoading 
  } = useCollateralStatus(stacksAddress, !hidden);

  // Auto-hide after success (when collateral increases beyond initial)
  useEffect(() => {
    if (status?.status === 'registered' && status?.collateral) {
      const currentCollateral = status.collateral.stxAmount;
      
      // Check if collateral has increased beyond initial amount
      // This means the NEW deposit has been processed!
      if (currentCollateral > initialCollateral && !hasDetectedIncrease) {
        setHasDetectedIncrease(true);
        setProgress(100); // Set progress to 100% when increase detected
        onComplete?.(currentCollateral);
        const timer = setTimeout(() => {
          setHidden(true);
        }, autoHideAfter);
        return () => clearTimeout(timer);
      }
    }
  }, [status?.status, status?.collateral, initialCollateral, hasDetectedIncrease, onComplete, autoHideAfter]);

  // Animated progress bar
  useEffect(() => {
    if (status?.status === 'pending') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90; // Cap at 90% until confirmed
          return prev + 2;
        });
      }, 500);
      return () => clearInterval(interval);
    } else if (status?.status === 'registered') {
      setProgress(100);
    }
  }, [status?.status]);

  // Don't show if hidden or no address
  if (hidden || !stacksAddress) {
    return null;
  }

  // Initial loading
  if (isLoading && !status) {
    return (
      <Alert className="animate-in slide-in-from-top-5">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          <strong>Checking status...</strong>
        </AlertDescription>
      </Alert>
    );
  }

  // Pending - Still processing
  if (status?.status === 'pending') {
    return (
      <Alert className="animate-in slide-in-from-top-5 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
        <AlertDescription className="space-y-3">
          <div>
            <strong className="text-blue-900 dark:text-blue-100">
              ⏳ Processing Your Deposit
            </strong>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {status.message}
            </p>
            {status.estimatedTime && (
              <Badge variant="outline" className="mt-2 text-xs">
                Est. {status.estimatedTime}
              </Badge>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {progress < 50 ? 'Confirming transaction...' : 'Registering on Sui...'}
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Registered - Only show success if collateral has increased!
  if (status?.status === 'registered') {
    const currentCollateral = status.collateral?.stxAmount || 0;
    
    // DEBUG: Log values for troubleshooting
    console.log('🔍 ProcessingBanner Debug:', {
      currentCollateral,
      initialCollateral,
      hasDetectedIncrease,
      difference: currentCollateral - initialCollateral
    });
    
    // If collateral hasn't increased yet, show as pending (still processing)
    if (currentCollateral <= initialCollateral && !hasDetectedIncrease) {
      return (
        <Alert className="animate-in slide-in-from-top-5 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
          <AlertDescription className="space-y-3">
            <div>
              <strong className="text-blue-900 dark:text-blue-100">
                ⏳ Processing Your Deposit
              </strong>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Waiting for relayer to process your new deposit...
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Registering collateral increase on Sui...
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    // Only show success when increase is detected
    return (
      <Alert className="animate-in slide-in-from-top-5 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong className="text-green-900 dark:text-green-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                ✅ Ready to Borrow!
              </strong>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {status.message}
              </p>
            </div>
            
            {status.collateral && (
              <div className="text-right space-y-1">
                <Badge variant="secondary" className="text-xs">
                  {status.collateral.stxAmount.toFixed(2)} STX
                </Badge>
                <p className="text-xs text-green-600 dark:text-green-400">
                  ${status.collateral.borrowPower.toFixed(2)} borrow power
                </p>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (status?.status === 'error') {
    return (
      <Alert variant="destructive" className="animate-in slide-in-from-top-5">
        <AlertDescription>
          <strong>⚠️ Error</strong>
          <p className="text-sm mt-1">{status.message}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
