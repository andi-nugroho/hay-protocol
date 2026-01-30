// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BorrowController} from "../src/BorrowController.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract BorrowControllerTest is Test {
    BorrowController public borrowController;
    MockERC20 public token;
    
    address public owner = address(0x1);
    address public relayer = address(0x2);
    address public user = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        borrowController = new BorrowController(relayer);
        token = new MockERC20("Test Token", "TEST", 18);
        borrowController.setAllowedToken(address(token), true);
        vm.stopPrank();
    }

    function testBorrowSuccess() public {
        vm.prank(relayer);
        borrowController.borrow(address(token), user, 1000);
        
        assertEq(token.balanceOf(user), 1000);
        assertEq(token.totalSupply(), 1000);
    }

    function testBorrowFailsWithUnauthorizedCaller() public {
        vm.prank(user);
        vm.expectRevert(BorrowController.NotRelayer.selector);
        borrowController.borrow(address(token), user, 1000);
    }

    function testBorrowFailsWithDisallowedToken() public {
        MockERC20 disallowedToken = new MockERC20("Disallowed", "DIS", 18);
        
        vm.prank(relayer);
        vm.expectRevert(BorrowController.TokenNotAllowed.selector);
        borrowController.borrow(address(disallowedToken), user, 1000);
    }

    function testBorrowFailsWithZeroAddress() public {
        vm.prank(relayer);
        vm.expectRevert(BorrowController.InvalidAddress.selector);
        borrowController.borrow(address(token), address(0), 1000);
    }

    function testBorrowFailsWithZeroAmount() public {
        vm.prank(relayer);
        vm.expectRevert(BorrowController.InvalidAmount.selector);
        borrowController.borrow(address(token), user, 0);
    }

    function testRepaySuccess() public {
        // First borrow
        vm.prank(relayer);
        borrowController.borrow(address(token), user, 1000);
        
        // Approve and repay
        vm.startPrank(user);
        token.approve(address(borrowController), 500);
        vm.stopPrank();
        
        vm.prank(relayer);
        borrowController.repay(address(token), user, 500);
        
        assertEq(token.balanceOf(user), 500);
        assertEq(token.totalSupply(), 500);
    }

    function testRepayFailsWithInsufficientAllowance() public {
        // First borrow
        vm.prank(relayer);
        borrowController.borrow(address(token), user, 1000);
        
        // Try to repay without approval
        vm.prank(relayer);
        vm.expectRevert(BorrowController.InsufficientAllowance.selector);
        borrowController.repay(address(token), user, 500);
    }

    function testSetRelayerOnlyOwner() public {
        address newRelayer = address(0x4);
        
        vm.prank(owner);
        borrowController.setRelayer(newRelayer);
        assertEq(borrowController.relayer(), newRelayer);
        
        vm.prank(user);
        vm.expectRevert(BorrowController.NotOwner.selector);
        borrowController.setRelayer(address(0x5));
    }

    function testSetAllowedTokenOnlyOwner() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 18);
        
        vm.prank(owner);
        borrowController.setAllowedToken(address(newToken), true);
        assertTrue(borrowController.allowedToken(address(newToken)));
        
        vm.prank(user);
        vm.expectRevert(BorrowController.NotOwner.selector);
        borrowController.setAllowedToken(address(newToken), false);
    }
}
