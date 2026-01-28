# HayyProtocol - Stacks Contracts

Stacks-side contracts for HayyProtocol cross-chain lending protocol (Stacks <-> Sui).

## Architecture Overview

**Stacks** → Manages **STX collateral only**
**Sui** → Manages **all borrowing, lending, and sBTC collateral**

### Cross-Chain Flow

```
User deposits STX on Stacks
       ↓
Relayer detects event
       ↓
Relayer registers collateral on Sui
       ↓
User borrows USDC on Sui
       ↓
User repays on Sui
       ↓
User requests withdraw on Stacks
       ↓
Relayer verifies debt = 0 on Sui
       ↓
Relayer unlocks STX on Stacks
```

## Contracts

### collateral-v1.clar

**Purpose:** Manage STX collateral deposits and withdrawals

**Public Functions (User-facing):**
- `deposit-collateral(amount)` - Deposit STX as collateral
- `request-withdraw(amount)` - Request to withdraw STX

**Admin Functions (Relayer-only):**
- `init-admin()` - Initialize admin (one-time)
- `admin-unlock-collateral(user, amount)` - Unlock collateral after Sui verification
- `admin-emergency-withdraw(recipient, amount)` - Emergency withdrawal

**Read-only Functions:**
- `get-collateral(user)` - Get user's collateral balance
- `get-total-collateral()` - Get total protocol collateral
- `get-portfolio(user)` - Get user portfolio summary
- `is-admin(who)` - Check if address is admin

## Events

### collateral-deposited
```clarity
{
  event: "collateral-deposited",
  user: principal,
  amount: uint,
  new-balance: uint,
  block-height: uint
}
```
**Trigger:** User deposits STX
**Relayer Action:** Call `register_stacks_collateral()` on Sui

---

### withdraw-requested
```clarity
{
  event: "withdraw-requested",
  user: principal,
  amount: uint,
  current-collateral: uint,
  block-height: uint
}
```
**Trigger:** User requests withdrawal
**Relayer Action:**
1. Check debt on Sui via `get_position()`
2. If debt = 0: Call `admin-unlock-collateral()` on Stacks
3. If debt > 0: Ignore/reject request

---

### collateral-unlocked
```clarity
{
  event: "collateral-unlocked",
  user: principal,
  amount: uint,
  new-balance: uint,
  unlocked-by: principal,
  block-height: uint
}
```
**Trigger:** Relayer unlocks collateral
**Action:** STX sent back to user

---

## Deployment

### Testnet

1. **Deploy contract:**
```bash
clarinet deploy --testnet
```

2. **Initialize admin:**
```bash
clarinet console
```
```clarity
(contract-call? .collateral-v1 init-admin)
```

3. **Save contract address** for relayer configuration

---

## Testing

### Local Testing (Clarinet)

```bash
# Run unit tests
clarinet test

# Interactive console
clarinet console
```

### Testnet Testing

**1. Deposit Collateral:**
```bash
stx call ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 deposit-collateral u1000000
```

**2. Check Balance:**
```bash
stx call-read ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 get-collateral ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```

**3. Request Withdraw:**
```bash
stx call ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 request-withdraw u500000
```

---

## Integration with Sui

### Sui Contract Functions (for reference)

**Collateral Registration:**
```move
public entry fun register_stacks_collateral(
    registry: &mut BorrowRegistry,
    borrower: address,
    collateral_type: u8, // 1 = STX, 2 = sBTC
    amount: u64,
    ctx: &mut TxContext
)
```

**Check Position (for withdrawal verification):**
```move
public fun get_position(
    registry: &BorrowRegistry,
    borrower: address
): BorrowPosition
```

---

## Error Codes

- `u100` - err-non-positive: Amount must be > 0
- `u101` - err-insufficient-funds: Insufficient balance
- `u105` - err-not-admin: Caller is not admin

---

## Security Notes

1. **Admin Key Management:**
   - Admin key controls collateral unlocking
   - Must be secured by relayer operator
   - Consider multi-sig for production

2. **Withdrawal Safety:**
   - Relayer MUST verify debt = 0 on Sui before unlocking
   - User cannot bypass this check
   - Emergency admin withdrawal for protocol safety only

3. **Cross-Chain Trust:**
   - System relies on relayer honesty
   - For MVP: Admin-controlled relayer
   - Future: Decentralized relayer network or ZK proofs

---

## Relayer Requirements

The relayer must:

1. ✅ Monitor Stacks events (`collateral-deposited`, `withdraw-requested`)
2. ✅ Monitor Sui events (withdrawal signals)
3. ✅ Maintain mapping: Stacks address ↔ Sui address
4. ✅ Have admin privileges on both chains
5. ✅ Verify state consistency before unlocking collateral

See `/hayyprotocol-relayer` for implementation.

---

## Changelog

### v1.0 (Current)
- ✅ Simplified collateral-only contract
- ✅ Removed borrow/repay functions (handled on Sui)
- ✅ Added relayer admin functions
- ✅ Enhanced event emissions for monitoring
- ❌ Removed lending-v1.clar (not needed)

---

## License

MIT
