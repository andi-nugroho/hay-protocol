import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRICES_USD } from "@/data/tokens";
import { hayyProtocolAPI } from "@/lib/api";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxWithdrawStx: number;
  suiAddress: string;
  onSuccess?: () => void;
}

export const WithdrawModal = ({
  open,
  onOpenChange,
  maxWithdrawStx,
  suiAddress,
  onSuccess
}: WithdrawModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amountNum = parseFloat(amount) || 0;
  const amountUSD = amountNum * PRICES_USD.STX;

  const handleWithdraw = useCallback(async () => {
    if (!amount || amountNum <= 0 || amountNum > maxWithdrawStx) {
      setError("Invalid amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await hayyProtocolAPI.withdraw({
        suiAddress,
        amount: amountNum
      });

      if (result.success) {
        setAmount("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.message || 'Withdrawal failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Withdraw error:', err);
    } finally {
      setLoading(false);
    }
  }, [amount, amountNum, maxWithdrawStx, suiAddress, onOpenChange, onSuccess]);

  const handleMaxClick = () => {
    setAmount(maxWithdrawStx.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="card-brut max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Withdraw STX Collateral</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="withdraw-amount">Amount (STX)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="withdraw-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                min="0"
                max={maxWithdrawStx}
                step="0.01"
                disabled={loading}
              />
              <Button
                variant="outline"
                onClick={handleMaxClick}
                disabled={loading || maxWithdrawStx <= 0}
              >
                Max
              </Button>
            </div>
            {amountNum > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                ≈ ${amountUSD.toFixed(2)} USD
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Available to withdraw:</span>
              <span className="font-medium">{maxWithdrawStx.toFixed(6)} STX</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>≈ USD:</span>
              <span>${(maxWithdrawStx * PRICES_USD.STX).toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={loading || !amount || amountNum <= 0 || amountNum > maxWithdrawStx}
              className="flex-1"
            >
              {loading ? "Processing..." : "Withdraw"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};