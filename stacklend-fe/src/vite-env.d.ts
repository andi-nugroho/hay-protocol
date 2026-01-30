/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;

  readonly VITE_NETWORK: "localnet" | "devnet" | "testnet" | "mainnet";
  readonly VITE_ORIGINAL_PACKAGE_ID: string;
  readonly VITE_FAUCET_POOL_ID: string;
  readonly VITE_FAUCET_POOL_MODULE_NAME: string;
  readonly VITE_USDC_LENDING_POOL_ID: string;
  readonly VITE_USDC_LENDING_POOL_MODULE_NAME: string;
  readonly VITE_BORROW_REGISTRY_ID: string;
  readonly VITE_BORROW_CONTROLLER_MODULE_NAME: string;

  readonly VITE_USDT_FAUCET_ID: string;
  readonly VITE_USDC_FAUCET_ID: string;
  readonly VITE_ETH_FAUCET_ID: string;
}
