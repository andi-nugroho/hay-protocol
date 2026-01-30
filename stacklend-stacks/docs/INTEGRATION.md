# StackLend Cross-Chain MVP Integration Guide

This guide shows how to integrate the Clarity contracts from this repo with a simple EVM setup (Base Sepolia) so users can borrow EVM tokens using real STX testnet collateral.

- On Stacks: STX collateral and positions tracked in Clarity.
- On EVM: mock ERC20s minted/burned by a minimal controller callable by a relayer.
- Interest/APY is informational (fixed bps); no on-chain accrual in MVP.

---

## Contracts overview (Stacks)

Clarity contracts in `contracts/`:

- `collateral-v1.clar`
  - deposit-collateral(amount)
  - withdraw-collateral(amount) — blocked while any borrow > 0 (MVP safety)
  - request-borrow(token-id, amount, evm-opt) — emits event with EVM recipient
  - signal-repay(token-id, amount)
  - get-collateral(user), get-borrowed(user, token-id), get-borrowed-total(user)
  - get-portfolio(user) — snapshot for UI
  - get-borrow-apy-bps(), get-liquidation-threshold-bps()
  - Dynamic token registry (admin only):
    - init-admin(), add-token(token-id, chain, apy-bps, liquidity, status)
    - set-token-meta(token-id, chain, apy-bps, liquidity, status)
    - get-borrow-token-meta(token-id)

- `lending-v1.clar`
  - deposit-lend-collateral(amount)
  - withdraw-lend-collateral(amount)
  - get-lend-balance(user), get-total-lend(), get-lend-apy-bps()

Notes
- STX movement uses the Clarity builtin `stx-transfer?` internally. You do not attach STX as `amount` to contract-calls.
- Token IDs are short ASCII strings, e.g., `"USDC"`, `"USDT"`, `"ETH"`.

---

## Frontend integration (Stacks)

Recommended lib: `@stacks/transactions`.

- Deposit STX collateral
  - function: `deposit-collateral`
  - args: `[uintCV(amountUstx)]`

- Borrow intent (with EVM recipient)
  - function: `request-borrow`
  - args: `[
      stringAsciiCV(tokenId),
      uintCV(borrowAmount),
      someCV(bufferCV(Buffer.from(evmAddress.slice(2), 'hex'))) // 20 bytes
    ]`
  - Event emitted: `{ event: "borrow-request", user, token-id, amount, evm-recipient }`

- Repay reflection
  - function: `signal-repay`
  - args: `[stringAsciiCV(tokenId), uintCV(repayAmount)]`

- Withdraw collateral
  - function: `withdraw-collateral`
  - args: `[uintCV(amountUstx)]`
  - Precondition: `get-borrowed-total(user) == 0` (MVP rule)

- Lend STX (deposit/withdraw)
  - `lending-v1.deposit-lend-collateral(amount)` / `withdraw-lend-collateral(amount)`

- Read-only for UI
  - Totals: `get-total-collateral`, `get-total-borrowed`, `get-total-lend`
  - Positions: `get-portfolio(user)` or individual getters
  - APY: `get-borrow-apy-bps`, `get-lend-apy-bps` (fixed bps)
  - Token meta: `get-borrow-token-meta(token-id)`

---

## Health Factor (off-chain)

Formula: `HF = (collateralUsd * liqThresholdBps / 10000) / borrowedUsd`.

Inputs
- `collateralUsd = get-collateral(user) * priceSTXUSD`
- `borrowedUsd = sum(get-borrowed(user, token) * priceTokenUSD)`
- `liqThresholdBps = get-liquidation-threshold-bps()`

Interpretation: `HF > 1` safe; `HF < 1` risky. No liquidation in MVP.

---

## Borrow market (dynamic)

Admin flow
1) `init-admin()` once.
2) `add-token("USDC", CHAIN_ETH, 800, 100000000000, STATUS_AVAILABLE)` — repeat per token.
3) Update later with `set-token-meta`.

UI listing
- Keep a small frontend list of supported `token-id`s.
- For each, call `get-borrow-token-meta(token-id)`.

---

## Relayer (Stacks → EVM) — minimal setup

Goal: Mint EVM tokens after a borrow intent on Stacks; later reflect repayment.

Components
- Stacks API endpoint to watch events.
- Base Sepolia RPC, relayer EVM key (funded test ETH).
- Mapping `token-id` → EVM token address.
- EVM `BorrowController` (below) with RELAYER-only methods.

Event to watch
- `borrow-request` with fields: `user`, `token-id`, `amount`, `evm-recipient`.

High-level loop (Node.js)
1) Poll Stacks events for your `collateral-v1` contract.
2) For each `borrow-request` not yet processed:
   - Resolve `token-id` → ERC20 address.
   - Call EVM controller: `borrow(token, evmRecipient, amount)`.
   - Store/log EVM tx hash.

Repay (MVP)
- User approves controller and transfers allowance, relayer calls `repay(token, from, amount)`.
- Then frontend calls `signal-repay(token-id, amount)` on Stacks.

---

## Solidity (Base Sepolia)

BorrowController.sol — relayer-only mint/burn via allowed tokens

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMintableBurnableERC20 {
    function mint(address to, uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function allowance(address owner, address spender) external view returns (uint256);
}

contract BorrowController {
    address public owner;
    address public relayer;
    mapping(address => bool) public allowedToken;

    event RelayerUpdated(address indexed relayer);
    event TokenAllowed(address indexed token, bool allowed);
    event Borrowed(address indexed token, address indexed to, uint256 amount);
    event Repaid(address indexed token, address indexed from, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not-owner");
        _;
    }
    modifier onlyRelayer() {
        require(msg.sender == relayer, "not-relayer");
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
        require(allowedToken[token], "token-not-allowed");
        require(to != address(0), "bad-to");
        require(amount > 0, "bad-amount");
        IMintableBurnableERC20(token).mint(to, amount);
        emit Borrowed(token, to, amount);
    }

    function repay(address token, address from, uint256 amount) external onlyRelayer {
        require(allowedToken[token], "token-not-allowed");
        require(from != address(0), "bad-from");
        require(amount > 0, "bad-amount");
        uint256 allowed = IMintableBurnableERC20(token).allowance(from, address(this));
        require(allowed >= amount, "insufficient-allowance");
        IMintableBurnableERC20(token).burnFrom(from, amount);
        emit Repaid(token, from, amount);
    }
}
```

MockERC20.sol — simple token with mint/burnFrom

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        require(to != address(0), "zero-to");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burnFrom(address from, uint256 amount) external {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "zero-to");
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
```

---

## Try it (sequence)

1) Stacks testnet: deploy contracts; run `init-admin` and `add-token` for `USDC`, `USDT`, `ETH`.
2) Base Sepolia: deploy `MockERC20` tokens and `BorrowController(relayer)`; allow tokens.
3) Frontend: user deposits STX collateral (`deposit-collateral`).
4) Frontend: user calls `request-borrow("USDC", amount, some(buff20(EVM)))`.
5) Relayer: sees `borrow-request`, calls `borrow(mockUSDC, evmRecipient, amount)` on Base.
6) Repay: user approves controller and repays on Base; frontend calls `signal-repay` on Stacks.
7) Withdraw STX collateral when `get-borrowed-total(user) == 0`.

---

## FAQ

- What is `stx-transfer?`?
  - A Clarity builtin that moves STX: `(stx-transfer? amount sender recipient) -> (response bool uint)`.
  - The contracts use it to move STX into/out of the contract safely.

- Is interest calculated on-chain?
  - No (MVP). APY is fixed (bps) for display; balances track principal only.

- Do I need a relayer?
  - For MVP, yes. Later you can upgrade to guardian approvals or a messaging bridge.

---

## Hardening roadmap (optional)

- Add request IDs and pending/finalized states for borrow/repay.
- Add guardian M-of-N finalize on Stacks for EVM outcomes.
- Integrate a cross-chain messaging bridge or oracle for attestations.
- Introduce on-chain rate indexes if you want on-chain interest accrual later.
