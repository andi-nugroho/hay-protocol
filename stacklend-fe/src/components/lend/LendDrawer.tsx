import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PRICES_USD } from "@/data/tokens";

export const LendDrawer = ({
  open,
  onOpenChange,
  apy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  apy: number;
  onConfirm: (amount: number) => Promise<void> | void;
}) => {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!open) setAmount("");
  }, [open]);

  const usd = useMemo(() => (parseFloat(amount) || 0) * PRICES_USD.STX, [amount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="card-brut max-w-xl mx-auto">
        <DialogHeader>
          <DialogTitle>Lend STX</DialogTitle>
          <DialogDescription>Supply STX as collateral.</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (STX)</label>
            <Input 
              type="number" 
              min={0} 
              step="0.01" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="Enter STX amount to lend"
              className="border-2 border-border" 
            />
            <div className="text-xs text-muted-foreground">≈ ${usd.toFixed(2)} USD</div>
          </div>

          <div className="rounded-lg border-2 border-border p-4 bg-muted/40">
            <div className="flex items-center justify-between text-sm">
              <span>APY</span>
              <span className="font-medium">{apy.toFixed(2)}%</span>
            </div>
          </div>

          <Button variant="brutal" className="w-full" disabled={!amount || parseFloat(amount) <= 0} onClick={() => onConfirm(parseFloat(amount))}>Confirm Lend</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LendDrawer;
