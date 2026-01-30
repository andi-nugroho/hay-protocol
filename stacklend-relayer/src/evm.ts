import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { scrollSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import controllerAbi from './abi/borrowController.json' with { type: 'json' };
import { env } from './config.js';
import type { WalletClient } from 'viem';
import pino from 'pino';

const log = pino({ 
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
});

const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as `0x${string}`);

export const publicClient = createPublicClient({
  chain: scrollSepolia,
  transport: http(env.SCROLL_RPC_URL),
});

export const walletClient: WalletClient = createWalletClient({
  account,
  chain: scrollSepolia,
  transport: http(env.SCROLL_RPC_URL),
});

// Health check function
export async function checkRelayerHealth() {
  try {
    const balance = await publicClient.getBalance({ address: account.address });
    const blockNumber = await publicClient.getBlockNumber();
    
    // Check if relayer is authorized
    const isRelayer = await publicClient.readContract({
      address: env.BORROW_CONTROLLER as `0x${string}`,
      abi: controllerAbi,
      functionName: 'relayer',
    });

    return {
      relayerAddress: account.address,
      balance: formatEther(balance),
      blockNumber: Number(blockNumber),
      isAuthorized: isRelayer === account.address,
      rpcUrl: env.SCROLL_RPC_URL
    };
  } catch (error: any) {
    log.error({ error: error.message }, 'Relayer health check failed');
    throw error;
  }
}

export async function borrow(token: `0x${string}`, to: `0x${string}`, amount: bigint): Promise<string> {
  try {
    // Pre-flight checks
    const balance = await publicClient.getBalance({ address: account.address });
    const minBalance = BigInt('100000000000000000'); // 0.1 ETH minimum
    
    if (balance < minBalance) {
      throw new Error(`Insufficient relayer balance: ${formatEther(balance)} ETH (minimum: ${formatEther(minBalance)} ETH)`);
    }

    // Check if token is allowed
    const isAllowed = await publicClient.readContract({
      address: env.BORROW_CONTROLLER as `0x${string}`,
      abi: controllerAbi,
      functionName: 'allowedToken',
      args: [token],
    });

    if (!isAllowed) {
      throw new Error(`Token ${token} is not allowed for borrowing`);
    }

    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: env.BORROW_CONTROLLER as `0x${string}`,
      abi: controllerAbi,
      functionName: 'borrow',
      args: [token, to, amount],
      account,
    });

    log.info({
      token,
      to,
      amount: amount.toString(),
      gasEstimate: gasEstimate.toString(),
      relayerBalance: formatEther(balance)
    }, 'Executing borrow transaction');

    // Execute transaction with 20% gas buffer
    const hash = await walletClient.writeContract({
      address: env.BORROW_CONTROLLER as `0x${string}`,
      abi: controllerAbi,
      functionName: 'borrow',
      args: [token, to, amount],
      gas: gasEstimate + (gasEstimate * 20n / 100n), // 20% buffer
      chain: scrollSepolia,
      account,
    });

    log.info({
      txHash: hash,
      token,
      to,
      amount: amount.toString()
    }, 'Borrow transaction submitted');

    return hash;
  } catch (error: any) {
    log.error({
      error: error.message,
      token,
      to,
      amount: amount.toString()
    }, 'Borrow transaction failed');
    throw error;
  }
}

export async function repay(token: `0x${string}`, from: `0x${string}`, amount: bigint): Promise<string> {
  try {
    // Check if token is allowed
    const isAllowed = await publicClient.readContract({
      address: env.BORROW_CONTROLLER as `0x${string}`,
      abi: controllerAbi,
      functionName: 'allowedToken',
      args: [token],
    });

    if (!isAllowed) {
      throw new Error(`Token ${token} is not allowed for repayment`);
    }

    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: env.BORROW_CONTROLLER as `0x${string}`,
      abi: controllerAbi,
      functionName: 'repay',
      args: [token, from, amount],
      account,
    });

    log.info({
      token,
      from,
      amount: amount.toString(),
      gasEstimate: gasEstimate.toString()
    }, 'Executing repay transaction');

    // Execute transaction
    const hash = await walletClient.writeContract({
      address: env.BORROW_CONTROLLER as `0x${string}`,
      abi: controllerAbi,
      functionName: 'repay',
      args: [token, from, amount],
      gas: gasEstimate + (gasEstimate * 20n / 100n), // 20% buffer
      chain: scrollSepolia,
      account,
    });

    log.info({
      txHash: hash,
      token,
      from,
      amount: amount.toString()
    }, 'Repay transaction submitted');

    return hash;
  } catch (error: any) {
    log.error({
      error: error.message,
      token,
      from,
      amount: amount.toString()
    }, 'Repay transaction failed');
    throw error;
  }
}

// Get transaction receipt
export async function waitForTransaction(hash: `0x${string}`) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  } catch (error: any) {
    log.error({ hash, error: error.message }, 'Failed to get transaction receipt');
    throw error;
  }
}