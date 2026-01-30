import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TokenInfo, TokenSymbol } from "@/data/tokens";
import { TOKEN_LOGO, CHAIN_LOGO } from "@/data/logos";

export const BorrowTable = ({
  tokens,
  onBorrow,
}: {
  tokens: TokenInfo[];
  onBorrow: (symbol: TokenSymbol) => void;
}) => {
  return (
    <div className="card-brut p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Chain</TableHead>
            <TableHead className="text-right">Borrow APY</TableHead>
            <TableHead className="text-right">Liquidity</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((t) => (
            <TableRow key={t.symbol}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img src={TOKEN_LOGO[t.symbol]} alt={`${t.symbol} logo`} className="h-8 w-8 rounded-full border-2 border-border p-1 bg-card" />
                  <div className="font-medium">{t.name}</div>
                </div>
              </TableCell>
              <TableCell>
                {t.chain ? (
                  <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md border-2 border-border text-xs bg-muted">
                    <img src={CHAIN_LOGO[t.chain] ?? "/placeholder.svg"} alt={`${t.chain} logo`} className="h-4 w-4" />
                    {t.chain}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">{(t.apyBorrow ?? t.interestRate ?? 0).toFixed(2)}%</TableCell>
              <TableCell className="text-right">{t.availableLiquidity ?? "-"}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="brutal" onClick={() => onBorrow(t.symbol)}>Borrow</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BorrowTable;
