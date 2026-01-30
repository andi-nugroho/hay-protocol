// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BorrowController} from "../src/BorrowController.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployScript is Script {
    BorrowController public borrowController;
    MockERC20 public mockUSDC;
    MockERC20 public mockUSDT;
    MockERC20 public mockWBTC;

    // Default relayer address (can be overridden with environment variable)
    address public constant DEFAULT_RELAYER = 0x1234567890123456789012345678901234567890;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address relayer = vm.envOr("RELAYER_ADDRESS", DEFAULT_RELAYER);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock tokens
        console.log("Deploying MockERC20 tokens...");
        
        mockUSDC = new MockERC20("Mock USD Coin", "USDC", 6);
        console.log("MockUSDC deployed at:", address(mockUSDC));
        
        mockUSDT = new MockERC20("Mock Tether USD", "USDT", 6);
        console.log("MockUSDT deployed at:", address(mockUSDT));
        
        mockWBTC = new MockERC20("Mock Wrapped Bitcoin", "WBTC", 8);
        console.log("MockWBTC deployed at:", address(mockWBTC));

        // Deploy BorrowController
        console.log("Deploying BorrowController...");
        borrowController = new BorrowController(relayer);
        console.log("BorrowController deployed at:", address(borrowController));
        console.log("Relayer set to:", relayer);

        // Set allowed tokens
        console.log("Setting allowed tokens...");
        borrowController.setAllowedToken(address(mockUSDC), true);
        borrowController.setAllowedToken(address(mockUSDT), true);
        borrowController.setAllowedToken(address(mockWBTC), true);

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("BorrowController:", address(borrowController));
        console.log("MockUSDC:", address(mockUSDC));
        console.log("MockUSDT:", address(mockUSDT));
        console.log("MockWBTC:", address(mockWBTC));
        console.log("Relayer:", relayer);
        console.log("Owner:", vm.addr(deployerPrivateKey));
    }
}
