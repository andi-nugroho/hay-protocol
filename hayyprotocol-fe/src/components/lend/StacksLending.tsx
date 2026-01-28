import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStacks } from "@/hooks/use-stacks";
import { useStacksContractData } from "@/hooks/use-stacks-data";
import { useSTXPosition } from "@/hooks/use-stx-position";
import { PRICES_USD } from "@/data/tokens";
import {
  depositCollateral,
  HAYYPROTOCOL_CONTRACTS,
} from "@/lib/stacks-transactions";
import { toast } from "@/hooks/use-toast";
import { Loader2, Coins, ArrowRightLeft, Wallet, ArrowUpDown } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { WithdrawModal } from "@/components/borrow/WithdrawModal";
import { ProcessingBanner } from "@/components/borrow/ProcessingBanner";

interface StacksLendingProps {
  className?: string;
}

export const StacksLending: React.FC<StacksLendingProps> = ({ className }) => {
  const { address, isConnected, connect, disconnect } = useStacks();
  const currentSuiAccount = useCurrentAccount();
  const { position: stxPosition, loading: positionLoading, refetch: refetchPosition } = useSTXPosition();

  const [collateralAmount, setCollateralAmount] = useState("");
  const [suiAddress, setSuiAddress] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showProcessingBanner, setShowProcessingBanner] = useState(false);
  const [depositedStacksAddress, setDepositedStacksAddress] = useState<string | null>(null);
  const [depositTxId, setDepositTxId] = useState<string | null>(null);
  const [initialCollateral, setInitialCollateral] = useState<number>(0);
  const [lastKnownCollateral, setLastKnownCollateral] = useState<number>(0);

  // Clear amounts when disconnected
  useEffect(() => {
    if (!isConnected) {
      setCollateralAmount("");
      setSuiAddress("");
    }
  }, [isConnected]);

  // Auto-fill Sui address when Sui wallet is connected
  useEffect(() => {
    if (currentSuiAccount?.address) {
      setSuiAddress(currentSuiAccount.address);
    }
  }, [currentSuiAccount]);

  // Track collateral changes from API (but ONLY update when not depositing)
  useEffect(() => {
    if (stxPosition?.stxCollateral !== undefined && !isDepositing && !showProcessingBanner) {
      console.log('📊 Updating lastKnownCollateral to:', stxPosition.stxCollateral);
      setLastKnownCollateral(stxPosition.stxCollateral);
    }
  }, [stxPosition?.stxCollateral, isDepositing, showProcessingBanner]);

  // Format amounts for display
  const formatAmount = (amount: number, decimals = 6) => {
    return (amount / Math.pow(10, decimals)).toFixed(6);
  };

  const formatAPY = (apyBps: number) => {
    return (apyBps / 100).toFixed(2) + "%";
  };

  const handleDepositCollateral = async () => {
    if (!address) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your Stacks wallet",
        variant: "destructive",
      });
      return;
    }

    if (!suiAddress || suiAddress.trim() === "") {
      toast({
        title: "Sui Address Required",
        description: "Please enter your Sui wallet address or connect Sui wallet",
        variant: "destructive",
      });
      return;
    }

    // Validate Sui address format (0x... and 66 chars total)
    if (!suiAddress.startsWith("0x") || suiAddress.length !== 66) {
      toast({
        title: "Invalid Sui Address",
        description: "Sui address must start with 0x and be 66 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid collateral amount",
        variant: "destructive",
      });
      return;
    }

    setIsDepositing(true);
    
    try {
      // Convert STX to microSTX (1 STX = 1,000,000 microSTX)
      const microSTX = Math.floor(
        parseFloat(collateralAmount) * 1_000_000,
      ).toString();

      // CRITICAL: Use frozen lastKnownCollateral instead of live stxPosition
      const collateralSnapshot = lastKnownCollateral;
      console.log('� Snapshot collateral BEFORE tx:', collateralSnapshot, 'stxPosition:', stxPosition);

      await depositCollateral(
        microSTX,
        suiAddress,
        (data) => {
          // Show success toast
          toast({
            title: "✅ Transaction Confirmed!",
            description: `Deposit confirmed. Processing registration on Sui...`,
            duration: 5000,
          });
          
          // NOW set the initial collateral from snapshot (not from current stxPosition which might be stale)
          console.log('💰 Setting initialCollateral to:', collateralSnapshot);
          setInitialCollateral(collateralSnapshot);
          
          // Clear input & show processing banner for ALL deposits
          setCollateralAmount("");
          setDepositedStacksAddress(address);
          setDepositTxId(data.txId || null);
          setShowProcessingBanner(true);
        },
        () => {
          toast({
            title: "Transaction Cancelled",
            description: "Collateral deposit was cancelled by user",
            variant: "default",
          });
        },
      );

      toast({
        title: "🔄 Transaction Submitted",
        description:
          "Collateral deposit transaction initiated. Please confirm in your wallet.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Collateral deposit error:", error);
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to deposit collateral",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleCrossChainBorrow = async () => {
    if (!address) {
      toast({
        title: "Wallet Connection Required",
        description:
          "Please connect your Stacks wallet for borrowing",
        variant: "destructive",
      });
      return;
    }

    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid borrow amount",
        variant: "destructive",
      });
      return;
    }

    setIsBorrowing(true);
    try {
      // Convert amount based on token decimals
      const decimals = borrowToken === "WBTC" ? 8 : 6;
      const tokenAmount = Math.floor(
        parseFloat(borrowAmount) * Math.pow(10, decimals),
      ).toString();

      await borrowCrossChain(
        borrowToken,
        tokenAmount,
        address, // Use Stacks address instead of EVM
        (data) => {
          toast({
            title: "Borrow Initiated!",
            description: `Borrowing ${borrowAmount} ${borrowToken}. Transaction: ${data.txId}`,
            duration: 15000,
          });
          setBorrowAmount("");
        },
        () => {
          toast({
            title: "Transaction Cancelled",
            description: "Cross-chain borrow was cancelled by user",
            variant: "default",
          });
        },
      );

      toast({
        title: "Transaction Submitted",
        description:
          "Borrow transaction initiated. Please confirm in your wallet.",
        duration: 8000,
      });
    } catch (error) {
      console.error("Cross-chain borrow error:", error);
      toast({
        title: "Borrow Failed",
        description: error.message || "Failed to initiate cross-chain borrow",
        variant: "destructive",
      });
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleRepayLoan = async () => {
    if (!address) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your Stacks wallet",
        variant: "destructive",
      });
      return;
    }

    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid repay amount",
        variant: "destructive",
      });
      return;
    }

    setIsRepaying(true);
    try {
      // Convert amount based on token decimals
      const decimals = repayToken === "WBTC" ? 8 : 6;
      const tokenAmount = Math.floor(
        parseFloat(repayAmount) * Math.pow(10, decimals),
      ).toString();

      await signalRepayment(
        repayToken,
        tokenAmount,
        address,
        (data) => {
          toast({
            title: "Repayment Signaled Successfully!",
            description: `${repayAmount} ${repayToken} repayment signaled. Transaction: ${data.txId}`,
            duration: 10000,
          });
          setRepayAmount("");
          refreshData(); // Refresh contract data
        },
        () => {
          toast({
            title: "Transaction Cancelled",
            description: "Loan repayment was cancelled by user",
            variant: "default",
          });
        },
      );

      toast({
        title: "Transaction Submitted",
        description:
          "Loan repayment transaction initiated. Please confirm in your wallet.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Loan repayment error:", error);
      toast({
        title: "Repayment Failed",
        description: error.message || "Failed to signal loan repayment",
        variant: "destructive",
      });
    } finally {
      setIsRepaying(false);
    }
  };

  const handleDepositLending = async () => {
    if (!address) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your Stacks wallet",
        variant: "destructive",
      });
      return;
    }

    if (!lendAmount || parseFloat(lendAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid lending amount",
        variant: "destructive",
      });
      return;
    }

    setIsLending(true);
    try {
      // Convert STX to microSTX (1 STX = 1,000,000 microSTX)
      const microSTX = Math.floor(
        parseFloat(lendAmount) * 1_000_000,
      ).toString();

      await depositLending(
        microSTX,
        (data) => {
          toast({
            title: "Lending Deposit Successful!",
            description: `${lendAmount} STX deposited for lending. Transaction: ${data.txId}`,
            duration: 10000,
          });
          setLendAmount("");
          refreshData(); // Refresh contract data
        },
        () => {
          toast({
            title: "Transaction Cancelled",
            description: "Lending deposit was cancelled by user",
            variant: "default",
          });
        },
      );

      toast({
        title: "Transaction Submitted",
        description:
          "Lending deposit transaction initiated. Please confirm in your wallet.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Lending deposit error:", error);
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to deposit for lending",
        variant: "destructive",
      });
    } finally {
      setIsLending(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            STX Collateral Deposit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <Wallet className="h-12 w-12 mx-auto text-gray-400" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Connect your Stacks wallet to deposit STX collateral
              </p>
              <p className="text-xs text-gray-500">
                Deposit STX as collateral to borrow USDC on Sui Network
              </p>
            </div>
            <Button onClick={connect} className="w-full">
              Connect Stacks Wallet
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                <strong>Contract:</strong>{" "}
                {HAYYPROTOCOL_CONTRACTS.COLLATERAL.address}
              </p>
              <p>
                <strong>Functions:</strong> deposit-collateral,
                withdraw-collateral, borrow
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          STX Collateral Deposit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Banner - Show after deposit */}
        {showProcessingBanner && depositedStacksAddress && (
          <ProcessingBanner 
            stacksAddress={depositedStacksAddress}
            initialCollateral={initialCollateral}
            onComplete={(newCollateral) => {
              // Refetch position data when registration complete
              refetchPosition();
              
              // Calculate deposit amount BEFORE resetting
              const depositAmount = (newCollateral || 0) - initialCollateral;
              console.log('✅ Deposit complete! Initial:', initialCollateral, 'New:', newCollateral, 'Added:', depositAmount);
              
              // Hide banner and RESET all state
              setShowProcessingBanner(false);
              setDepositedStacksAddress(null);
              setDepositTxId(null);
              setInitialCollateral(0); // Reset for next deposit
              
              toast({
                title: "🎉 Collateral Registered!",
                description: `+${depositAmount.toFixed(2)} STX added. Total: ${(newCollateral || 0).toFixed(2)} STX`,
                duration: 5000,
              });
            }}
          />
        )}

        {/* Wallet Status */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Stacks Wallet</span>
            <span className="text-green-600 font-medium">Connected</span>
          </div>
          <p className="text-sm font-mono font-medium break-all">{address}</p>
        </div>

        {/* Deposit Collateral */}
        <div className="space-y-3">
          <Label htmlFor="collateral" className="text-sm font-medium">
            Deposit STX Collateral
          </Label>

          {/* Sui Address Input */}
          <div className="space-y-2">
            <Label htmlFor="sui-address" className="text-xs text-muted-foreground">
              Sui Wallet Address (where you'll borrow)
            </Label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-mono font-medium break-all">
                {suiAddress || 'Not connected'}
              </p>
              {currentSuiAccount?.address ? (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Auto-filled from connected Sui wallet
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Connect Sui wallet to auto-fill
                </p>
              )}
            </div>
          </div>

          {/* STX Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="collateral-input" className="text-xs text-muted-foreground">
              STX Amount
            </Label>
            <Input
              id="collateral-input"
              type="number"
              placeholder="Enter STX amount (e.g., 100)"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              disabled={isDepositing}
            />
            <Button
              onClick={handleDepositCollateral}
              className="w-full"
              disabled={isDepositing || !suiAddress}
            >
              {isDepositing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Depositing...
                </>
              ) : (
                "Deposit Collateral"
              )}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-4">
          <Button
            onClick={disconnect}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Disconnect Stacks Wallet
          </Button>
        </div>
      </CardContent>

      {/* Withdraw Modal */}
      {currentSuiAccount?.address && stxPosition && (
        <WithdrawModal
          open={showWithdrawModal}
          onOpenChange={setShowWithdrawModal}
          maxWithdrawStx={stxPosition.maxWithdrawStx}
          suiAddress={currentSuiAccount.address}
          onSuccess={() => {
            refetchPosition();
            toast({
              title: "Withdrawal Successful",
              description: "Your STX collateral has been withdrawn successfully",
            });
          }}
        />
      )}
    </Card>
  );
};

export default StacksLending;
