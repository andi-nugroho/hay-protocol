// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract MockERC20Test is Test {
    MockERC20 public token;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    function setUp() public {
        token = new MockERC20("Test Token", "TEST", 18);
    }

    function testMintSuccess() public {
        token.mint(user1, 1000);
        
        assertEq(token.balanceOf(user1), 1000);
        assertEq(token.totalSupply(), 1000);
    }

    function testMintFailsWithZeroAddress() public {
        vm.expectRevert(MockERC20.InvalidAddress.selector);
        token.mint(address(0), 1000);
    }

    function testTransferSuccess() public {
        token.mint(user1, 1000);
        
        vm.prank(user1);
        token.transfer(user2, 500);
        
        assertEq(token.balanceOf(user1), 500);
        assertEq(token.balanceOf(user2), 500);
    }

    function testTransferFailsWithInsufficientBalance() public {
        token.mint(user1, 100);
        
        vm.prank(user1);
        vm.expectRevert(MockERC20.InsufficientBalance.selector);
        token.transfer(user2, 500);
    }

    function testTransferFailsWithZeroAddress() public {
        token.mint(user1, 1000);
        
        vm.prank(user1);
        vm.expectRevert(MockERC20.InvalidAddress.selector);
        token.transfer(address(0), 500);
    }

    function testApproveAndTransferFrom() public {
        token.mint(user1, 1000);
        
        vm.prank(user1);
        token.approve(user2, 500);
        
        vm.prank(user2);
        token.transferFrom(user1, user2, 300);
        
        assertEq(token.balanceOf(user1), 700);
        assertEq(token.balanceOf(user2), 300);
        assertEq(token.allowance(user1, user2), 200);
    }

    function testTransferFromFailsWithInsufficientAllowance() public {
        token.mint(user1, 1000);
        
        vm.prank(user2);
        vm.expectRevert(MockERC20.InsufficientAllowance.selector);
        token.transferFrom(user1, user2, 500);
    }

    function testBurnFromSuccess() public {
        token.mint(user1, 1000);
        
        vm.prank(user1);
        token.approve(user2, 500);
        
        vm.prank(user2);
        token.burnFrom(user1, 300);
        
        assertEq(token.balanceOf(user1), 700);
        assertEq(token.totalSupply(), 700);
        assertEq(token.allowance(user1, user2), 200);
    }

    function testBurnFromFailsWithInsufficientBalance() public {
        token.mint(user1, 100);
        
        vm.prank(user1);
        token.approve(user2, 500);
        
        vm.prank(user2);
        vm.expectRevert(MockERC20.InsufficientBalance.selector);
        token.burnFrom(user1, 500);
    }

    function testBurnFromFailsWithInsufficientAllowance() public {
        token.mint(user1, 1000);
        
        vm.prank(user2);
        vm.expectRevert(MockERC20.InsufficientAllowance.selector);
        token.burnFrom(user1, 500);
    }
}
