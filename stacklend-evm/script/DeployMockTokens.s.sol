// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployMockTokens is Script {
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Define token configurations
        TokenConfig[] memory tokens = new TokenConfig[](3);
        tokens[0] = TokenConfig("Mock USD Coin", "USDC", 6);
        tokens[1] = TokenConfig("Mock Tether USD", "USDT", 6);
        tokens[2] = TokenConfig("Mock Wrapped Bitcoin", "WBTC", 8);

        // Deploy tokens
        address[] memory deployedTokens = new address[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            MockERC20 token = new MockERC20(
                tokens[i].name,
                tokens[i].symbol,
                tokens[i].decimals
            );
            deployedTokens[i] = address(token);
            
            console.log(
                string.concat(tokens[i].symbol, " deployed at:"),
                address(token)
            );
        }

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== MOCK TOKENS DEPLOYMENT SUMMARY ===");
        for (uint256 i = 0; i < tokens.length; i++) {
            console.log(
                string.concat(tokens[i].symbol, ":"),
                deployedTokens[i]
            );
        }
    }
}
