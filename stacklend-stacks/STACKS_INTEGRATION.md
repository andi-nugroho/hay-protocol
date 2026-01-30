# Stacks Smart Contract Integration Guide

## Overview

This guide explains how to integrate the StackLend frontend with the Stacks smart contracts for lending and borrowing functionality.

## Smart Contracts

### 1. Collateral Contract (`collateral-v1.clar`)
- **Purpose**: Manages STX collateral deposits and cross-chain borrowing requests
- **Key Functions**:
  - `deposit-collateral`: Deposit STX as collateral
  - `withdraw-collateral`: Withdraw STX collateral (only if no outstanding loans)
  - `request-borrow`: Request to borrow tokens on other chains
  - `signal-repay`: Signal intent to repay borrowed tokens

### 2. Lending Contract (`lending-v1.clar`)
- **Purpose**: Manages STX lending pool for earning interest
- **Key Functions**:
  - `deposit-lend-collateral`: Deposit STX to earn lending rewards
  - `withdraw-lend-collateral`: Withdraw STX from lending pool
  - `get-lend-balance`: Get user's lending balance
  - `get-lend-apy-bps`: Get current lending APY

## Frontend Integration

### Contract Reader (`stacks-contract-reader.ts`)
- Provides read-only functions to fetch contract data
- Functions for getting user balances, total protocol stats, and token metadata
- Utility functions for converting between STX and microSTX

### Transaction Handler (`stacks-transactions.ts`)
- Handles all contract interactions (write operations)
- Provides wrapper functions for easier contract calls
- Manages transaction callbacks and error handling

### Data Hooks (`use-stacks-data.ts`)
- React hooks for fetching and managing contract data
- Automatically refreshes data and handles loading states
- Provides real-time protocol statistics

### Transaction Hooks (`use-stacks-transactions.ts`)
- React hooks for managing transaction states
- Handles loading, error, and success states for all operations
- Provides easy-to-use functions for contract interactions

## Components

### StacksLendingComponent
- Interface for depositing and withdrawing STX from the lending pool
- Shows current balance, APY, and protocol statistics
- Real-time transaction status and error handling

### StacksBorrowingComponent  
- Interface for borrowing assets cross-chain using STX collateral
- Shows borrowing power, health factor, and active loans
- Integrated with EVM wallet for receiving borrowed tokens

### StacksCollateralComponent
- Interface for managing STX collateral deposits and withdrawals
- Shows utilization ratio and risk warnings
- Prevents unsafe withdrawals

## Setup Instructions

### 1. Deploy Contracts
```bash
cd stacklend-stacks
clarinet deploy --testnet
```

### 2. Update Contract Addresses
After deployment, update the contract addresses in:
- `src/lib/stacks-contract-reader.ts`
- `src/lib/stacks-transactions.ts`

### 3. Initialize Protocol (if needed)
Some contracts may require initialization:
```bash
# Example: Initialize admin for collateral contract
clarinet console --testnet
>> (contract-call? .collateral-v1 init-admin)
```

## Usage Flow

### Lending Flow
1. User connects Stacks wallet
2. User deposits STX using `StacksLendingComponent`
3. STX earns interest at the protocol rate (5% APY)
4. User can withdraw STX plus earned interest

### Borrowing Flow
1. User connects both Stacks and EVM wallets
2. User deposits STX as collateral using `StacksCollateralComponent`
3. User requests to borrow tokens using `StacksBorrowingComponent`
4. Borrowed tokens are sent to user's EVM address via relayer
5. User can repay loans by signaling repayment intent

## Key Features

### Cross-Chain Integration
- STX collateral on Stacks enables borrowing on other chains
- EVM wallet integration for receiving borrowed tokens
- Relayer system handles cross-chain token transfers

### Risk Management
- 80% loan-to-value ratio (LTV)
- Health factor monitoring
- Liquidation threshold protection
- Real-time risk warnings

### User Experience
- Real-time balance updates
- Transaction status tracking
- Error handling and user feedback
- Responsive design for all devices

## Configuration

### Network Settings
- Currently configured for Stacks Testnet
- Switch to mainnet by updating network in `stacks-contract-reader.ts`

### Contract Parameters
- Lending APY: 5% (500 basis points)
- Borrowing APY: 8% (800 basis points)  
- Liquidation Threshold: 80% (8000 basis points)
- Supported tokens: USDC, USDT, WBTC, ETH

## Monitoring

### Contract Events
Monitor these events for real-time updates:
- `deposit`: Collateral or lending deposits
- `withdraw`: Collateral or lending withdrawals
- `borrow-request`: Cross-chain borrow requests
- `repay-request`: Loan repayment signals

### Error Handling
- Network connectivity issues
- Insufficient funds
- Contract interaction failures
- Invalid parameters

## Security Considerations

### Smart Contract Security
- Contracts use standard Clarity patterns
- Input validation and error handling
- Protection against reentrancy and overflow

### Frontend Security
- Wallet connection validation
- Transaction parameter validation
- Secure handling of private keys
- Rate limiting for API calls

## Troubleshooting

### Common Issues
1. **Wallet Connection**: Ensure Stacks wallet is installed and unlocked
2. **Network Issues**: Check Stacks network status
3. **Transaction Failures**: Verify sufficient STX balance for fees
4. **Contract Errors**: Check contract function parameters

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed contract interactions.

## Future Enhancements

### Planned Features
- Multi-collateral support (beyond STX)
- Liquidation mechanisms
- Governance token integration
- Additional supported chains
- Advanced risk parameters

### Integration Points
- Relayer system for cross-chain operations
- Price oracles for accurate collateral valuation
- Automated liquidation bots
- Analytics dashboard
