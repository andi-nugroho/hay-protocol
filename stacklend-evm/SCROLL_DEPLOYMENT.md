# 🚀 Scroll Sepolia Deployment & Verification Guide

## ✅ Successfully Deployed Contracts

**Latest Deployment (Block 11452276-11452278):**

| Contract | Address | Transaction Hash |
|----------|---------|------------------|
| **BorrowController** | `0xD2b0838ff0818E9aa185a712576Cb3EE0885deda` | `0xc866c0e4466f9a6684e094c11921e3d02599f194716fde4e6e77461f4c22da0e` |
| **MockUSDC** | `0x953E5610c73C989fE7C75D3D67bE0A1e44a8e797` | `0x50e7175c6e18015827e3d57915d628e26e61757e796da352657153c1f1c21eda` |
| **MockUSDT** | `0x13cF4E3e284d34C575CeeCCb0791Ca535A657da2` | `0x31a7f854014071ea00b22575651ef2d60e6875b58c0c4d24955d7ac10d805b26` |
| **MockWBTC** | `0xf12cd252CA50781EC88c2d8832cA4f9c4bF11D82` | `0x2a33202ff38349c6e6d88f1379dd33e0154b11ff2fc580af9718d5666f91c58c` |

**Configuration:**
- **Network**: Scroll Sepolia (Chain ID: 534351)
- **RPC URL**: https://sepolia-rpc.scroll.io/
- **Explorer**: https://sepolia.scrollscan.com/
- **Relayer**: `0x5BAC06Ba1E1be967f8b9a6e962D1bC2a121F080a`
- **Owner**: `0x5BAC06Ba1E1be967f8b9a6e962D1bC2a121F080a`

## 🔧 Verification Methods

### Method 1: Manual Web Verification (Recommended)

1. **Go to Scrollscan Sepolia**: https://sepolia.scrollscan.com/

2. **For BorrowController** (`0xD2b0838ff0818E9aa185a712576Cb3EE0885deda`):
   - Navigate to the contract address
   - Click "Contract" → "Verify and Publish"
   - Fill in:
     - **Compiler Type**: Solidity (Single file)
     - **Compiler Version**: v0.8.28+commit.d7a07621
     - **License**: MIT License
     - **Contract Name**: BorrowController
     - **Constructor Arguments**: `0x0000000000000000000000005bac06ba1e1be967f8b9a6e962d1bc2a121f080a`

3. **For MockERC20 Tokens**:
   - **MockUSDC Constructor Args**: 
     ```
     0x00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000d4d6f636b2055534420436f696e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000
     ```
   - **MockUSDT Constructor Args**:
     ```
     0x00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e4d6f636b205465746865722055534400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553445400000000000000000000000000000000000000000000000000000000
     ```
   - **MockWBTC Constructor Args**:
     ```
     0x00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001654d6f636b20577261707065642042697463696e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000457425443000000000000000000000000000000000000000000000000000000000
     ```

### Method 2: Get a Valid Scrollscan API Key

1. Go to https://scrollscan.com/apis
2. Create an account and get a free API key
3. Update your `.env` file with the new key
4. Redeploy with verification:

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia-rpc.scroll.io/ \
  --broadcast \
  --verify \
  --verifier-url https://api-sepolia.scrollscan.com/api \
  --etherscan-api-key YOUR_NEW_API_KEY
```

### Method 3: Alternative Verification Tools

You can also try using Sourcify for verification:

```bash
forge verify-contract 0xD2b0838ff0818E9aa185a712576Cb3EE0885deda \
  src/BorrowController.sol:BorrowController \
  --verifier sourcify \
  --verifier-url https://sourcify.dev/server
```

## 🧪 Testing Your Deployment

Test that your contracts are working correctly:

```bash
# Check BorrowController owner
cast call 0xD2b0838ff0818E9aa185a712576Cb3EE0885deda "owner()" --rpc-url https://sepolia-rpc.scroll.io/

# Check relayer
cast call 0xD2b0838ff0818E9aa185a712576Cb3EE0885deda "relayer()" --rpc-url https://sepolia-rpc.scroll.io/

# Check if USDC is allowed
cast call 0xD2b0838ff0818E9aa185a712576Cb3EE0885deda "allowedToken(address)" 0x953E5610c73C989fE7C75D3D67bE0A1e44a8e797 --rpc-url https://sepolia-rpc.scroll.io/

# Check token details
cast call 0x953E5610c73C989fE7C75D3D67bE0A1e44a8e797 "name()" --rpc-url https://sepolia-rpc.scroll.io/
cast call 0x953E5610c73C989fE7C75D3D67bE0A1e44a8e797 "symbol()" --rpc-url https://sepolia-rpc.scroll.io/
```

## 🔗 Quick Links

- **BorrowController**: https://sepolia.scrollscan.com/address/0xD2b0838ff0818E9aa185a712576Cb3EE0885deda
- **MockUSDC**: https://sepolia.scrollscan.com/address/0x953E5610c73C989fE7C75D3D67bE0A1e44a8e797
- **MockUSDT**: https://sepolia.scrollscan.com/address/0x13cF4E3e284d34C575CeeCCb0791Ca535A657da2
- **MockWBTC**: https://sepolia.scrollscan.com/address/0xf12cd252CA50781EC88c2d8832cA4f9c4bF11D82

## 📝 Update Your Relayer Config

Don't forget to update your relayer configuration with the new contract addresses:

```bash
# Update stacklend-relayer/.env
BORROW_CONTROLLER=0xD2b0838ff0818E9aa185a712576Cb3EE0885deda
TOKEN_MAP={"USDC":"0x953E5610c73C989fE7C75D3D67bE0A1e44a8e797","USDT":"0x13cF4E3e284d34C575CeeCCb0791Ca535A657da2","WBTC":"0xf12cd252CA50781EC88c2d8832cA4f9c4bF11D82"}
```

Your contracts are now live on Scroll Sepolia! 🎉
