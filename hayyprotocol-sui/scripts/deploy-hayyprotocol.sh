#!/bin/bash

# --- Absolute Path Configuration ---
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" &> /dev/null && pwd)
PROJECT_ROOT_DIR=$(dirname "$SCRIPT_DIR")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 HayyProtocol Deployment Script${NC}"
echo -e "${BLUE}==============================${NC}"
echo -e "${CYAN}Project Root: $PROJECT_ROOT_DIR${NC}"
echo ""

# --- Automatic Network Detection ---
echo -e "${BLUE}🔍 Detecting active Sui network...${NC}"
NETWORK=$(sui client active-env 2>/dev/null | tail -n 1)

if [ -z "$NETWORK" ]; then
    echo -e "${RED}❌ Could not detect active Sui network.${NC}"
    echo -e "${YELLOW}💡 Ensure Sui client is configured via 'sui client active-env'.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Active network detected: ${NETWORK}${NC}"
echo ""

# --- Configuration ---
GAS_BUDGET="100000000" # 0.25 SUI per transaction

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo -e "Network: ${NETWORK}"
echo -e "Gas Budget: ${GAS_BUDGET}"
echo -e "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# --- Helper Functions ---
get_explorer_url() {
    local network=$1
    local object_id=$2
    if [ "$network" == "localnet" ]; then
        echo "https://custom.suiscan.xyz/custom/object/${object_id}?network=http%3A%2F%2F127.0.0.1%3A9000"
    else
        echo "https://suiscan.xyz/${network}/object/${object_id}"
    fi
}

# --- Main Execution ---

# Step 1: Build the project
echo -e "${BLUE}🔧 Step 1: Building the project...${NC}"
if ! (cd "$PROJECT_ROOT_DIR" && sui move build 2>&1); then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Step 2: Deploy the package
echo -e "${BLUE}🚀 Step 2: Deploying package to ${NETWORK}...${NC}"
DEPLOY_RAW_OUTPUT=$(cd "$PROJECT_ROOT_DIR" && sui client publish --json 2>&1)
DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed with exit code ${DEPLOY_EXIT_CODE}!${NC}"
    echo -e "${RED}=== Full Error Output ===${NC}"
    echo "$DEPLOY_RAW_OUTPUT"
    echo ""
    echo -e "${YELLOW}💡 Common issues:${NC}"
    echo -e "  1. Insufficient gas - Check balance: ${GREEN}sui client gas${NC}"
    echo -e "  2. Request testnet tokens: ${GREEN}https://faucet.sui.io${NC}"
    echo -e "  3. Network connection issue - Verify: ${GREEN}sui client active-env${NC}"
    echo -e "  4. Try without --json: ${GREEN}sui client publish --gas-budget $GAS_BUDGET${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Extracting JSON from deployment output...${NC}"
DEPLOY_OUTPUT=$(echo "$DEPLOY_RAW_OUTPUT" | sed -n '/^{/,/^}$/p' | jq -s '.[0]' 2>/dev/null)
if [ -z "$DEPLOY_OUTPUT" ] || [ "$DEPLOY_OUTPUT" == "null" ]; then
    DEPLOY_OUTPUT=$(echo "$DEPLOY_RAW_OUTPUT" | grep -E '^{.*}$' | tail -1)
fi

if ! echo "$DEPLOY_OUTPUT" | jq . >/dev/null 2>&1; then
    echo -e "${RED}❌ Invalid JSON extracted from deployment output.${NC}"
    echo -e "${YELLOW}Raw output:${NC}"
    echo "$DEPLOY_RAW_OUTPUT"
    exit 1
fi
echo -e "${GREEN}✅ JSON extracted successfully!${NC}"

# Extract package ID, treasury caps, and BorrowRegistry
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | jq -r '.objectChanges[]? | select(.type == "published") | .packageId' 2>/dev/null)
USDC_TREASURY_CAP=$(echo "$DEPLOY_OUTPUT" | jq -r --arg pkg "$PACKAGE_ID" '.objectChanges[]? | select(.type == "created" and .objectType? and (.objectType | contains("TreasuryCap")) and (.objectType | contains("mock_usdc"))) | .objectId' 2>/dev/null | head -1)
SBTC_TREASURY_CAP=$(echo "$DEPLOY_OUTPUT" | jq -r --arg pkg "$PACKAGE_ID" '.objectChanges[]? | select(.type == "created" and .objectType? and (.objectType | contains("TreasuryCap")) and (.objectType | contains("mock_sbtc"))) | .objectId' 2>/dev/null | head -1)
BORROW_REGISTRY_ID=$(echo "$DEPLOY_OUTPUT" | jq -r '.objectChanges[]? | select(.type == "created" and .objectType? and (.objectType | contains("BorrowRegistry")) and .owner.Shared?) | .objectId' 2>/dev/null | head -1)

echo -e "${GREEN}✅ Package deployed successfully!${NC}"
echo -e "${GREEN}📦 Package ID: ${PACKAGE_ID}${NC}"
echo -e "${GREEN}📋 Borrow Registry: ${BORROW_REGISTRY_ID:-'❌ Not found'}${NC}"
echo ""
echo -e "${YELLOW}💰 Treasury Caps:${NC}"
echo -e "    USDC: ${USDC_TREASURY_CAP:-'❌ Not found'}"
echo -e "    sBTC: ${SBTC_TREASURY_CAP:-'❌ Not found'}"
echo ""

# Verify treasury caps were found
if [ -z "$USDC_TREASURY_CAP" ] || [ "$USDC_TREASURY_CAP" == "null" ]; then
    echo -e "${RED}❌ USDC Treasury Cap not found!${NC}"
    exit 1
fi
if [ -z "$SBTC_TREASURY_CAP" ] || [ "$SBTC_TREASURY_CAP" == "null" ]; then
    echo -e "${RED}❌ sBTC Treasury Cap not found!${NC}"
    exit 1
fi

# Step 3: Create Faucet Pool
echo -e "${BLUE}💰 Step 3: Creating Faucet Pool...${NC}"
FAUCET_RAW_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module faucet_pool \
    --function create_faucet_pool \
    --args $USDC_TREASURY_CAP $SBTC_TREASURY_CAP \
    --gas-budget $GAS_BUDGET \
    --json 2>&1)

if [ $? -eq 0 ]; then
    FAUCET_OUTPUT=$(echo "$FAUCET_RAW_OUTPUT" | sed -n '/^{/,/^}$/p' | jq -s '.[0]' 2>/dev/null)
    FAUCET_POOL_ID=$(echo "$FAUCET_OUTPUT" | jq -r --arg pkg "$PACKAGE_ID" '.objectChanges[]? | select(.type == "created" and .objectType? and (.objectType | contains("FaucetPool"))) | .objectId' 2>/dev/null | head -1)
    
    if [ ! -z "$FAUCET_POOL_ID" ] && [ "$FAUCET_POOL_ID" != "null" ]; then
        echo -e "${GREEN}✅ Faucet Pool created successfully!${NC}"
        echo -e "${GREEN}🪙 Faucet Pool ID: ${FAUCET_POOL_ID}${NC}"
    else
        echo -e "${YELLOW}⚠️  Faucet Pool created but ID not found in response${NC}"
        FAUCET_POOL_ID=""
    fi
else
    echo -e "${RED}❌ Faucet Pool creation failed!${NC}"
    echo "$FAUCET_RAW_OUTPUT"
    FAUCET_POOL_ID=""
fi
echo ""

# Step 4: Create USDC Lending Pool (with zero balance)
echo -e "${BLUE}🏦 Step 4: Creating USDC Lending Pool...${NC}"
USDC_POOL_RAW_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module usdc_lending_pool \
    --function create_usdc_pool_zero \
    --args 500 \
    --gas-budget $GAS_BUDGET \
    --json 2>&1)

if [ $? -eq 0 ]; then
    USDC_POOL_OUTPUT=$(echo "$USDC_POOL_RAW_OUTPUT" | sed -n '/^{/,/^}$/p' | jq -s '.[0]' 2>/dev/null)
    USDC_LENDING_POOL_ID=$(echo "$USDC_POOL_OUTPUT" | jq -r --arg pkg "$PACKAGE_ID" '.objectChanges[]? | select(.type == "created" and .objectType? and (.objectType | contains("UsdcLendingPool"))) | .objectId' 2>/dev/null | head -1)
    
    if [ ! -z "$USDC_LENDING_POOL_ID" ] && [ "$USDC_LENDING_POOL_ID" != "null" ]; then
        echo -e "${GREEN}✅ USDC Lending Pool created successfully!${NC}"
        echo -e "${GREEN}🏦 USDC Lending Pool ID: ${USDC_LENDING_POOL_ID}${NC}"
        echo -e "${GREEN}📈 APY: 5% (500 bps)${NC}"
    else
        echo -e "${YELLOW}⚠️  USDC Lending Pool created but ID not found in response${NC}"
        USDC_LENDING_POOL_ID=""
    fi
else
    echo -e "${RED}❌ USDC Lending Pool creation failed!${NC}"
    echo "$USDC_POOL_RAW_OUTPUT"
    USDC_LENDING_POOL_ID=""
fi
echo ""

# Step 5: Create sBTC Lending Pool (with zero balance)
echo -e "${BLUE}🏦 Step 5: Creating sBTC Lending Pool...${NC}"
SBTC_POOL_RAW_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module sbtc_lending_pool \
    --function create_sbtc_pool_zero \
    --args 800 \
    --gas-budget $GAS_BUDGET \
    --json 2>&1)

if [ $? -eq 0 ]; then
    SBTC_POOL_OUTPUT=$(echo "$SBTC_POOL_RAW_OUTPUT" | sed -n '/^{/,/^}$/p' | jq -s '.[0]' 2>/dev/null)
    SBTC_LENDING_POOL_ID=$(echo "$SBTC_POOL_OUTPUT" | jq -r --arg pkg "$PACKAGE_ID" '.objectChanges[]? | select(.type == "created" and .objectType? and (.objectType | contains("SbtcLendingPool"))) | .objectId' 2>/dev/null | head -1)
    
    if [ ! -z "$SBTC_LENDING_POOL_ID" ] && [ "$SBTC_LENDING_POOL_ID" != "null" ]; then
        echo -e "${GREEN}✅ sBTC Lending Pool created successfully!${NC}"
        echo -e "${GREEN}🏦 sBTC Lending Pool ID: ${SBTC_LENDING_POOL_ID}${NC}"
        echo -e "${GREEN}📈 APY: 8% (800 bps)${NC}"
    else
        echo -e "${YELLOW}⚠️  sBTC Lending Pool created but ID not found in response${NC}"
        SBTC_LENDING_POOL_ID=""
    fi
else
    echo -e "${RED}❌ sBTC Lending Pool creation failed!${NC}"
    echo "$SBTC_POOL_RAW_OUTPUT"
    SBTC_LENDING_POOL_ID=""
fi
echo ""

# Step 6: Save deployment information
echo -e "${BLUE}💾 Step 6: Saving deployment information...${NC}"

# Create deployment info JSON
cat > "$PROJECT_ROOT_DIR/deployment_info.json" << EOF
{
  "network": "$NETWORK",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "package_id": "$PACKAGE_ID",
  "borrow_registry_id": "${BORROW_REGISTRY_ID:-null}",
  "treasury_caps": {
    "usdc": "${USDC_TREASURY_CAP:-null}",
    "sbtc": "${SBTC_TREASURY_CAP:-null}"
  },
  "pools": {
    "faucet_pool": "${FAUCET_POOL_ID:-null}",
    "usdc_lending_pool": "${USDC_LENDING_POOL_ID:-null}",
    "sbtc_lending_pool": "${SBTC_LENDING_POOL_ID:-null}"
  },
  "explorer": {
    "package": "$(get_explorer_url $NETWORK $PACKAGE_ID)",
    "faucet_pool": "$(get_explorer_url $NETWORK ${FAUCET_POOL_ID:-null})",
    "usdc_pool": "$(get_explorer_url $NETWORK ${USDC_LENDING_POOL_ID:-null})",
    "sbtc_pool": "$(get_explorer_url $NETWORK ${SBTC_LENDING_POOL_ID:-null})"
  }
}
EOF

# Create BACKEND environment file
cat > "$PROJECT_ROOT_DIR/.env.backend" << EOF
# HayyProtocol Backend Environment Variables
# Generated on: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# Network: ${NETWORK}

export SUI_NETWORK=${NETWORK:-testnet}
export SUI_PACKAGE_ID=${PACKAGE_ID:-}
export BORROW_REGISTRY_ID=${BORROW_REGISTRY_ID:-}
export FAUCET_POOL_ID=${FAUCET_POOL_ID:-}
export USDC_LENDING_POOL_ID=${USDC_LENDING_POOL_ID:-}
export SBTC_LENDING_POOL_ID=${SBTC_LENDING_POOL_ID:-}
export USDC_TREASURY_CAP=${USDC_TREASURY_CAP:-}
export SBTC_TREASURY_CAP=${SBTC_TREASURY_CAP:-}
EOF

# Create FRONTEND environment file (simple format - ready to copy-paste)
cat > "$PROJECT_ROOT_DIR/.env.frontend" << EOF
VITE_SUI_NETWORK=${NETWORK:-testnet}
VITE_ORIGINAL_PACKAGE_ID=${PACKAGE_ID:-}
VITE_FAUCET_POOL_ID=${FAUCET_POOL_ID:-}
VITE_USDC_LENDING_POOL_ID=${USDC_LENDING_POOL_ID:-}
VITE_BORROW_REGISTRY_ID=${BORROW_REGISTRY_ID:-}
EOF

echo -e "${GREEN}✅ Deployment files saved:${NC}"
echo -e "    📄 ${PROJECT_ROOT_DIR}/deployment_info.json"
echo -e "    📄 ${PROJECT_ROOT_DIR}/.env.backend"
echo -e "    📄 ${PROJECT_ROOT_DIR}/.env.frontend"
echo ""

# Step 7: Display summary
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 HayyProtocol Deployment Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 Network:${NC} ${NETWORK}"
echo -e "${GREEN}📦 Package ID:${NC} ${PACKAGE_ID}"
echo ""
echo -e "${YELLOW}💰 Treasury Caps:${NC}"
echo -e "    USDC: ${USDC_TREASURY_CAP}"
echo -e "    sBTC: ${SBTC_TREASURY_CAP}"
echo ""
echo -e "${YELLOW}🏦 Deployed Pools:${NC}"
echo -e "    🪙 Faucet Pool: ${FAUCET_POOL_ID:-'❌ Failed'}"
echo -e "    💵 USDC Lending Pool (5% APY): ${USDC_LENDING_POOL_ID:-'❌ Failed'}"
echo -e "    ₿ sBTC Lending Pool (8% APY): ${SBTC_LENDING_POOL_ID:-'❌ Failed'}"
echo ""

# Display explorer links
if [ "$NETWORK" != "localnet" ]; then
    echo -e "${YELLOW}🔍 Explorer Links:${NC}"
    echo -e "    📦 Package: ${CYAN}$(get_explorer_url $NETWORK $PACKAGE_ID)${NC}"
    [ ! -z "$BORROW_REGISTRY_ID" ] && echo -e "    📋 Registry: ${CYAN}$(get_explorer_url $NETWORK $BORROW_REGISTRY_ID)${NC}"
    [ ! -z "$FAUCET_POOL_ID" ] && echo -e "    🪙 Faucet: ${CYAN}$(get_explorer_url $NETWORK $FAUCET_POOL_ID)${NC}"
    [ ! -z "$USDC_LENDING_POOL_ID" ] && echo -e "    💵 USDC Pool: ${CYAN}$(get_explorer_url $NETWORK $USDC_LENDING_POOL_ID)${NC}"
    [ ! -z "$SBTC_LENDING_POOL_ID" ] && echo -e "    ₿ sBTC Pool: ${CYAN}$(get_explorer_url $NETWORK $SBTC_LENDING_POOL_ID)${NC}"
    echo ""
fi

echo -e "${YELLOW}🎯 Next Steps:${NC}"
echo ""
echo -e "  ${BLUE}1. Update Frontend Environment:${NC}"
echo -e "     ${GREEN}cp ${PROJECT_ROOT_DIR}/.env.frontend ${PROJECT_ROOT_DIR}/../hayyprotocol-fe/.env.local${NC}"
echo ""
echo -e "  ${BLUE}2. Update Backend Environment:${NC}"
echo -e "     ${GREEN}source ${PROJECT_ROOT_DIR}/.env.backend${NC}"
echo ""
echo -e "  ${BLUE}3. Mint Test Tokens:${NC}"
echo -e "     ${GREEN}sui client call --package $PACKAGE_ID --module faucet_pool --function mint_usdc \\${NC}"
echo -e "     ${GREEN}  --args $FAUCET_POOL_ID 1000000000 --gas-budget $GAS_BUDGET${NC}"
echo ""
echo -e "  ${BLUE}4. Verify Deployment:${NC}"
echo -e "     ${GREEN}sui client object $FAUCET_POOL_ID${NC}"
echo -e "     ${GREEN}sui client object $USDC_LENDING_POOL_ID${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎊 Deployment completed successfully!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${CYAN}⏰ Completed at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')${NC}"
echo ""
