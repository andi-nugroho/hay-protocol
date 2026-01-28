import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  // Server
  PORT: z.string().optional().transform(val => val ? parseInt(val) : 3001),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:8081'),

  // Stacks
  STACKS_API_URL: z.string().url().default('https://api.testnet.hiro.so'),
  STACKS_NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
  STACKS_COLLATERAL_CONTRACT: z.string(),
  STACKS_CONFIRMATIONS: z.string().default('0'), // 0 = process immediately, 1+ = wait for confirmations

  // Sui
  SUI_RPC_URL: z.string().url().default('https://fullnode.testnet.sui.io:443'),
  SUI_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  SUI_BORROW_REGISTRY_ID: z.string(),
  SUI_PACKAGE_ID: z.string(),

  // Relayer Keys
  RELAYER_STACKS_PRIVATE_KEY: z.string(),
  RELAYER_SUI_PRIVATE_KEY: z.string(),

  // Price Feed
  COINGECKO_API_KEY: z.string().optional(),
  PRICE_UPDATE_INTERVAL_MS: z.string().default('60000'),

  // Polling (faster polling for quicker detection)
  POLL_INTERVAL_MS: z.string().default('5000'), // 5 seconds instead of 10
  STATE_FILE: z.string().default('./relayer-state.json'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export const config = Env.parse(process.env);

export const STACKS_CONFIRMATIONS = parseInt(config.STACKS_CONFIRMATIONS);
export const POLL_INTERVAL_MS = parseInt(config.POLL_INTERVAL_MS);
export const PRICE_UPDATE_INTERVAL_MS = parseInt(config.PRICE_UPDATE_INTERVAL_MS);

// Parse CORS origins from comma-separated string
export const CORS_ORIGINS = config.CORS_ORIGINS.split(',').map(origin => origin.trim());
