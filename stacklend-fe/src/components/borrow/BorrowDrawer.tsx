import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TOKENS, TokenInfo, PRICES_USD } from "@/data/tokens";

export const BorrowDrawer = ({
  open,
  onOpenChange,
  token,
  onConfirm,
  currentTotalsUSD,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token: TokenInfo | null;
  onConfirm: (collateralStx: number, borrowAmount: number) => Promise<void> | void;
  currentTotalsUSD: { collateralUSD: number; borrowedUSD: number };
}) => {
  const [lockStx, setLockStx] = useState(0);
  const [borrowAmt, setBorrowAmt] = useState(0);

  useEffect(() => {
    if (!open) {
      setLockStx(0);
      setBorrowAmt(0);
    }
  }, [open]);

  const tokenPrice = token ? PRICES_USD[token.symbol] ?? 1 : 1;
  const lockUsd = lockStx * PRICES_USD.STX;
  const borrowUsd = borrowAmt * tokenPrice;

  const maxBorrowUsd = lockUsd * 0.8; // 80% LTV on newly locked STX
  const maxBorrowUnits = token ? Number((maxBorrowUsd / tokenPrice).toFixed(6)) : 0;

  const resultingHF = useMemo(() => {
    const totalCollUsd = currentTotalsUSD.collateralUSD + lockUsd;
    const totalBorrowUsd = currentTotalsUSD.borrowedUSD + borrowUsd;
    if (totalBorrowUsd === 0) return Infinity;
    const hf = (totalCollUsd * 0.8) / totalBorrowUsd;
    return Math.max(0.1, Math.min(5, hf));
  }, [currentTotalsUSD, lockUsd, borrowUsd]);

  const disabled = !token || lockStx <= 0 || borrowAmt <= 0 || borrowAmt > maxBorrowUnits || (token && token.availableLiquidity !== undefined && borrowAmt > token.availableLiquidity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="card-brut max-w-2xl mx-auto">
        <DialogHeader>
          <DialogTitle>{token ? `Borrow ${token.symbol}` : "Borrow"}</DialogTitle>
          <DialogDescription>Lock STX as collateral and borrow cross-chain.</DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-0 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter STX to lock</label>
              <Input type="number" min={0} step="0.01" value={lockStx || ""} onChange={(e) => setLockStx(parseFloat(e.target.value) || 0)} className="border-2 border-border" />
              <div className="text-xs text-muted-foreground">≈ ${(lockUsd).toFixed(2)} USD</div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>Max Borrowable</span>
                <span className="font-medium">{token ? `${maxBorrowUnits} ${token.symbol}` : "-"}</span>
              </div>
              <div className="text-xs text-muted-foreground">Calculated as 80% of collateral USD value.</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Borrow Amount</label>
              <Input type="number" min={0} step="0.000001" value={borrowAmt || ""} onChange={(e) => setBorrowAmt(parseFloat(e.target.value) || 0)} className="border-2 border-border" />
              <div className="text-xs text-muted-foreground">≈ ${(borrowUsd).toFixed(2)} USD • HF → {resultingHF === Infinity ? "∞" : resultingHF.toFixed(2)}</div>
              {token?.availableLiquidity !== undefined && (
                <div className="text-xs text-muted-foreground">Available liquidity: {token.availableLiquidity} {token.symbol}</div>
              )}
            </div>
          </div>

          <div>
            <div className="rounded-lg border-2 border-border p-4 bg-muted/40">
              <h4 className="font-semibold mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Collateral</span><span className="font-medium">{lockStx} STX</span></div>
                <div className="flex items-center justify-between"><span>Borrowed</span><span className="font-medium">{borrowAmt} {token?.symbol}</span></div>
                <div className="flex items-center justify-between"><span>Health Factor</span><span className="font-medium">{resultingHF === Infinity ? "∞" : resultingHF.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Borrow APY</span><span className="font-medium">{token?.apyBorrow?.toFixed(2) ?? token?.interestRate?.toFixed(2)}%</span></div>
              </div>
            </div>

            <Button variant="brutal" className="w-full mt-4" disabled={disabled} onClick={() => onConfirm(lockStx, borrowAmt)}>Confirm Borrow</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BorrowDrawer;
