import fetch from 'cross-fetch';
import { config } from './config.js';
import pino from 'pino';

const logger = pino({ level: config.LOG_LEVEL });

export interface PriceFeed {
  stxUsd: number;
  sbtcUsd: number;
}

/**
 * Fetch STX and BTC prices from CoinGecko
 */
export async function fetchPrices(): Promise<PriceFeed> {
  try {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', 'blockstack,bitcoin');
    url.searchParams.set('vs_currencies', 'usd');

    if (config.COINGECKO_API_KEY) {
      url.searchParams.set('x_cg_pro_api_key', config.COINGECKO_API_KEY);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const stxUsd = data?.blockstack?.usd || 0;
    const btcUsd = data?.bitcoin?.usd || 0;

    logger.info({ stxUsd, btcUsd }, 'Fetched prices from CoinGecko');

    return {
      stxUsd,
      sbtcUsd: btcUsd, // sBTC = BTC price
    };
  } catch (error) {
    logger.error({ error }, 'Failed to fetch prices');
    // Return fallback prices
    return {
      stxUsd: 0.5, // Fallback: $0.50
      sbtcUsd: 65000, // Fallback: $65,000
    };
  }
}

/**
 * Calculate USD value of STX amount
 * @param stxAmount - Amount in microSTX (1 STX = 1,000,000 microSTX)
 * @param stxPrice - STX price in USD
 */
export function calculateStxValue(stxAmount: number, stxPrice: number): number {
  return (stxAmount / 1_000_000) * stxPrice;
}

/**
 * Calculate borrowing power (70% LTV for STX)
 * @param collateralUsd - Collateral value in USD
 */
export function calculateBorrowingPower(collateralUsd: number): number {
  const LTV = 0.7; // 70% LTV
  return collateralUsd * LTV;
}
