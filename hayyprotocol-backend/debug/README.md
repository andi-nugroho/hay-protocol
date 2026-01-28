# Debug & Testing Scripts

Utility scripts untuk debugging dan testing HayyProtocol backend.

## 📁 Available Scripts

### `check-position.js`
Check posisi collateral spesifik berdasarkan Sui address.

```bash
node debug/check-position.js <SUI_ADDRESS>
```

**Output:**
- STX collateral amount
- sBTC collateral amount
- USDC borrowed
- Borrow power
- Liquidation status

---

### `check-all-positions.js`
Check semua posisi collateral yang ada di registry.

```bash
node debug/check-all-positions.js
```

**Output:**
- List semua positions
- Total positions
- Summary data

---

### `check-positions.js`
Alternative script untuk check multiple positions.

```bash
node debug/check-positions.js
```

---

### `check-registry.js`
Check registry Sui dan semua dynamic fields.

```bash
node debug/check-registry.js
```

**Output:**
- Registry object ID
- All dynamic fields
- Field types and values

---

### `lookup-by-stacks.js`
Lookup posisi berdasarkan Stacks address.

```bash
node debug/lookup-by-stacks.js <STACKS_ADDRESS>
```

**Flow:**
1. Load address mapping dari `address-mapping.json`
2. Cari Sui address yang terhubung
3. Query posisi dari Sui

---

### `debug-sui.js`
General debugging untuk Sui connections dan transactions.

```bash
node debug/debug-sui.js
```

---

### `test-sui-call.js`
Test Sui contract calls dan transactions.

```bash
node debug/test-sui-call.js
```

**Use cases:**
- Test connectivity ke Sui RPC
- Test contract function calls
- Debug transaction issues

---

## 🔧 Usage Tips

### Quick Checks
```bash
# Check if relayer is processing correctly
node debug/check-all-positions.js

# Verify specific user position
node debug/check-position.js 0x1234...

# Lookup by Stacks address
node debug/lookup-by-stacks.js ST1ABC...
```

### Troubleshooting
```bash
# If position not found
1. Check address mapping exists
2. Verify collateral was deposited
3. Check relayer logs for errors

# If registry is empty
1. Ensure relayer is running
2. Check Sui RPC connection
3. Verify contract addresses in .env
```

---

## 📝 Notes

- Semua scripts require `.env` configured
- Scripts menggunakan Sui testnet by default
- Pastikan `SUI_BORROW_REGISTRY_ID` benar di `.env`

---

## 🔗 Related

- [Main README](../README.md)
- [Relayer Source Code](../src/relayer.ts)
- [Sui Client](../src/suiClient.ts)
