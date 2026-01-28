import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  actionLabel,
  onConfirm,
  loadingLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  actionLabel: string;
  onConfirm: (amount: number) => Promise<void> | void;
  loadingLabel?: string;
}) => {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!amount || isNaN(amount) || amount <= 0) return;
    setLoading(true);
    await onConfirm(amount);
    setLoading(false);
    setAmount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setAmount(0); onOpenChange(v); }}>
      <DialogContent className="card-brut max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter an amount to proceed</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} className="border-2 border-border" />
          <Button variant="brutal" onClick={handleConfirm} disabled={loading} className="w-full">
            {loading ? (loadingLabel ?? "Processing…") : actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
