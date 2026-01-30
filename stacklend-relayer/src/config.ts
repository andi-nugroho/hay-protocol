import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  PORT: z.string().default("3000"),
  STACKS_API_URL: z.string().url(),
  COLLATERAL_CONTRACT_ID: z.string(),
  STACKS_CONFIRMATIONS: z.string().default("1"),
  SCROLL_RPC_URL: z.string().url(),
  RELAYER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  BORROW_CONTROLLER: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  TOKEN_MAP: z.string().default("{}"),
  POLL_INTERVAL_MS: z.string().default("6000"),
  STATE_FILE: z.string().default("./state.json"),
});

export const env = Env.parse(process.env);
export const tokenMap: Record<string, `0x${string}`> = JSON.parse(env.TOKEN_MAP);

