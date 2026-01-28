import fs from 'node:fs';
import { config } from './config.js';

export interface RelayerState {
  lastStacksBlock: number;
  processedEvents: Record<string, ProcessedEvent>;
  // Dynamic address mapping from deposit events
  addressMappings: Record<string, string>; // stacksAddress -> suiAddress
  priceCache: {
    stxUsd: number;
    sbtcUsd: number;
    lastUpdate: number;
  };
}

export interface ProcessedEvent {
  txHash: string;
  suiTxDigest?: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

const DEFAULT_STATE: RelayerState = {
  lastStacksBlock: 0,
  processedEvents: {},
  addressMappings: {}, // Empty dynamic mappings initially
  priceCache: {
    stxUsd: 0,
    sbtcUsd: 0,
    lastUpdate: 0,
  },
};

export function loadState(): RelayerState {
  try {
    const data = fs.readFileSync(config.STATE_FILE, 'utf8');
    return JSON.parse(data) as RelayerState;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: RelayerState): void {
  try {
    fs.writeFileSync(config.STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('❌ Failed to save state:', error);
  }
}

/**
 * Add or update address mapping from deposit event
 */
export function addAddressMapping(state: RelayerState, stacksAddress: string, suiAddress: string): void {
  // Ensure addressMappings exists
  if (!state.addressMappings) {
    state.addressMappings = {};
  }
  state.addressMappings[stacksAddress] = suiAddress;
  console.log(`📍 Mapped: ${stacksAddress} → ${suiAddress.substring(0, 10)}...${suiAddress.slice(-6)}`);
}

/**
 * Get Sui address for Stacks address from dynamic mapping
 */
export function getSuiAddressForStacks(state: RelayerState, stacksAddress: string): string | undefined {
  if (!state.addressMappings) {
    return undefined;
  }
  return state.addressMappings[stacksAddress];
}

export function isEventProcessed(state: RelayerState, eventId: string): boolean {
  return eventId in state.processedEvents;
}

export function markEventProcessed(
  state: RelayerState,
  eventId: string,
  txHash: string,
  suiTxDigest?: string,
  error?: string
): void {
  state.processedEvents[eventId] = {
    txHash,
    suiTxDigest,
    timestamp: Date.now(),
    status: error ? 'failed' : 'success',
    error,
  };
  saveState(state);
}
