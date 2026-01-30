import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TOKENS, TokenSymbol } from "@/data/tokens";
import { TOKEN_LOGO } from "@/data/logos";

interface Row {
  symbol: TokenSymbol;
  collateral: number;
  borrowed: number;
  apy: number;
  status: "Active" | "Coming Soon";
}

export const PositionTable = ({ rows }: { rows: Row[] }) => {
  return (
    <div className="card-brut p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead className="text-right">Collateral</TableHead>
            <TableHead className="text-right">Borrowed</TableHead>
            <TableHead className="text-right">APY</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.symbol}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img src={TOKEN_LOGO[r.symbol]} alt={`${r.symbol} logo`} className="h-8 w-8 rounded-full border-2 border-border p-1 bg-card" />
                  <div>
                    <div className="font-medium">{TOKENS[r.symbol].name}</div>
                    <div className="text-xs text-muted-foreground">{r.symbol}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">{r.collateral.toFixed(2)}</TableCell>
              <TableCell className="text-right">{r.borrowed.toFixed(2)}</TableCell>
              <TableCell className="text-right">{r.apy.toFixed(2)}%</TableCell>
              <TableCell className="text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-md border-2 border-border text-xs ${r.status === 'Active' ? 'bg-secondary' : 'bg-muted'}`}>
                  {r.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
