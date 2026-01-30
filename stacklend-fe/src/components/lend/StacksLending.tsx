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
import {
  depositCollateral,
  withdrawCollateral,
  borrowCrossChain,
  signalRepayment,
  depositLending,
  STACKLEND_CONTRACTS,
} from "@/lib/stacks-transactions";
import { toast } from "@/hooks/use-toast";
import { Loader2, Coins, ArrowRightLeft, Wallet } from "lucide-react";

interface StacksLendingProps {
  className?: string;
}

export const StacksLending: React.FC<StacksLendingProps> = ({ className }) => {
  const { address, isConnected, connect, disconnect } = useStacks();

  const [collateralAmount, setCollateralAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [lendAmount, setLendAmount] = useState("");
  const [borrowToken, setBorrowToken] = useState<"USDC" | "USDT" | "WBTC">(
    "USDC",
  );
  const [repayToken, setRepayToken] = useState<"USDC" | "USDT" | "WBTC">(
    "USDC",
  );
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [isLending, setIsLending] = useState(false);

  // Clear amounts when disconnected
  useEffect(() => {
    if (!isConnected) {
      setCollateralAmount("");
      setWithdrawAmount("");
      setBorrowAmount("");
      setRepayAmount("");
      setLendAmount("");
    }
  }, [isConnected]);

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

      await depositCollateral(
        microSTX,
        (data) => {
          toast({
            title: "Collateral Deposited Successfully!",
            description: `${collateralAmount} STX deposited. Transaction: ${data.txId}`,
            duration: 10000,
          });
          setCollateralAmount("");
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
        title: "Transaction Submitted",
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

  const handleWithdrawCollateral = async () => {
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Stacks wallet",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      const microSTX = Math.floor(
        parseFloat(withdrawAmount) * 1_000_000,
      ).toString();

      await withdrawCollateral(
        microSTX,
        (data) => {
          toast({
            title: "Collateral Withdrawn Successfully!",
            description: `${withdrawAmount} STX withdrawn. Transaction: ${data.txId}`,
            duration: 10000,
          });
          setWithdrawAmount("");
        },
        () => {
          toast({
            title: "Transaction Cancelled",
            description: "Withdrawal was cancelled by user",
            variant: "default",
          });
        },
      );

      toast({
        title: "Transaction Submitted",
        description:
          "Withdrawal transaction initiated. Please confirm in your wallet.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw collateral",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
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
            Stacks Lending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <Wallet className="h-12 w-12 mx-auto text-gray-400" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Connect your Stacks wallet to start lending
              </p>
              <p className="text-xs text-gray-500">
                Deposit STX as collateral and borrow tokens cross-chain
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
                {STACKLEND_CONTRACTS.COLLATERAL.address}
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
          Stacks Lending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Stacks Wallet:</span>
            <span className="text-green-600 font-medium">Connected</span>
          </div>
          <p className="text-xs text-gray-500 break-all">{address}</p>
        </div>

        {/* Deposit Collateral */}
        <div className="space-y-3">
          <Label htmlFor="collateral" className="text-sm font-medium">
            Deposit STX Collateral
          </Label>
          <div className="space-y-2">
            <Input
              id="collateral"
              type="number"
              placeholder="Enter STX amount (e.g., 100)"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              disabled={isDepositing}
            />
            <Button
              onClick={handleDepositCollateral}
              className="w-full"
              disabled={isDepositing}
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

        {/* Withdraw Collateral */}
        <div className="space-y-3">
          <Label htmlFor="withdraw" className="text-sm font-medium">
            Withdraw STX Collateral
          </Label>
          <div className="space-y-2">
            <Input
              id="withdraw"
              type="number"
              placeholder="Enter STX amount to withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={isWithdrawing}
            />
            <Button
              onClick={handleWithdrawCollateral}
              variant="outline"
              className="w-full"
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw Collateral"
              )}
            </Button>
          </div>
        </div>

        {/* Cross-Chain Borrowing */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Cross-Chain Borrow
          </Label>
          <div className="space-y-3">
            <Select
              value={borrowToken}
              onValueChange={(value: "USDC" | "USDT" | "WBTC") =>
                setBorrowToken(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select token to borrow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC (6 decimals)</SelectItem>
                <SelectItem value="USDT">USDT (6 decimals)</SelectItem>
                <SelectItem value="WBTC">WBTC (8 decimals)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder={`Enter ${borrowToken} amount (e.g., 100)`}
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              disabled={isBorrowing}
            />
            <Button
              onClick={handleCrossChainBorrow}
              className="w-full"
              disabled={isBorrowing}
            >
              {isBorrowing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Borrow ${borrowToken}`
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
    </Card>
  );
};

export default StacksLending;
