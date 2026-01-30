# Stacks Contracts Setup & Configuration (collateral-v1, lending-v1)

This guide covers post-deployment setup for the Stacks contracts so you can start demoing deposits, borrowing, and withdrawals. It assumes both contracts are deployed to Stacks Testnet and you know their contract IDs.

- Collateral: tracks STX collateral and borrow principals, dynamic token registry, and emits borrow/repay events
- Lending: simple STX pool for supply/withdraw with fixed APY exposure (no on-chain interest accrual in MVP)

Refer to:
- Cross-chain relayer guides: `docs/RELAYER.md` and `docs/RELAYER-EXPRESS.md`
- Frontend + Solidity notes: `docs/INTEGRATION.md`

---

## 1) Prerequisites

- Stacks Testnet node API (Hiro): `https://stacks-node-api.testnet.stacks.co`
- Contract IDs:
  - COLLATERAL_CONTRACT_ID: `SP...-TESTNET.collateral-v1`
  - LENDING_CONTRACT_ID: `SP...-TESTNET.lending-v1`
- A testnet wallet funded with STX for admin and user ops
- (Optional) Your EVM addresses for token recipients

Conventions used below
- ustx = microstacks (1 STX = 1_000_000 ustx)
- APY/threshold values are in basis points (bps). Example: 800 bps = 8.00%

---

## 2) Initialize admin (collateral-v1)

The collateral contract exposes an admin initializer. Run it once with your admin principal.

Inputs
- admin: principal (Stacks address)

Actions
1) Call `init-admin(admin)` from the admin wallet.
2) Verify with a read-only `is-admin(admin)` if available in your version.

Notes
- Only call once; subsequent calls should be blocked by the contract.

---

## 3) Configure the Borrow Market (dynamic token registry)

Register each borrowable token via `add-token`. You can update metadata later with `set-token-meta`.

Function shapes (conceptual)
- `add-token(token-id: string, chain: uint, apy-bps: uint, liquidity: uint, status: uint)`
- `set-token-meta(token-id: string, chain: uint, apy-bps: uint, liquidity: uint, status: uint)`

Fields
- token-id: short string identifier, e.g., "USDC", "USDT", "ETH"
- chain: numeric enum for the chain (e.g., EVM). Use values defined in your contract
- apy-bps: displayed APY in basis points for this market (principal accrual is off-chain in MVP)
- liquidity: hint for UI depth/limits (uint)
- status: numeric enum, e.g., Active / Paused / ComingSoon (use your contract’s values)

Example (conceptual values)
- USDC on EVM: `{ token-id: "USDC", chain: <EVM_CODE>, apy-bps: u800, liquidity: u1000000000000000000, status: <ACTIVE_CODE> }`
- USDT on EVM: `{ token-id: "USDT", chain: <EVM_CODE>, apy-bps: u900, liquidity: u500000000000000000, status: <ACTIVE_CODE> }`
- ETH (WETH) on EVM: `{ token-id: "ETH", chain: <EVM_CODE>, apy-bps: u700, liquidity: u200000000000000000, status: <ACTIVE_CODE> }`

Verification (read-onlys)
- `is-supported-token(token-id)` → bool
- `get-borrow-token-meta(token-id)` → returns { chain, apy-bps, liquidity, status }
- `token-code-of(token-id)` → internal numeric code used as borrow key

Caveats
- Admin functions accept unchecked data in MVP; ensure only a trusted admin can call them.

---

## 4) Lending pool setup (lending-v1)

This contract exposes a fixed lending APY and tracks user balances of STX supplied to the pool.

Useful read-onlys
- `get-lend-apy-bps()` → e.g., u500 (5.00%)
- `get-lend-balance(user: principal)`
- `get-total-lend()`

User actions
- `deposit-lend-collateral(amount: uint)` → transfer STX in
- `withdraw-lend-collateral(amount: uint)` → transfer STX out (must not exceed balance)

Note
- APY is fixed by constant in the MVP; no on-chain interest accrual.

---

## 5) Collateral deposit/withdraw (collateral-v1)

User actions
- `deposit-collateral(amount: uint)` → transfer STX in and credit user collateral
- `withdraw-collateral(amount: uint)` → transfer STX out; requires no outstanding borrow (principal must be zero)

Useful read-onlys
- `get-collateral(user)` → ustx
- `get-total-collateral()`
- `get-borrowed(user, token-id)`
- `get-borrowed-total(user)`
- `get-liquidation-threshold-bps()`

---

## 6) Borrow and repay (principal-only, MVP)

Borrow request
- `request-borrow(token-id: string, amount: uint, evm-recipient?: (buff 20) optional)`
- Emits a `borrow-request` event including `user`, `token-id`, `amount`, and `evm-recipient` (zero address if none)
- In relayer mode, your off-chain service mints the corresponding ERC20 on EVM to `evm-recipient`

Repay signal
- `signal-repay(token-id: string, amount: uint)`
- Decreases principal by `amount`; emits a `repay-signal` event

Frontend tips
- Convert EVM recipient to a 20-byte buffer (buff20) when calling `request-borrow`
- Keep token decimals aligned between Stacks display and EVM mint amounts (e.g., 6 vs 18 decimals)

---

## 7) Health Factor (off-chain)

Compute HF in the frontend using your chosen oracle/prices. The contract provides a liquidation threshold (bps). Keep the UI conservative and block risky borrows client-side.

Read-only helpers
- `get-liquidation-threshold-bps()`
- Token meta via `get-borrow-token-meta` for APY display and status

---

## 8) Suggested staging flow (for frontend)

- Stage 1 (Stacks):
  1) `deposit-collateral(ustx)` → wait 1–2 confirmations
  2) `request-borrow(token-id, amount, some(buff20 evmRecipient))` → wait 1–2 confirmations
- Stage 2 (EVM):
  - Relayer mints tokens to `evmRecipient`; UI observes EVM balance increase
  - Repay path: user approves and repays on EVM; then call `signal-repay` on Stacks

---

## 9) Quick sanity checks

- After admin setup: `is-supported-token("USDC")` returns true
- After user deposit: `get-collateral(user)` increases by `amount`
- After borrow request: `get-borrowed(user, "USDC")` increases by `amount`
- After repay signal: `get-borrowed(user, "USDC")` decreases
- Withdraw only works when `get-borrowed-total(user) == 0`

---

## 10) Troubleshooting

- Function not found / wrong types: Confirm contract IDs and function parameter types (uint vs buff20 vs string)
- Withdraw blocked: Ensure `get-borrowed-total(user) == 0`
- EVM mint not seen: Check relayer logs and token allowlist; confirm `evm-recipient` encoded as buff20
- Decimals mismatch: Normalize UI input to ERC20 base units and ustx separately

---

## 11) Where next

- Relayer setup: `docs/RELAYER-EXPRESS.md` (Express + viem) or `docs/RELAYER.md` (minimal Node)
- Frontend guidance + Solidity references: `docs/INTEGRATION.md`
