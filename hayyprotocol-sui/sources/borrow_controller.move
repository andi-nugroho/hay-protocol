module hayyprotocol::borrow_controller;

use sui::{coin::{Self, Coin}, dynamic_field, event};
use hayyprotocol::mock_sbtc::MOCK_SBTC;
use hayyprotocol::mock_usdc::MOCK_USDC;
use hayyprotocol::usdc_lending_pool::{Self, UsdcLendingPool};

// ========================================
//  ERROR CODES
// ========================================
const E_INVALID_AMOUNT: u64 = 201;
const E_INSUFFICIENT_COLLATERAL: u64 = 202;
const E_POSITION_NOT_FOUND: u64 = 203;
const E_INSUFFICIENT_REPAYMENT: u64 = 204;
const E_POSITION_HEALTHY: u64 = 205;
const E_INVALID_COLLATERAL_TYPE: u64 = 206;
const E_NOT_AUTHORIZED: u64 = 207;

// ========================================
//  CONSTANTS
// ========================================
// LTV ratios in basis points (1 bps = 0.01%)
const LTV_SBTC: u64 = 7000; // 70% LTV for sBTC
const LTV_STX: u64 = 6000;  // 60% LTV for STX

// Liquidation threshold (85% of max LTV)
const LIQUIDATION_THRESHOLD_BPS: u64 = 8500; // 85%

// Liquidation penalty (5%)
const LIQUIDATION_PENALTY_BPS: u64 = 500;

// Borrow interest rate (8% APR)
const BORROW_APR_BPS: u64 = 800;

// Collateral types
const COLLATERAL_TYPE_SBTC_SUI: u8 = 1;
const COLLATERAL_TYPE_SBTC_STACKS: u8 = 2;
const COLLATERAL_TYPE_STX_STACKS: u8 = 3;

// ========================================
//  STRUCTS
// ========================================

public struct BORROW_CONTROLLER has drop {}

// Global registry for all borrow positions

#[allow(lint(coin_field))]
public struct BorrowRegistry has key {
    id: UID,
    // Positions stored as dynamic fields with user address as key
    // No need for separate Table, positions are stored directly in UID

    // Protocol admin
    admin: address,
    // Oracle prices (in USD with 6 decimals) - simplified for MVP
    sbtc_price_usd: u64, // e.g., 65000_000000 = $65,000
    stx_price_usd: u64,  // e.g., 2_500000 = $2.5
    usdc_price_usd: u64, // Always 1_000000 = $1

    // Track total positions count
    total_positions: u64,
    
    // Collateral balances - store actual deposited tokens
    sbtc_balance_sui: Coin<MOCK_SBTC>,
    total_sbtc_collateral_sui: u64,
}

// Individual borrow position (stored as dynamic field)
public struct BorrowPosition has store {
    borrower: address,

    // Collateral tracking
    sbtc_collateral_sui: u64,      // sBTC deposited on Sui
    sbtc_collateral_stacks: u64,   // sBTC locked on Stacks (verified by relayer)
    stx_collateral_stacks: u64,    // STX locked on Stacks (verified by relayer)

    // Debt tracking
    usdc_borrowed: u64,
    debt_opened_at: u64, // timestamp in ms
    last_interest_update: u64,

    // Status
    is_liquidatable: bool,
}

// ========================================
//  EVENTS
// ========================================

public struct EventRegistryCreated has copy, drop {
    registry_id: ID,
    admin: address,
}

public struct EventCollateralDeposited has copy, drop {
    borrower: address,
    collateral_type: u8,
    amount: u64,
}

public struct EventCollateralWithdrawn has copy, drop {
    borrower: address,
    collateral_type: u8,
    amount: u64,
}

public struct EventBorrowed has copy, drop {
    borrower: address,
    usdc_amount: u64,
    total_debt: u64,
}

public struct EventRepaid has copy, drop {
    borrower: address,
    repaid_amount: u64,
    remaining_debt: u64,
}

public struct EventLiquidated has copy, drop {
    borrower: address,
    liquidator: address,
    debt_cleared: u64,
    collateral_seized: u64,
}

public struct EventPriceUpdated has copy, drop {
    asset: vector<u8>,
    new_price: u64,
}

// ========================================
//  INITIALIZATION
// ========================================

fun init(_witness: BORROW_CONTROLLER, ctx: &mut TxContext) {
    let registry = BorrowRegistry {
        id: object::new(ctx),
        admin: ctx.sender(),
        // Initial prices (mock values for testnet)
        sbtc_price_usd: 65000_000000, // $65,000
        stx_price_usd: 2_500000,      // $2.5
        usdc_price_usd: 1_000000,     // $1
        total_positions: 0,
        // Initialize empty collateral balances
        sbtc_balance_sui: coin::zero<MOCK_SBTC>(ctx),
        total_sbtc_collateral_sui: 0,
    };

    event::emit(EventRegistryCreated {
        registry_id: object::id(&registry),
        admin: ctx.sender(),
    });

    transfer::share_object(registry);
}

// ========================================
//  COLLATERAL MANAGEMENT
// ========================================

// Deposit sBTC collateral from Sui
#[allow(lint(public_entry))]
public entry fun deposit_sbtc_collateral_sui(
    registry: &mut BorrowRegistry,
    sbtc: Coin<MOCK_SBTC>,
    ctx: &mut TxContext
) {
    let amount = sbtc.value();
    assert!(amount > 0, E_INVALID_AMOUNT);

    let borrower = ctx.sender();

    // Get or create position using dynamic fields
    if (!dynamic_field::exists_(&registry.id, borrower)) {
        let position = BorrowPosition {
            borrower,
            sbtc_collateral_sui: 0,
            sbtc_collateral_stacks: 0,
            stx_collateral_stacks: 0,
            usdc_borrowed: 0,
            debt_opened_at: 0,
            last_interest_update: 0,
            is_liquidatable: false,
        };

        dynamic_field::add(&mut registry.id, borrower, position);
        registry.total_positions = registry.total_positions + 1;
    };

    // Update position
    let position = dynamic_field::borrow_mut<address, BorrowPosition>(&mut registry.id, borrower);
    position.sbtc_collateral_sui = position.sbtc_collateral_sui + amount;

    // Update registry total collateral
    registry.total_sbtc_collateral_sui = registry.total_sbtc_collateral_sui + amount;

    event::emit(EventCollateralDeposited {
        borrower,
        collateral_type: COLLATERAL_TYPE_SBTC_SUI,
        amount,
    });

    // CRITICAL FIX: Add the deposited sBTC to registry's balance instead of just transferring
    // This ensures the user's balance is actually reduced
    coin::join(&mut registry.sbtc_balance_sui, sbtc);
}

// Withdraw sBTC collateral from Sui (only if no outstanding debt)
#[allow(lint(public_entry))]
public entry fun withdraw_sbtc_collateral_sui(
    registry: &mut BorrowRegistry,
    amount: u64,
    ctx: &mut TxContext
) {
    assert!(amount > 0, E_INVALID_AMOUNT);

    let borrower = ctx.sender();
    assert!(dynamic_field::exists_(&registry.id, borrower), E_POSITION_NOT_FOUND);

    // Get position from registry
    let position = dynamic_field::borrow_mut<address, BorrowPosition>(&mut registry.id, borrower);

    // Check that user has no outstanding debt
    assert!(position.usdc_borrowed == 0, E_INSUFFICIENT_COLLATERAL);

    // Check that user has enough collateral
    assert!(position.sbtc_collateral_sui >= amount, E_INSUFFICIENT_COLLATERAL);
    
    // Check registry has enough sBTC balance
    assert!(coin::value(&registry.sbtc_balance_sui) >= amount, E_INSUFFICIENT_COLLATERAL);

    // Update position
    position.sbtc_collateral_sui = position.sbtc_collateral_sui - amount;
    
    // Update registry total collateral
    registry.total_sbtc_collateral_sui = registry.total_sbtc_collateral_sui - amount;

    // CRITICAL FIX: Extract actual sBTC from registry and transfer to user
    let withdrawn_sbtc = coin::split(&mut registry.sbtc_balance_sui, amount, ctx);
    transfer::public_transfer(withdrawn_sbtc, borrower);

    event::emit(EventCollateralDeposited {
        borrower,
        collateral_type: COLLATERAL_TYPE_SBTC_SUI,
        amount: amount, // Amount withdrawn
    });
}

// Register collateral from Stacks (called by relayer)
#[allow(lint(public_entry))]
public entry fun register_stacks_collateral(
    registry: &mut BorrowRegistry,
    borrower: address,
    collateral_type: u8, // COLLATERAL_TYPE_SBTC_STACKS or COLLATERAL_TYPE_STX_STACKS
    amount: u64,
    ctx: &mut TxContext
) {
    // In production, verify this is called by authorized relayer
    // For MVP, we'll add admin check
    assert!(ctx.sender() == registry.admin, E_NOT_AUTHORIZED);
    assert!(amount > 0, E_INVALID_AMOUNT);
    assert!(
        collateral_type == COLLATERAL_TYPE_SBTC_STACKS ||
        collateral_type == COLLATERAL_TYPE_STX_STACKS,
        E_INVALID_COLLATERAL_TYPE
    );

    // Get or create position using dynamic fields
    if (!dynamic_field::exists_(&registry.id, borrower)) {
        let position = BorrowPosition {
            borrower,
            sbtc_collateral_sui: 0,
            sbtc_collateral_stacks: 0,
            stx_collateral_stacks: 0,
            usdc_borrowed: 0,
            debt_opened_at: 0,
            last_interest_update: 0,
            is_liquidatable: false,
        };

        dynamic_field::add(&mut registry.id, borrower, position);
        registry.total_positions = registry.total_positions + 1;
    };

    // Update position based on collateral type
    let position = dynamic_field::borrow_mut<address, BorrowPosition>(&mut registry.id, borrower);

    if (collateral_type == COLLATERAL_TYPE_SBTC_STACKS) {
        position.sbtc_collateral_stacks = position.sbtc_collateral_stacks + amount;
    } else if (collateral_type == COLLATERAL_TYPE_STX_STACKS) {
        position.stx_collateral_stacks = position.stx_collateral_stacks + amount;
    };

    event::emit(EventCollateralDeposited {
        borrower,
        collateral_type,
        amount,
    });
}

// Withdraw STX collateral from Stacks (called by relayer)
#[allow(lint(public_entry))]
public entry fun withdraw_stx_collateral(
    registry: &mut BorrowRegistry,
    borrower: address,
    amount: u64,
    ctx: &mut TxContext
) {
    // In production, verify this is called by authorized relayer
    assert!(ctx.sender() == registry.admin, E_NOT_AUTHORIZED);
    assert!(amount > 0, E_INVALID_AMOUNT);

    // Check if position exists
    assert!(dynamic_field::exists_(&registry.id, borrower), E_POSITION_NOT_FOUND);
    
    let position: &mut BorrowPosition = dynamic_field::borrow_mut(&mut registry.id, borrower);
    
    // Check if user has enough STX collateral
    assert!(position.stx_collateral_stacks >= amount, E_INSUFFICIENT_COLLATERAL);
    
    // Calculate if withdrawal would leave position healthy
    let remaining_stx = position.stx_collateral_stacks - amount;
    let remaining_stx_value = (remaining_stx as u64) * registry.stx_price_usd / 1_000000;
    let remaining_sbtc_sui_value = (position.sbtc_collateral_sui as u64) * registry.sbtc_price_usd / 100_000000;
    let remaining_sbtc_stacks_value = (position.sbtc_collateral_stacks as u64) * registry.sbtc_price_usd / 100_000000;
    
    let total_remaining_collateral = remaining_stx_value + remaining_sbtc_sui_value + remaining_sbtc_stacks_value;
    let max_borrow_after_withdrawal = total_remaining_collateral * LTV_STX / 10000;
    let current_debt = position.usdc_borrowed;
    
    // Ensure position remains healthy after withdrawal
    assert!(current_debt <= max_borrow_after_withdrawal, E_INSUFFICIENT_COLLATERAL);
    
    // Update position
    position.stx_collateral_stacks = remaining_stx;
    
    event::emit(EventCollateralWithdrawn {
        borrower,
        collateral_type: COLLATERAL_TYPE_STX_STACKS,
        amount,
    });
}

// ========================================
//  BORROW LOGIC
// ========================================

// Borrow USDC against collateral
#[allow(lint(public_entry))]
public entry fun borrow_usdc(
    registry: &mut BorrowRegistry,
    usdc_pool: &mut UsdcLendingPool,
    amount: u64,
    ctx: &mut TxContext
) {
    assert!(amount > 0, E_INVALID_AMOUNT);

    let borrower = ctx.sender();
    assert!(dynamic_field::exists_(&registry.id, borrower), E_POSITION_NOT_FOUND);

    // Get prices first before borrowing position mutably
    let sbtc_price = registry.sbtc_price_usd;
    let stx_price = registry.stx_price_usd;

    // Get position from registry
    let position = dynamic_field::borrow_mut<address, BorrowPosition>(&mut registry.id, borrower);

    // Update interest before calculating borrow power
    update_debt_interest(position, ctx);

    // Calculate available borrow power
    let borrow_power = calculate_borrow_power_internal(position, sbtc_price, stx_price);
    let required_collateral_value = amount; // 1:1 for USDC value

    assert!(borrow_power >= required_collateral_value, E_INSUFFICIENT_COLLATERAL);

    // Update position
    if (position.usdc_borrowed == 0) {
        position.debt_opened_at = ctx.epoch_timestamp_ms();
    };
    position.usdc_borrowed = position.usdc_borrowed + amount;
    position.last_interest_update = ctx.epoch_timestamp_ms();

    // Borrow USDC from lending pool
    let borrowed_usdc = usdc_lending_pool::borrow_from_pool(
        usdc_pool,
        amount,
        borrower,
        ctx
    );

    // Transfer USDC to borrower
    transfer::public_transfer(borrowed_usdc, borrower);

    event::emit(EventBorrowed {
        borrower,
        usdc_amount: amount,
        total_debt: position.usdc_borrowed,
    });
}

// ========================================
//  REPAY LOGIC
// ========================================
#[allow(lint(public_entry))]
public entry fun repay_usdc(
    registry: &mut BorrowRegistry,
    usdc_pool: &mut UsdcLendingPool,
    repayment: Coin<MOCK_USDC>,
    ctx: &mut TxContext
) {
    let borrower = ctx.sender();
    assert!(dynamic_field::exists_(&registry.id, borrower), E_POSITION_NOT_FOUND);

    // Get position from registry
    let position = dynamic_field::borrow_mut<address, BorrowPosition>(&mut registry.id, borrower);

    // Update interest
    update_debt_interest(position, ctx);

    let repay_amount = repayment.value();

    assert!(repay_amount <= position.usdc_borrowed, E_INSUFFICIENT_REPAYMENT);

    // The repayment reduces debt directly (interest already included in debt)
    // Update position
    position.usdc_borrowed = position.usdc_borrowed - repay_amount;
    position.last_interest_update = ctx.epoch_timestamp_ms();

    // Return funds to lending pool
    // The entire repayment is principal from lending pool's perspective
    // Interest has already accrued to the borrower's debt
    usdc_lending_pool::distribute_yield(usdc_pool, repayment, repay_amount, ctx);

    event::emit(EventRepaid {
        borrower,
        repaid_amount: repay_amount,
        remaining_debt: position.usdc_borrowed,
    });
}

// ========================================
//  LIQUIDATION
// ========================================
#[allow(lint(public_entry))]
public entry fun liquidate(
    registry: &mut BorrowRegistry,
    borrower: address,
    liquidator_payment: Coin<MOCK_USDC>,
    ctx: &mut TxContext
) {
    assert!(dynamic_field::exists_(&registry.id, borrower), E_POSITION_NOT_FOUND);

    // Get prices first
    let sbtc_price = registry.sbtc_price_usd;
    let stx_price = registry.stx_price_usd;
    let admin_addr = registry.admin;

    // Get position from registry
    let position = dynamic_field::borrow_mut<address, BorrowPosition>(&mut registry.id, borrower);

    // Update interest
    update_debt_interest(position, ctx);

    // Check if position is liquidatable
    let health_factor = calculate_health_factor_internal(position, sbtc_price, stx_price);
    assert!(health_factor < 10000, E_POSITION_HEALTHY); // health < 100%

    // Calculate liquidation amounts
    let debt = position.usdc_borrowed;
    let penalty = (debt * LIQUIDATION_PENALTY_BPS) / 10000;
    let total_to_repay = debt + penalty;

    // Seize collateral
    // TODO: Implement collateral transfer to liquidator

    event::emit(EventLiquidated {
        borrower,
        liquidator: ctx.sender(),
        debt_cleared: debt,
        collateral_seized: total_to_repay,
    });

    // Transfer payment to protocol (for now, to admin)
    transfer::public_transfer(liquidator_payment, admin_addr);

    // Clear position
    position.usdc_borrowed = 0;
    position.is_liquidatable = false;
}

// ========================================
//  HELPERS
// ========================================

fun update_debt_interest(position: &mut BorrowPosition, ctx: &TxContext) {
    if (position.usdc_borrowed == 0) return;

    let time_passed = ctx.epoch_timestamp_ms() - position.last_interest_update;
    let ms_per_year: u64 = 31557600000;

    let interest = (position.usdc_borrowed * BORROW_APR_BPS * time_passed) / (10000 * ms_per_year);
    position.usdc_borrowed = position.usdc_borrowed + interest;
    position.last_interest_update = ctx.epoch_timestamp_ms();
}

fun calculate_borrow_power(registry: &BorrowRegistry, position: &BorrowPosition): u64 {
    calculate_borrow_power_internal(position, registry.sbtc_price_usd, registry.stx_price_usd)
}

fun calculate_borrow_power_internal(position: &BorrowPosition, sbtc_price: u64, stx_price: u64): u64 {
    // Calculate total collateral value in USD (6 decimals)
    let sbtc_sui_value = (position.sbtc_collateral_sui * sbtc_price) / 100000000; // sBTC has 8 decimals
    let sbtc_stacks_value = (position.sbtc_collateral_stacks * sbtc_price) / 100000000;
    let stx_value = (position.stx_collateral_stacks * stx_price) / 1000000; // STX has 6 decimals

    let total_sbtc_value = sbtc_sui_value + sbtc_stacks_value;

    // Apply LTV ratios
    let sbtc_borrow_power = (total_sbtc_value * LTV_SBTC) / 10000;
    let stx_borrow_power = (stx_value * LTV_STX) / 10000;

    let total_borrow_power = sbtc_borrow_power + stx_borrow_power;

    // Subtract existing debt
    if (total_borrow_power > position.usdc_borrowed) {
        total_borrow_power - position.usdc_borrowed
    } else {
        0
    }
}

fun calculate_health_factor(registry: &BorrowRegistry, position: &BorrowPosition): u64 {
    calculate_health_factor_internal(position, registry.sbtc_price_usd, registry.stx_price_usd)
}

fun calculate_health_factor_internal(position: &BorrowPosition, sbtc_price: u64, stx_price: u64): u64 {
    if (position.usdc_borrowed == 0) return 10000; // 100% healthy

    let borrow_power = calculate_borrow_power_internal(position, sbtc_price, stx_price);
    let max_borrow_with_liquidation = (borrow_power * 10000) / LIQUIDATION_THRESHOLD_BPS;

    // health_factor = (max_borrow / current_debt) * 10000
    if (position.usdc_borrowed == 0) return 10000;

    (max_borrow_with_liquidation * 10000) / position.usdc_borrowed
}

// ========================================
//  VIEW FUNCTIONS
// ========================================

// Check if user has a position
public fun has_position(registry: &BorrowRegistry, user: address): bool {
    dynamic_field::exists_(&registry.id, user)
}

// Get borrow power for a user
public fun get_borrow_power(registry: &BorrowRegistry, user: address): u64 {
    if (!dynamic_field::exists_(&registry.id, user)) return 0;

    let position = dynamic_field::borrow<address, BorrowPosition>(&registry.id, user);
    calculate_borrow_power(registry, position)
}

// Get health factor for a user
public fun get_health_factor(registry: &BorrowRegistry, user: address): u64 {
    if (!dynamic_field::exists_(&registry.id, user)) return 10000; // 100% healthy

    let position = dynamic_field::borrow<address, BorrowPosition>(&registry.id, user);
    calculate_health_factor(registry, position)
}

// Get total collateral value for a user
public fun get_total_collateral_value(registry: &BorrowRegistry, user: address): u64 {
    if (!dynamic_field::exists_(&registry.id, user)) return 0;

    let position = dynamic_field::borrow<address, BorrowPosition>(&registry.id, user);
    let sbtc_sui_value = (position.sbtc_collateral_sui * registry.sbtc_price_usd) / 100000000;
    let sbtc_stacks_value = (position.sbtc_collateral_stacks * registry.sbtc_price_usd) / 100000000;
    let stx_value = (position.stx_collateral_stacks * registry.stx_price_usd) / 1000000;

    sbtc_sui_value + sbtc_stacks_value + stx_value
}

// Get total debt for a user
public fun get_total_debt(registry: &BorrowRegistry, user: address): u64 {
    if (!dynamic_field::exists_(&registry.id, user)) return 0;

    let position = dynamic_field::borrow<address, BorrowPosition>(&registry.id, user);
    position.usdc_borrowed
}

// Get collateral details
public fun get_collateral_amounts(registry: &BorrowRegistry, user: address): (u64, u64, u64) {
    if (!dynamic_field::exists_(&registry.id, user)) return (0, 0, 0);

    let position = dynamic_field::borrow<address, BorrowPosition>(&registry.id, user);
    (position.sbtc_collateral_sui, position.sbtc_collateral_stacks, position.stx_collateral_stacks)
}

// Get total positions count
public fun get_total_positions(registry: &BorrowRegistry): u64 {
    registry.total_positions
}

// ========================================
//  ADMIN FUNCTIONS
// ========================================
#[allow(lint(public_entry))]
public entry fun update_price(
    registry: &mut BorrowRegistry,
    asset: vector<u8>, // b"SBTC", b"STX", b"USDC"
    new_price: u64,
    ctx: &TxContext
) {
    assert!(ctx.sender() == registry.admin, E_NOT_AUTHORIZED);

    if (asset == b"SBTC") {
        registry.sbtc_price_usd = new_price;
    } else if (asset == b"STX") {
        registry.stx_price_usd = new_price;
    } else if (asset == b"USDC") {
        registry.usdc_price_usd = new_price;
    };

    event::emit(EventPriceUpdated {
        asset,
        new_price,
    });
}
