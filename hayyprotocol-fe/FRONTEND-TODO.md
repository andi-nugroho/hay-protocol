# Frontend Integration TODO

## Stacks Contract Integration (Collateral-v1)

### ❌ Functions to Update in `stacks-transactions.ts`

1. **Rename `withdrawCollateral` → `requestWithdraw`**
   - Current: `withdraw-collateral`
   - New: `request-withdraw`
   - Purpose: Only signals withdrawal request (no actual transfer)

2. **Remove `borrowCrossChain` function**
   - Borrowing happens on Sui, not Stacks
   - Remove from stacks-transactions.ts

3. **Remove `signalRepayment` function**
   - Repayment happens on Sui, not Stacks
   - Remove from stacks-transactions.ts

4. **Remove `depositLending` and `withdrawLending` functions**
   - Lending happens on Sui, not Stacks
   - Remove from stacks-transactions.ts

### ❌ UI Component Updates in `StacksLending.tsx`

1. **Keep:**
   - ✅ Deposit STX Collateral UI
   - ✅ Wallet connection/disconnection

2. **Update:**
   - ❌ Withdraw Collateral → Request Withdrawal
     - Change button text: "Request Withdrawal"
     - Add note: "Withdrawal will be processed by relayer after Sui verification"
     - Use `request-withdraw` function

3. **Remove:**
   - ❌ Cross-Chain Borrow section (move to Sui tab)
   - ❌ Repay Loan section (move to Sui tab)
   - ❌ Deposit Lending section (move to Sui tab)

### ❌ Final Stacks UI Should Have:

```
┌─────────────────────────────────────┐
│ Stacks Collateral                   │
├─────────────────────────────────────┤
│                                     │
│ [Deposit STX Collateral]            │
│  - Input amount                     │
│  - Deposit button                   │
│                                     │
│ [Request Withdrawal]                │
│  - Input amount                     │
│  - Request button                   │
│  - Note: Processed by relayer       │
│                                     │
│ [Your Balance]                      │
│  - STX deposited: X.XX STX          │
│  - Total protocol: X.XX STX         │
│                                     │
└─────────────────────────────────────┘
```

### ❌ Move to Sui Tab:

- Borrow USDC (already on Sui)
- Repay USDC (already on Sui)
- Lend USDC (already on Sui)
- Collateral sBTC (deposit directly on Sui)

---

## Contract Addresses to Update

Update `config.ts` with deployed testnet addresses:

```typescript
COLLATERAL: {
  address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Update after deployment
  name: 'collateral-v1'
}
```

Remove `LENDING` contract reference (not needed anymore).

---

## Priority Order:

1. ✅ Deploy Stacks contract to testnet
2. ✅ Fix wallet detection/popup issue
3. ❌ Update stacks-transactions.ts functions
4. ❌ Update StacksLending.tsx UI
5. ❌ Test deposit & request withdrawal on testnet
6. ❌ Build relayer service
7. ❌ End-to-end testing
