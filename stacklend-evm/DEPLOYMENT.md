# Deployment Guide

This guide explains how to deploy the StackLend EVM contracts using Foundry.

## Prerequisites

1. Install Foundry: https://getfoundry.sh/
2. Set up your environment variables
3. Have some ETH for gas fees on your target network

## Environment Setup

Create a `.env` file in the project root:

```bash
# Required
PRIVATE_KEY=0x...

# Optional - defaults to a test address if not provided
RELAYER_ADDRESS=0x...

# Network RPC URLs (examples)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
SCROLL_RPC_URL=https://rpc.scroll.io/

# Etherscan API keys for verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
ARBISCAN_API_KEY=YOUR_ARBISCAN_API_KEY
SCROLLSCAN_API_KEY=YOUR_SCROLLSCAN_API_KEY
```

## Deployment Commands

### 1. Deploy Everything (Recommended)

Deploy BorrowController and all mock tokens:

```bash
# Local/Anvil
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Sepolia Testnet
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# Arbitrum
forge script script/Deploy.s.sol --rpc-url $ARBITRUM_RPC_URL --broadcast --verify

# Scroll
forge script script/Deploy.s.sol --rpc-url $SCROLL_RPC_URL --broadcast --verify
```

### 2. Deploy BorrowController Only

```bash
# Sepolia
forge script script/DeployBorrowController.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# Arbitrum
forge script script/DeployBorrowController.s.sol --rpc-url $ARBITRUM_RPC_URL --broadcast --verify
```

### 3. Deploy Mock Tokens Only

```bash
# Sepolia
forge script script/DeployMockTokens.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# Arbitrum
forge script script/DeployMockTokens.s.sol --rpc-url $ARBITRUM_RPC_URL --broadcast --verify
```

## Post-Deployment Setup

After deployment, you may need to:

1. **Set Allowed Tokens** (if using DeployBorrowController.s.sol):
   ```bash
   cast send <BORROW_CONTROLLER_ADDRESS> "setAllowedToken(address,bool)" <TOKEN_ADDRESS> true --rpc-url $RPC_URL --private-key $PRIVATE_KEY
   ```

2. **Update Relayer** (if needed):
   ```bash
   cast send <BORROW_CONTROLLER_ADDRESS> "setRelayer(address)" <NEW_RELAYER_ADDRESS> --rpc-url $RPC_URL --private-key $PRIVATE_KEY
   ```

## Verification

If automatic verification fails, you can verify manually:

```bash
# Verify BorrowController
forge verify-contract <CONTRACT_ADDRESS> src/BorrowController.sol:BorrowController --chain <CHAIN_ID> --constructor-args $(cast abi-encode "constructor(address)" <RELAYER_ADDRESS>)

# Verify MockERC20
forge verify-contract <CONTRACT_ADDRESS> src/MockERC20.sol:MockERC20 --chain <CHAIN_ID> --constructor-args $(cast abi-encode "constructor(string,string,uint8)" "Mock USD Coin" "USDC" 6)
```

## Testing Deployment

Test your deployment with cast:

```bash
# Check BorrowController owner
cast call <BORROW_CONTROLLER_ADDRESS> "owner()" --rpc-url $RPC_URL

# Check if token is allowed
cast call <BORROW_CONTROLLER_ADDRESS> "allowedToken(address)" <TOKEN_ADDRESS> --rpc-url $RPC_URL

# Check token details
cast call <TOKEN_ADDRESS> "name()" --rpc-url $RPC_URL
cast call <TOKEN_ADDRESS> "symbol()" --rpc-url $RPC_URL
cast call <TOKEN_ADDRESS> "decimals()" --rpc-url $RPC_URL
```

## Deployed Contract Addresses

Keep track of your deployed contracts:

| Contract | Network | Address |
|----------|---------|---------|
| BorrowController | Sepolia | `0x...` |
| MockUSDC | Sepolia | `0x...` |
| MockUSDT | Sepolia | `0x...` |
| MockWBTC | Sepolia | `0x...` |

## Security Notes

- **Never commit your private key to version control**
- Use a separate wallet for testing
- Double-check the relayer address before deployment
- Verify contracts on block explorers after deployment
- Test all functions on testnets before mainnet deployment
