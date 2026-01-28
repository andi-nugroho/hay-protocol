/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;

  // Sui Network
  readonly VITE_NETWORK: "localnet" | "devnet" | "testnet" | "mainnet";
  readonly VITE_ORIGINAL_PACKAGE_ID: string;
  readonly VITE_FAUCET_POOL_ID: string;
  readonly VITE_FAUCET_POOL_MODULE_NAME: string;
  readonly VITE_USDC_LENDING_POOL_ID: string;
  readonly VITE_USDC_LENDING_POOL_MODULE_NAME: string;
  readonly VITE_BORROW_REGISTRY_ID: string;
  readonly VITE_BORROW_CONTROLLER_MODULE_NAME: string;

  // Stacks Network
  readonly VITE_STACKS_NETWORK: "testnet" | "mainnet";
  readonly VITE_STACKS_CONTRACT_ADDRESS: string;
  readonly VITE_STACKS_COLLATERAL_CONTRACT_NAME: string;
}
