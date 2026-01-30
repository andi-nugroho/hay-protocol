# StackLend Relayer

A cross-chain relayer service that bridges Stacks and EVM blockchains for the StackLend lending protocol.

## Architecture

The relayer monitors Stacks blockchain events and executes corresponding transactions on EVM chains:

```
Stacks Events → Relayer → EVM Transactions
     ↑                        ↓
STX Collateral          Token Minting/Burning
```

## Quick Start

### Prerequisites

- Node.js 18+
- A funded EVM wallet (for gas fees)
- Access to Stacks API and EVM RPC

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Configuration

Update `.env` with your settings:

```bash
# Server
PORT=8080

# Stacks Configuration
STACKS_API_URL=https://api.hiro.so
COLLATERAL_CONTRACT_ID=YOUR_STACKS_CONTRACT_ID
STACKS_CONFIRMATIONS=1

# EVM Configuration
SCROLL_RPC_URL=https://sepolia-rpc.scroll.io/
RELAYER_PRIVATE_KEY=0x...your-private-key
BORROW_CONTROLLER=0x55fc7d4588b5d31e2d7e6b59079e00b0ed938821

# Token Mapping (Stacks ID → EVM Address)
TOKEN_MAP={"USDC":"0x7456733cb8d301cbee45c89e0aeb46edda511e7e","USDT":"0x217a6912a3a44dabb07851909c52557ff6d1a147","WBTC":"0xaf23e637893ee7ec080be5c7760152919261a2b9"}

# Polling Settings
POLL_INTERVAL_MS=6000
STATE_FILE=./state.json
```

### Running the Relayer

```bash
# Development mode (with hot reload)
npm run dev

# Production build and run
npm run build
npm start
```

## 📊 API Endpoints

### Health Check
```bash
curl http://localhost:8080/health
```

### Statistics
```bash
curl http://localhost:8080/stats
```

### Recent Events
```bash
curl http://localhost:8080/events
```

### Manual Sync Trigger
```bash
curl -X POST http://localhost:8080/trigger-sync
```

## Management Scripts

```bash
# Check relayer health
npm run health

# View statistics
npm run stats

# Trigger manual sync
npm run trigger
```

## How It Works

### Event Processing Flow

1. **Monitor Stacks**: Continuously polls Stacks API for new borrow events
2. **Parse Events**: Extracts borrow request details from contract print statements
3. **Validate**: Checks token mappings, amounts, and recipient addresses
4. **Execute EVM**: Calls BorrowController to mint tokens on EVM chain
5. **Track State**: Maintains processed events to prevent duplicates

### Event Format

The relayer processes events with this structure:
```typescript
{
  id: string;            // Unique event ID (txid:index)
  txid: string;          // Stacks transaction hash
  height: number;        // Block height
  user: string;          // Stacks user address
  tokenId: string;       // Token identifier (USDC, USDT, WBTC)
  amount: bigint;        // Amount to borrow
  evmRecipient: string;  // EVM recipient address
}
```

### State Management

- **Persistence**: Events tracked in JSON file (`state.json`)
- **Idempotency**: Prevents duplicate processing
- **Height Tracking**: Remembers last processed block

## Security Features

- **Role-based Access**: Only authorized relayer can call contract
- **Token Validation**: Checks if tokens are whitelisted
- **Amount Validation**: Prevents zero/negative amounts
- **Gas Management**: Estimates gas with safety buffer
- **Balance Checks**: Ensures sufficient relayer balance

## Monitoring

### Health Indicators

- **Relayer Balance**: ETH balance for gas fees
- **Authorization**: Confirms relayer is authorized on contract
- **Block Sync**: Latest processed block height
- **Event Processing**: Recent event processing statistics

### Logs

The relayer provides structured logging:
- Info: Normal operations and successful transactions
- Error: Failed transactions and system errors
- Debug: Detailed event processing information

## Error Handling

Common error scenarios and solutions:

### Insufficient Balance
```
Error: Insufficient relayer balance: 0.05 ETH (minimum: 0.1 ETH)
```
**Solution**: Fund the relayer wallet with more ETH

### Unauthorized Relayer
```
Error: Relayer address not authorized on contract
```
**Solution**: Call `setRelayer()` on BorrowController with correct address

### Token Not Allowed
```
Error: Token 0x... is not allowed for borrowing
```
**Solution**: Call `setAllowedToken()` on BorrowController to whitelist token

### Invalid Recipient
```
Error: Missing EVM recipient address
```
**Solution**: Ensure Stacks contract emits valid EVM addresses

## Cross-Chain Flow

### Borrowing Process

1. User supplies STX collateral on Stacks
2. User calls borrow function with:
   - Token ID (USDC, USDT, WBTC)
   - Amount to borrow
   - EVM recipient address
3. Stacks contract emits borrow event
4. Relayer detects event after confirmations
5. Relayer calls EVM BorrowController
6. Tokens minted to user's EVM address

### Repayment Process

1. User approves ERC20 tokens for BorrowController
2. Relayer (or user) calls repay function
3. Tokens burned from user's balance
4. Collateral available for withdrawal on Stacks

## Production Considerations

### Security
- Use hardware wallet or secure key management
- Run relayer on secure infrastructure
- Monitor relayer balance and activity
- Set up alerting for failures

### Reliability
- Use redundant RPC endpoints
- Implement circuit breakers
- Set up automated restarts
- Monitor event processing delays

### Scaling
- Consider multiple relayer instances
- Implement event queuing for high volume
- Use database instead of JSON for persistence
- Add metrics and monitoring dashboards

## Development

### Adding New Tokens

1. Deploy ERC20 token on EVM chain
2. Whitelist token on BorrowController: `setAllowedToken(tokenAddress, true)`
3. Update `TOKEN_MAP` in environment variables
4. Restart relayer

### Testing

```bash
# Unit tests (add them!)
npm test

# Integration testing
npm run dev
curl -X POST http://localhost:8080/trigger-sync
```

## License

MIT License - see LICENSE file for details.
