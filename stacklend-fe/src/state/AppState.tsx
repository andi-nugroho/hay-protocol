import React, { createContext, useContext, useMemo, useState } from "react";
import { TokenSymbol, PRICES_USD } from "@/data/tokens";
import { useStacks } from "@/hooks/use-stacks";

export type WalletType = "stacks" | "sui";

export interface WalletInfo {
  type: WalletType;
  address: string;
}

export interface Position {
  symbol: TokenSymbol;
  collateral: number; // supplied amount
  borrowed: number;   // borrowed amount
}

interface AppStateContextValue {
  wallet?: WalletInfo;
  connectStacks: () => void;
  disconnect: () => void;

  positions: Record<TokenSymbol, Position>;
  addCollateral: (symbol: TokenSymbol, amount: number) => void;
  addBorrowed: (symbol: TokenSymbol, amount: number) => void;
  repayBorrowed: (symbol: TokenSymbol, amount: number) => void;
  withdrawCollateral: (symbol: TokenSymbol, amount: number) => void;

  totals: {
    totalCollateral: number;
    totalBorrowed: number;
    healthFactor: string; // formatted
    usd: { collateral: number; borrowed: number };
  }
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export { AppStateContext };

function randomHex(len: number) {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stacksWallet = useStacks();
  const [wallet, setWallet] = useState<WalletInfo | undefined>(undefined);

  // Update wallet state when Stacks wallet connection changes
  React.useEffect(() => {
    if (stacksWallet.isConnected && stacksWallet.address) {
      setWallet({ type: "stacks", address: stacksWallet.address });
    } else if (!stacksWallet.isConnected && wallet?.type === "stacks") {
      setWallet(undefined);
    }
  }, [stacksWallet.isConnected, stacksWallet.address, wallet?.type]);

  const [positions, setPositions] = useState<Record<TokenSymbol, Position>>({
    STX: { symbol: "STX", collateral: 0, borrowed: 0 },
    BTC: { symbol: "BTC", collateral: 0, borrowed: 0 },
    sBTC: { symbol: "sBTC", collateral: 0, borrowed: 0 },
    ETH: { symbol: "ETH", collateral: 0, borrowed: 0 },
    USDC:{ symbol: "USDC", collateral: 0, borrowed: 0 },
    WBTC:{ symbol: "WBTC", collateral: 0, borrowed: 0 },
  });

  const connectStacks = () => {
    stacksWallet.connect();
  };

  const disconnect = () => {
    if (wallet?.type === "stacks") {
      stacksWallet.disconnect();
    }
    setWallet(undefined);
  };

  const addCollateral = (symbol: TokenSymbol, amount: number) => {
    setPositions(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], collateral: Math.max(0, prev[symbol].collateral + amount) }
    }));
  };

  const withdrawCollateral = (symbol: TokenSymbol, amount: number) => {
    setPositions(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], collateral: Math.max(0, prev[symbol].collateral - amount) }
    }));
  };

  const addBorrowed = (symbol: TokenSymbol, amount: number) => {
    setPositions(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], borrowed: Math.max(0, prev[symbol].borrowed + amount) }
    }));
  };

  const repayBorrowed = (symbol: TokenSymbol, amount: number) => {
    setPositions(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], borrowed: Math.max(0, prev[symbol].borrowed - amount) }
    }));
  };

  const totals = useMemo(() => {
    const totalCollateral = Object.values(positions).reduce((acc, p) => acc + p.collateral, 0);
    const totalBorrowed = Object.values(positions).reduce((acc, p) => acc + p.borrowed, 0);

    // USD values
    const collateralUSD = positions.STX.collateral * PRICES_USD.STX; // Only STX acts as collateral for now
    const borrowedUSD = (positions.USDC.borrowed * PRICES_USD.USDC)
      + (positions.ETH.borrowed * PRICES_USD.ETH)
      + (positions.WBTC.borrowed * PRICES_USD.WBTC)
      + (positions.BTC.borrowed * PRICES_USD.BTC);

    // Health Factor based on 80% LTV
    const hfVal = borrowedUSD === 0 ? Infinity : (collateralUSD * 0.8) / borrowedUSD;
    const hfClamped = hfVal === Infinity ? Infinity : Math.max(0.1, Math.min(5, hfVal));
    const healthFactor = hfClamped === Infinity ? "∞" : hfClamped.toFixed(2);

    return { totalCollateral, totalBorrowed, healthFactor, usd: { collateral: collateralUSD, borrowed: borrowedUSD } };
  }, [positions]);

  const value: AppStateContextValue = {
    wallet,
    connectStacks,
    disconnect,
    positions,
    addCollateral,
    addBorrowed,
    repayBorrowed,
    withdrawCollateral,
    totals,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

