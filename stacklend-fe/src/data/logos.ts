import { TokenSymbol } from "./tokens";

// Public folder paths for token icons
export const TOKEN_LOGO: Record<TokenSymbol, string> = {
  STX: "/stacks-stx-logo.svg",
  BTC: "/placeholder.svg", // fallback, no dedicated BTC icon provided
  ETH: "/ethereum-eth-logo.svg",
  USDC: "/usdc-logo.svg",
  WBTC: "/wrapped-bitcoin-wbtc-icon.svg",
};

// Chain icons (string keys to avoid over-constraining types)
export const CHAIN_LOGO: Record<string, string> = {
  Stacks: "/stacks-stx-logo.svg",
  Ethereum: "/ethereum-eth-logo.svg",
  Polygon: "/placeholder.svg",
  Bitcoin: "/wrapped-bitcoin-wbtc-icon.svg",
  Arbitrum: "/arbitrum-arb-logo.svg",
  Scroll: "/scroll_icon.svg",
};
