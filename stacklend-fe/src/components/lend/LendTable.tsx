import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TokenInfo } from "@/data/tokens";
import { TOKEN_LOGO } from "@/data/logos";

export const LendTable = ({ tokens, onLend }: { tokens: TokenInfo[]; onLend: (symbol: string) => void }) => {
  return (
    <div className="card-brut p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead className="text-right">APY</TableHead>
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
              <TableCell className="text-right">{(t.apySupply ?? 0).toFixed(2)}%</TableCell>
              <TableCell className="text-right">
                {t.status === "Active" ? (
                  <Button size="sm" variant="brutal" onClick={() => onLend(t.symbol)}>Lend</Button>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-md border-2 border-border text-xs bg-muted">Coming Soon</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LendTable;
