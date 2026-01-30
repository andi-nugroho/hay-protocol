import { NavLink } from "react-router-dom";
import { LayoutDashboard, HandCoins, Banknote, Droplets } from "lucide-react";

export const BottomNav = () => {
  const base = "flex-1 flex flex-col items-center justify-center py-2";
  const active = ({ isActive }: { isActive: boolean }) =>
    `${base} ${isActive ? "text-primary" : "text-foreground"}`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 border-border bg-background">
      <div className="grid grid-cols-4">
        <NavLink to="/" end className={active}>
          <LayoutDashboard className="size-5" />
          <span className="text-xs">Dashboard</span>
        </NavLink>
        <NavLink to="/lend" className={active}>
          <HandCoins className="size-5" />
          <span className="text-xs">Lend</span>
        </NavLink>
        <NavLink to="/borrow" className={active}>
          <Banknote className="size-5" />
          <span className="text-xs">Borrow</span>
        </NavLink>
        <NavLink to="/faucet" className={active}>
          <Droplets className="size-5" />
          <span className="text-xs">Faucet</span>
        </NavLink>
      </div>
    </nav>
  );
};
