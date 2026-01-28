export type TokenSymbol = "STX" | "BTC" | "sBTC" | "ETH" | "USDC" | "WBTC";

export interface TokenInfo {
  symbol: TokenSymbol;
  name: string;
  status: "Active" | "Coming Soon";
  chain?: "Stacks" | "Sui" | "Ethereum";
  apySupply?: number; // %
  apyBorrow?: number; // %
  interestRate?: number; // % for borrowing display
  availableLiquidity?: number; // units of token available to borrow
}

export const TOKENS: Record<TokenSymbol, TokenInfo> = {
  STX: { symbol: "STX", name: "Stacks", status: "Coming Soon", apySupply: 4.2, chain: "Stacks" },
  BTC: { symbol: "BTC", name: "Bitcoin", status: "Coming Soon", apySupply: 0.0 },
  sBTC: { symbol: "sBTC", name: "Stacks Bitcoin", status: "Active", apySupply: 6.5, chain: "Sui" },
  ETH: { symbol: "ETH", name: "Ethereum", status: "Coming Soon", apySupply: 0.0, chain: "Ethereum" },
  USDC:{ symbol: "USDC", name: "USD Coin", status: "Active", apySupply: 8.5, apyBorrow: 8.0, interestRate: 8.0, chain: "Sui", availableLiquidity: 1000000 },
  WBTC: { symbol: "WBTC", name: "Wrapped Bitcoin", status: "Coming Soon", apySupply: 0.0, chain: "Ethereum" },
};

export const BORROWABLE_TOKENS: TokenSymbol[] = ["USDC"];

export const PRICES_USD: Record<TokenSymbol, number> = {
  STX: 2.0,
  BTC: 65000,
  sBTC: 65000,
  ETH: 3000,
  USDC: 1,
  WBTC: 65000,
};
