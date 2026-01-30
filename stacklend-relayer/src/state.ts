import fs from 'fs';
import { env } from './config.js';

export type State = { lastHeight: number; processed: Record<string, { hash: string; t: number }>; };

export function loadState(): State {
  try { return JSON.parse(fs.readFileSync(env.STATE_FILE, 'utf8')); }
  catch { return { lastHeight: 0, processed: {} }; }
}

export function saveState(s: State) {
  fs.writeFileSync(env.STATE_FILE, JSON.stringify(s, null, 2));
}