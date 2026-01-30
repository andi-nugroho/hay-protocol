// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BorrowController} from "../src/BorrowController.sol";

contract DeployBorrowController is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address relayer = vm.envOr("RELAYER_ADDRESS", address(0x1234567890123456789012345678901234567890));
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy BorrowController
        console.log("Deploying BorrowController with relayer:", relayer);
        BorrowController borrowController = new BorrowController(relayer);
        
        console.log("BorrowController deployed at:", address(borrowController));
        console.log("Owner:", borrowController.owner());
        console.log("Relayer:", borrowController.relayer());

        vm.stopBroadcast();
    }
}
