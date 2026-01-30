# Load environment variables
include .env
export

# Default network
NETWORK ?= sepolia

# RPC URL selection
ifeq ($(NETWORK),sepolia)
    RPC_URL = $(SEPOLIA_RPC_URL)
else ifeq ($(NETWORK),arbitrum)
    RPC_URL = $(ARBITRUM_RPC_URL)
else ifeq ($(NETWORK),scroll)
    RPC_URL = $(SCROLL_RPC_URL)
else ifeq ($(NETWORK),local)
    RPC_URL = http://localhost:8545
else
    RPC_URL = $(SEPOLIA_RPC_URL)
endif

# Common forge options
FORGE_OPTS = --rpc-url $(RPC_URL) --broadcast

# Add verification for non-local networks
ifneq ($(NETWORK),local)
    FORGE_OPTS += --verify
endif

.PHONY: help build test clean deploy deploy-controller deploy-tokens

help:
	@echo "Available commands:"
	@echo "  build           - Build contracts"
	@echo "  test            - Run tests"
	@echo "  clean           - Clean build artifacts"
	@echo "  deploy          - Deploy all contracts"
	@echo "  deploy-controller - Deploy BorrowController only"
	@echo "  deploy-tokens   - Deploy mock tokens only"
	@echo ""
	@echo "Network options (use NETWORK=<name>):"
	@echo "  local    - Local anvil (default port 8545)"
	@echo "  sepolia  - Sepolia testnet (default)"
	@echo "  arbitrum - Arbitrum mainnet"
	@echo "  scroll   - Scroll mainnet"
	@echo ""
	@echo "Examples:"
	@echo "  make deploy NETWORK=sepolia"
	@echo "  make deploy-controller NETWORK=arbitrum"

build:
	forge build

test:
	forge test

clean:
	forge clean

deploy:
	@echo "Deploying all contracts to $(NETWORK)..."
	forge script script/Deploy.s.sol $(FORGE_OPTS)

deploy-controller:
	@echo "Deploying BorrowController to $(NETWORK)..."
	forge script script/DeployBorrowController.s.sol $(FORGE_OPTS)

deploy-tokens:
	@echo "Deploying mock tokens to $(NETWORK)..."
	forge script script/DeployMockTokens.s.sol $(FORGE_OPTS)

# Quick local deployment for testing
local-deploy:
	@echo "Starting local anvil and deploying..."
	@anvil --fork-url $(SEPOLIA_RPC_URL) &
	@sleep 2
	@make deploy NETWORK=local
	@pkill anvil

# Verify contracts manually (if auto-verification fails)
verify-controller:
	@echo "Verifying BorrowController..."
	@read -p "Enter contract address: " addr; \
	read -p "Enter relayer address: " relayer; \
	forge verify-contract $$addr src/BorrowController.sol:BorrowController \
		--chain-id $$(cast chain-id --rpc-url $(RPC_URL)) \
		--constructor-args $$(cast abi-encode "constructor(address)" $$relayer) \
		--rpc-url $(RPC_URL)

verify-token:
	@echo "Verifying MockERC20..."
	@read -p "Enter contract address: " addr; \
	read -p "Enter token name: " name; \
	read -p "Enter token symbol: " symbol; \
	read -p "Enter token decimals: " decimals; \
	forge verify-contract $$addr src/MockERC20.sol:MockERC20 \
		--chain-id $$(cast chain-id --rpc-url $(RPC_URL)) \
		--constructor-args $$(cast abi-encode "constructor(string,string,uint8)" "$$name" "$$symbol" $$decimals) \
		--rpc-url $(RPC_URL)
