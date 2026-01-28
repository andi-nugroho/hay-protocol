#!/bin/bash

# HayyProtocol Relayer Setup Wizard
# Run: bash scripts/setup-wizard.sh

set -e

echo "🚀 HayyProtocol Relayer Setup Wizard"
echo "=================================="
echo ""

# Check if bun is installed
if command -v bun &> /dev/null; then
    PKG_MANAGER="bun"
    INSTALL_CMD="bun install"
    RUN_CMD="bun run"
else
    PKG_MANAGER="npm"
    INSTALL_CMD="npm install"
    RUN_CMD="npm run"
fi

echo "📦 Using package manager: $PKG_MANAGER"
echo ""

# Step 1: Install dependencies
echo "Step 1/7: Installing dependencies..."
$INSTALL_CMD
echo "✅ Dependencies installed"
echo ""

# Step 2: Generate keypairs
echo "Step 2/7: Generating keypairs..."
echo "⚠️  Save these keys securely!"
echo ""
npx tsx scripts/generate-keys.ts
echo ""
echo "Press ENTER after you've saved the keys..."
read

# Step 3: Create .env file
echo "Step 3/7: Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "⚠️  .env already exists, skipping..."
fi
echo ""

# Step 4: Prompt for configuration
echo "Step 4/7: Configure environment variables"
echo "----------------------------------------"
echo "Please edit .env file now and fill in:"
echo "  - STACKS_COLLATERAL_CONTRACT (your deployed contract)"
echo "  - RELAYER_STACKS_PRIVATE_KEY (from step 2)"
echo "  - RELAYER_SUI_PRIVATE_KEY (from step 2)"
echo ""
echo "Open .env in your editor now? (y/n)"
read -p "> " EDIT_ENV

if [ "$EDIT_ENV" = "y" ] || [ "$EDIT_ENV" = "Y" ]; then
    ${EDITOR:-nano} .env
fi

echo ""
echo "Press ENTER when you've configured .env..."
read

# Step 5: Address mapping
echo "Step 5/7: Configure address mapping"
echo "-----------------------------------"
echo "Please edit address-mapping.json and add your Stacks <-> Sui address mappings"
echo ""
echo "Example:"
echo '  "ST1ABC...": "0x123def..."'
echo ""
echo "Open address-mapping.json in your editor now? (y/n)"
read -p "> " EDIT_MAPPING

if [ "$EDIT_MAPPING" = "y" ] || [ "$EDIT_MAPPING" = "Y" ]; then
    ${EDITOR:-nano} address-mapping.json
fi

echo ""
echo "Press ENTER when you've configured address mappings..."
read

# Step 6: Fund wallets reminder
echo "Step 6/7: Fund Relayer Wallets"
echo "-------------------------------"
echo "⚠️  IMPORTANT: Fund your relayer wallets before proceeding!"
echo ""
echo "Stacks Testnet Faucet:"
echo "  https://explorer.hiro.so/sandbox/faucet?chain=testnet"
echo ""
echo "Sui Testnet Faucet:"
echo "  https://faucet.sui.io/"
echo ""
echo "Press ENTER when wallets are funded..."
read

# Step 7: Initialize admin
echo "Step 7/7: Initialize Admin on Stacks"
echo "------------------------------------"
echo "You need to initialize the admin on your Stacks contract."
echo ""
echo "Run this in clarinet console:"
echo "  (contract-call? .collateral-v2 init-admin)"
echo ""
echo "Have you initialized the admin? (y/n)"
read -p "> " ADMIN_INIT

if [ "$ADMIN_INIT" != "y" ] && [ "$ADMIN_INIT" != "Y" ]; then
    echo ""
    echo "⚠️  Please initialize admin before running relayer!"
    echo "   See SETUP.md Step 4 for instructions"
    exit 1
fi

# Done!
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Your relayer is ready to run!"
echo ""
echo "To start in development mode:"
echo "  $RUN_CMD dev"
echo ""
echo "To build and run in production:"
echo "  $RUN_CMD build"
echo "  $RUN_CMD start"
echo ""
echo "📖 See SETUP.md for detailed instructions"
echo "📖 See README.md for architecture details"
echo ""
