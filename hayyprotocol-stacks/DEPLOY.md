# Deploy Stacks Contract to Testnet

## Prerequisites

1. **Testnet STX Balance** (untuk gas fees)
   - Minimal ~1 STX untuk deployment
   - Faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
   - Atau: https://stacks-testnet-faucet.vercel.app/

2. **Stacks Wallet** (Hiro/Leather/Xverse)
   - Install dari: https://wallet.hiro.so/

---

## Step 1: Setup Testnet Config

Edit file `settings/Testnet.toml`:

```toml
[network]
name = "testnet"
node_rpc_address = "https://api.testnet.hiro.so"
deployment_fee_rate = 10

[accounts.deployer]
# Option 1: Pake Mnemonic (24 words)
mnemonic = "your 24 word mnemonic phrase here ..."

# Option 2: Pake Secret Key (lebih aman)
# secret_key = "your_secret_key_here"
```

### Cara dapat Private Key/Mnemonic:

**Hiro Wallet:**
1. Buka Hiro Wallet
2. Klik Settings → View Secret Key
3. Copy Mnemonic (24 words) atau Secret Key

**Leather Wallet:**
1. Buka Leather Wallet
2. Settings → Security → Reveal Secret Key
3. Copy Mnemonic atau Secret Key

⚠️ **JANGAN SHARE PRIVATE KEY/MNEMONIC KE SIAPAPUN!**

---

## Step 2: Generate Deployment Plan

```bash
clarinet deployments generate --testnet
```

Ini akan create file `deployments/default.testnet-plan.yaml`

---

## Step 3: Check Deployment Plan

```bash
clarinet deployments check --testnet
```

Ini akan validate deployment plan.

---

## Step 4: Deploy ke Testnet

```bash
clarinet deployments apply --testnet
```

atau dengan manual cost:

```bash
clarinet deployments apply --testnet --manual-cost
```

---

## Step 5: Verify Deployment

Cek di Stacks Explorer:
```
https://explorer.hiro.so/txid/YOUR_TX_ID?chain=testnet
```

Atau cek contract address:
```
https://explorer.hiro.so/address/YOUR_ADDRESS?chain=testnet
```

---

## Alternative: Deploy via Stacks CLI

### Install Stacks CLI (if needed)
```bash
npm install -g @stacks/cli
```

### Deploy Contract
```bash
stx deploy_contract \
  ./contracts/collateral-v1.clar \
  collateral-v1 \
  1000 \
  0 \
  --testnet \
  --privateKey YOUR_PRIVATE_KEY
```

---

## After Deployment

1. **Save Contract Address**
   - Contract will be at: `YOUR_ADDRESS.collateral-v1`
   - Example: `ST1ABC...XYZ.collateral-v1`

2. **Initialize Admin**
   ```bash
   stx call YOUR_ADDRESS.collateral-v1 init-admin \
     --testnet \
     --privateKey YOUR_PRIVATE_KEY
   ```

3. **Update Frontend Config**

   Edit `hayyprotocol-fe/src/lib/config.ts`:
   ```typescript
   testnet: {
     COLLATERAL: {
       address: 'YOUR_DEPLOYED_ADDRESS',
       name: 'collateral-v1'
     }
   }
   ```

---

## Troubleshooting

### Error: "Insufficient balance"
- Request STX from faucet
- Wait beberapa menit untuk konfirmasi

### Error: "Contract already exists"
- Ganti nama contract di `Clarinet.toml`
- Atau deploy dengan address baru

### Error: "Invalid private key"
- Check format private key (64 hex characters)
- Pastikan tidak ada spasi atau newline

---

## Cost Estimates

- **Contract Deployment:** ~0.1 - 0.5 STX
- **init-admin call:** ~0.001 STX
- **Total estimated:** ~0.5 - 1 STX

---

## Security Checklist

- [ ] ✅ `settings/Testnet.toml` is in `.gitignore`
- [ ] ✅ Never commit private key to git
- [ ] ✅ Use separate wallet for testnet
- [ ] ✅ Keep mainnet keys separate
- [ ] ✅ Test on devnet first if unsure

---

## Quick Commands Reference

```bash
# 1. Generate deployment
clarinet deployments generate --testnet

# 2. Check deployment
clarinet deployments check --testnet

# 3. Deploy
clarinet deployments apply --testnet

# 4. Check contract on explorer
# https://explorer.hiro.so/address/YOUR_ADDRESS?chain=testnet
```

---

## Next Steps After Deployment

1. ✅ Test deposit-collateral on testnet
2. ✅ Test request-withdraw on testnet
3. ✅ Update frontend with deployed address
4. ✅ Build relayer service
5. ✅ Test full cross-chain flow
