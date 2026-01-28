# HayyProtocol

> A Cross-Chain DeFi Lending Protocol bridging Stacks and Sui Networks

## Overview

HayyProtocol is a decentralized lending protocol that enables cross-chain collateralized borrowing between the Stacks and Sui blockchains. Users can deposit STX collateral on Stacks Network or sBTC collateral on Sui Network to borrow USDC on Sui Network.

### Key Features

- **Cross-Chain Collateral**: Deposit STX on Stacks to borrow USDC on Sui
- **Multi-Asset Support**: Support for STX and sBTC as collateral
- **Non-Custodial**: Users maintain full control of their assets
- **Transparent**: All transactions are verifiable on-chain
- **Real-Time Monitoring**: Live health factor and position tracking

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         HayyProtocol                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Stacks Network  │    │   Backend API    │    │   Sui Network    │
│                  │    │    (Relayer)     │    │                  │
│  ┌────────────┐  │    │  ┌────────────┐  │    │  ┌────────────┐  │
│  │ Collateral │◄─┼────┼──┤  Monitor   │──┼────┼─►│   Borrow   │  │
│  │  Contract  │  │    │  │  Service   │  │    │  │  Registry  │  │
│  └────────────┘  │    │  └────────────┘  │    │  └────────────┘  │
│                  │    │                  │    │                  │
│  STX Deposits    │    │   Event Bridge   │    │  USDC Lending    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Frontend (React)      │
                    │  - Dashboard            │
                    │  - Borrow/Lend UI       │
                    │  - Wallet Integration   │
                    └─────────────────────────┘
```

### Cross-Chain Flow

```
User Flow: Deposit STX on Stacks → Borrow USDC on Sui
─────────────────────────────────────────────────────

1. User Deposits STX Collateral
   ┌──────────┐
   │   User   │
   └─────┬────┘
         │ deposit-collateral(amount, sui_address)
         ▼
   ┌─────────────────┐
   │ Stacks Contract │
   │  (Collateral)   │
   └─────┬───────────┘
         │ Event: CollateralDeposited
         │ { stacks_address, sui_address, amount }
         ▼

2. Relayer Monitors & Bridges
   ┌─────────────────┐
   │  Backend API    │
   │   (Relayer)     │
   │                 │
   │  - Monitor STX  │
   │  - Verify Tx    │
   │  - Register     │
   └─────┬───────────┘
         │ register_position(sui_address, stx_amount)
         ▼

3. Position Registered on Sui
   ┌─────────────────┐
   │  Sui Contract   │
   │ (Borrow Registry│
   │                 │
   │  Position:      │
   │  - STX: 100     │
   │  - Max: $70     │
   └─────┬───────────┘
         │
         ▼

4. User Borrows USDC
   ┌──────────┐
   │   User   │ borrow_usdc(amount)
   └─────┬────┘
         │
         ▼
   ┌─────────────────┐
   │  Sui Contract   │
   │                 │
   │  Check:         │
   │  - Collateral ✓ │
   │  - LTV < 70%  ✓ │
   │  - Transfer USDC│
   └─────────────────┘
```

## Technical Specifications

### Lending Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Loan-to-Value (LTV)** | 70% | Maximum borrowing capacity against collateral |
| **Liquidation Threshold** | 75% | Threshold at which positions can be liquidated |
| **Liquidation Penalty** | 10% | Penalty fee for liquidated positions |
| **Reserve Factor** | 15% | Protocol fee on interest |
| **Collateral Assets** | STX, sBTC | Supported collateral types |
| **Borrow Asset** | USDC | Available asset to borrow |

### Health Factor Calculation

```
Health Factor = (Total Collateral Value in USD) / (Total Borrowed in USD)

Examples:
- Collateral: 100 STX @ $2 = $200
- Borrowed: $100 USDC
- Health Factor = $200 / $100 = 2.0 ✅ Safe

Risk Levels:
- HF > 2.0:   🟢 Safe
- HF 1.5-2.0: 🟡 Moderate Risk
- HF < 1.5:   🔴 High Risk
- HF < 1.0:   ⚠️  Liquidatable
```

### Smart Contract Architecture

#### Stacks Contracts (`hayyprotocol-stacks/`)

**Collateral Contract**
```clarity
;; Core Functions
(define-public (deposit-collateral
  (amount uint)
  (sui-address (string-ascii 66)))
  ;; Deposits STX as collateral
  ;; Links Stacks address to Sui address
)

(define-public (withdraw-collateral
  (amount uint))
  ;; Withdraws STX collateral
  ;; Requires: No outstanding debt on Sui
)

;; Data Structures
(define-map positions
  { user: principal }
  {
    stx-collateral: uint,
    sui-address: (string-ascii 66),
    deposited-at: uint
  }
)
```

#### Sui Contracts (`hayyprotocol-sui/`)

**Borrow Registry Module**
```move
module hayyprotocol::borrow_registry {
    /// Core position structure
    struct BorrowPosition has key, store {
        id: UID,
        borrower: address,
        sbtc_collateral_sui: u64,
        sbtc_collateral_stacks: u64,
        stx_collateral_stacks: u64,  // Cross-chain collateral
        usdc_borrowed: u64,
        debt_opened_at: u64,
        last_interest_update: u64,
        is_liquidatable: bool,
    }

    /// Register cross-chain STX position
    public entry fun register_stx_position(
        registry: &mut BorrowRegistry,
        stacks_address: String,
        sui_address: address,
        stx_amount: u64,
        ctx: &mut TxContext
    )

    /// Borrow USDC against collateral
    public entry fun borrow_usdc(
        registry: &mut BorrowRegistry,
        usdc_pool: &mut Coin<USDC>,
        amount: u64,
        ctx: &mut TxContext
    )
}
```

### Backend Relayer (`hayyprotocol-backend/`)

**Core Responsibilities**

1. **Event Monitoring**
   - Monitors Stacks blockchain for `deposit-collateral` events
   - Validates transaction confirmations
   - Tracks block heights

2. **Cross-Chain Bridge**
   - Verifies deposit authenticity
   - Registers positions on Sui
   - Maintains event logs

3. **API Services**
   - Position queries by address
   - Health factor calculations
   - Transaction history

**API Endpoints**

```typescript
// Get position by Sui address
GET /api/positions/sui/:address
Response: {
  success: boolean,
  position: {
    suiAddress: string,
    stacksAddress: string,
    stxCollateral: number,
    sbtcCollateral: number,
    usdcBorrowed: number,
    healthFactor: number,
    isLiquidatable: boolean
  }
}

// Suggest borrowing for Sui address
GET /api/suggest/:suiAddress
Response: {
  success: boolean,
  position: { ... },
  suggestions: Array<{
    action: string,
    reason: string,
    amount: number
  }>
}
```

## Project Structure

```
hayyprotocol/
├── hayyprotocol-fe/              # Frontend Application
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   ├── lib/                  # Utilities
│   │   └── constants/            # Contract addresses
│   └── package.json
│
├── hayyprotocol-backend/         # Backend Relayer
│   ├── src/
│   │   ├── index.ts              # Main server
│   │   ├── stacksMonitor.ts      # Event monitoring
│   │   ├── suiService.ts         # Sui interactions
│   │   └── config.ts             # Configuration
│   └── package.json
│
├── hayyprotocol-stacks/          # Stacks Smart Contracts
│   ├── contracts/
│   │   └── collateral.clar       # Main collateral contract
│   ├── tests/                    # Contract tests
│   └── Clarinet.toml
│
├── hayyprotocol-sui/             # Sui Smart Contracts
│   ├── sources/
│   │   ├── borrow_registry.move  # Borrow management
│   │   ├── usdc.move             # USDC token
│   │   └── sbtc.move             # sBTC token
│   ├── tests/                    # Move tests
│   └── Move.toml
│
└── README.md                     # This file
```

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Blockchain SDKs**:
  - `@mysten/dapp-kit` (Sui wallet integration)
  - `@stacks/connect` (Stacks wallet integration)

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: JSON file-based (relayer-state.json)
- **Blockchain Libraries**:
  - `@mysten/sui.js` (Sui interactions)
  - `@stacks/blockchain-api-client` (Stacks monitoring)

### Smart Contracts
- **Stacks**: Clarity smart contract language
- **Sui**: Move programming language

## Security Features

### Protocol Security

1. **Health Factor Monitoring**
   - Real-time position tracking
   - Automatic liquidation triggers
   - Color-coded risk indicators

2. **Collateral Safety**
   - Over-collateralization requirement (70% LTV)
   - Liquidation buffer (75% threshold)
   - Non-custodial design

3. **Cross-Chain Verification**
   - Transaction confirmation waiting
   - Event signature validation
   - Duplicate prevention

### User Protection

- **Position Isolation**: Each user's position is independent
- **Transparent Pricing**: Real-time oracle price feeds
- **Withdrawal Controls**: Debt must be cleared before withdrawal
- **Rate Limiting**: API rate limits prevent abuse

## Use Cases

### For Borrowers

**Scenario 1: STX Holder Needs Liquidity**
- Deposit 1,000 STX ($2,000 @ $2/STX)
- Borrow up to $1,400 USDC (70% LTV)
- Keep STX exposure while accessing liquidity

**Scenario 2: sBTC Holder on Sui**
- Deposit 0.1 sBTC ($6,500 @ $65,000/BTC)
- Borrow up to $4,550 USDC
- Earn yield while maintaining BTC position

### For Liquidators

- Monitor positions with HF < 1.0
- Liquidate positions to earn 10% penalty
- Help maintain protocol solvency

## Deployment Information

### Mainnet (Future)
- **Stacks Mainnet**: TBD
- **Sui Mainnet**: TBD

### Testnet (Current)
- **Stacks Testnet**: Deployed ✅
- **Sui Testnet**: Deployed ✅
- **Backend**: Running on localhost

## Roadmap

### Phase 1: Core Protocol ✅
- [x] STX collateral deposits on Stacks
- [x] Cross-chain position registration
- [x] USDC borrowing on Sui
- [x] Basic liquidation logic
- [x] Frontend dashboard

### Phase 2: Enhanced Features 🚧
- [ ] sBTC collateral support (Stacks)
- [ ] Interest rate model
- [ ] Liquidation bot
- [ ] Price oracle integration
- [ ] Multi-collateral positions

### Phase 3: Advanced Features 📋
- [ ] Governance token
- [ ] Yield farming
- [ ] Flash loans
- [ ] Insurance fund
- [ ] Mainnet deployment

## Risk Warnings

⚠️ **Important Considerations**:

1. **Smart Contract Risk**: Smart contracts may contain bugs or vulnerabilities
2. **Price Volatility**: Crypto assets are highly volatile; monitor your health factor
3. **Liquidation Risk**: Positions can be liquidated if health factor drops below 1.0
4. **Cross-Chain Risk**: Bridge failures could impact position synchronization
5. **Network Risk**: Blockchain congestion may delay transactions

**Recommendation**: Only use funds you can afford to lose. Start with small amounts to understand the protocol.

## Contributing

We welcome contributions! Each subproject has its own setup instructions:

- **Frontend**: See `hayyprotocol-fe/README.md`
- **Backend**: See `hayyprotocol-backend/README.md`
- **Stacks Contracts**: See `hayyprotocol-stacks/README.md`
- **Sui Contracts**: See `hayyprotocol-sui/README.md`

## License

This project is licensed under the MIT License.

## Resources

### Documentation
- **Stacks**: https://docs.stacks.co
- **Sui**: https://docs.sui.io
- **Clarity Language**: https://docs.stacks.co/clarity

### Block Explorers
- **Stacks Testnet**: https://explorer.hiro.so/?chain=testnet
- **Sui Testnet**: https://suiexplorer.com/?network=testnet

### Community
- **GitHub**: https://github.com/your-org/hayyprotocol
- **Discord**: Coming soon
- **Twitter**: Coming soon

---

**Built with ❤️ for the cross-chain DeFi ecosystem**