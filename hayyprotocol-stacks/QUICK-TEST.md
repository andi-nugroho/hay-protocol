# Quick Test - Copy & Paste Ready

## Open Console
```bash
clarinet console
```

---

## Copy-Paste Test Sequence

### 1️⃣ Initialize Admin
```clarity
(contract-call? .collateral-v1 init-admin)
(contract-call? .collateral-v1 is-admin tx-sender)
```

### 2️⃣ Deposit 10 STX
```clarity
(contract-call? .collateral-v1 get-collateral tx-sender)
(contract-call? .collateral-v1 deposit-collateral u10000000)
(contract-call? .collateral-v1 get-collateral tx-sender)
```

### 3️⃣ Request Withdraw 5 STX
```clarity
(contract-call? .collateral-v1 request-withdraw u5000000)
```

### 4️⃣ Switch to Wallet 1
```
::set_tx_sender ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5
```

### 5️⃣ Deposit from Wallet 1
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 deposit-collateral u10000000)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 get-total-collateral)
```

### 6️⃣ Switch Back to Admin
```
::set_tx_sender ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```

### 7️⃣ Admin Unlock 5 STX for Wallet 1
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 admin-unlock-collateral 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 u5000000)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 get-collateral 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
```

### 8️⃣ Check Portfolio
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 get-portfolio 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 get-portfolio 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 get-total-collateral)
```

---

## ✅ Done!

All core functions tested. Check HOW-TO-TEST.md for detailed explanations.

---

## ⚠️ Important Note

**When switching tx-sender:** You must use the **fully qualified contract name** with the deployer's address:

✅ **Correct:**
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.collateral-v1 deposit-collateral u10000000)
```

❌ **Wrong (will fail when tx-sender ≠ deployer):**
```clarity
(contract-call? .collateral-v1 deposit-collateral u10000000)
```

The shorthand `.collateral-v1` only works when you're calling from the deployer's context.
