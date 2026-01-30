// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMintableBurnableERC20 {
    function mint(address to, uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function allowance(address owner, address spender) external view returns (uint256);
}

contract BorrowController {
    // Custom errors
    error NotOwner();
    error NotRelayer();
    error TokenNotAllowed();
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientAllowance();
    
    address public owner;
    address public relayer;
    mapping(address => bool) public allowedToken;

    event RelayerUpdated(address indexed relayer);
    event TokenAllowed(address indexed token, bool allowed);
    event Borrowed(address indexed token, address indexed to, uint256 amount);
    event Repaid(address indexed token, address indexed from, uint256 amount);



    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedToken[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function borrow(address token, address to, uint256 amount) external onlyRelayer {
        if (!allowedToken[token]) revert TokenNotAllowed();
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        IMintableBurnableERC20(token).mint(to, amount);
        emit Borrowed(token, to, amount);
    }

    function repay(address token, address from, uint256 amount) external onlyRelayer {
        if (!allowedToken[token]) revert TokenNotAllowed();
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        uint256 allowed = IMintableBurnableERC20(token).allowance(from, address(this));
        if (allowed < amount) revert InsufficientAllowance();
        IMintableBurnableERC20(token).burnFrom(from, amount);
        emit Repaid(token, from, amount);
    }
}