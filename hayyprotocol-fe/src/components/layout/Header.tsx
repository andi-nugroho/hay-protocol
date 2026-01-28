import { NavLink } from "react-router-dom";
import { Layers, Wallet, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { useAppState } from "@/hooks/use-app-state";
import { useCurrentAccount } from "@mysten/dapp-kit";

export const Header = () => {
  const { wallet } = useAppState();
  const currentAccount = useCurrentAccount();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md border-2 ${isActive ? "bg-accent" : "bg-background"} border-border hover:bg-accent transition-colors`;

  return (
    <header className="border-b-2 border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border-2 border-border bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-brutal)]">
            <Layers className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl">HayyProtocol</span>
            <span className="text-xs text-muted-foreground">
              Lend & Borrow on Stacks
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/" end className={navCls}>
            Dashboard
          </NavLink>
          <NavLink to="/lend" className={navCls}>
            Lend
          </NavLink>
          <NavLink to="/borrow" className={navCls}>
            Borrow
          </NavLink>
          <NavLink to="/faucet" className={navCls}>
            Faucet
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {wallet ? (
            <Button variant="outline" className="border-2 border-border">
              <Wallet className="mr-2" />
              <span className="hidden sm:inline">
                {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
              </span>
              <span className="sm:hidden">Connected</span>
            </Button>
          ) : null}
          {currentAccount ? (
            <Button variant="outline" className="border-2 border-border">
              <Wallet className="mr-2" />
              <span className="hidden sm:inline">
                {currentAccount.address.slice(0, 6)}…
                {currentAccount.address.slice(-4)}
              </span>
              <span className="sm:hidden">Connected</span>
            </Button>
          ) : null}
          <WalletConnect />
        </div>
      </div>
    </header>
  );
};
