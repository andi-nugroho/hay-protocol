module hayyprotocol::sbtc_lending_pool;

use sui::{balance::Balance, coin::{Self, Coin}, display, event, package, table::{Self, Table}};
use hayyprotocol::mock_sbtc::MOCK_SBTC;

const E_INVALID_AMOUNT: u64 = 101;
const E_NOT_MATCHING_POOL: u64 = 102;
const E_NOT_OWNER: u64 = 103;
const E_INSUFFICIENT_POOL_BALANCE: u64 = 104;
const E_INSUFFICIENT_AVAILABLE_BALANCE: u64 = 105;

public struct SBTC_LENDING_POOL has drop { }

public struct SbtcLendingPool has key {
    id: UID,
    // The balance of sBTC in the pool
    sbtc_balance: Balance<MOCK_SBTC>,
    // Mapping from lender address to their deposit amount
    lender_deposits: Table<address, u64>,
    // Total amount lent out from the pool to borrowers
    total_lent: u64,
    // Accumulated yield from borrower repayments
    accumulated_yield: u64,
    // Interest rate in basis points (bps) for lenders
    apy_bps: u64,
    // Address of the owner/admin of the pool
    owner: address
}

// Receipt NFT when a user deposits into the lending pool
public struct LendingReceipt has key {
    id: UID,
    pool_id: ID,
    lender: address,
    amount: u64,
    deposited_at: u64, // timestamp in milliseconds
}

public struct EventLendingPoolCreated has copy, drop {
    pool_id: ID,
    apy_bps: u64,
    owner: address,
}

 public struct EventLendingPoolDeposited has copy, drop {
    pool_id: ID,
    lender: address,
    amount: u64,
    total_pool_balance: u64,
}

public struct EventLendingPoolWithdrawn has copy, drop {
    pool_id: ID,
    lender: address,
    amount: u64,
    interest_earned: u64,
}

public struct EventYieldDistributed has copy, drop {
    pool_id: ID,
    yield_amount: u64,
    total_pool_balance: u64,
}

public struct EventBorrowFromPool has copy, drop {
    pool_id: ID,
    borrower: address,
    amount: u64,
    total_lent: u64,
}

fun init(witness: SBTC_LENDING_POOL, ctx: &mut TxContext) {
    let keys = vector[
        b"pool_id".to_string(),
        b"image_url".to_string(),
        b"apy_bps".to_string(),
        b"lender".to_string(),
        b"amount".to_string(),
        b"deposited_at".to_string()
    ];

    let values = vector[
        b"{pool_id}".to_string(),
        b"https://example.com/sbtc.png".to_string(),
        b"{apy_bps}".to_string(),
        b"{lender}".to_string(),
        b"{amount}".to_string(),
        b"{deposited_at}".to_string()
    ];

    let package = package::claim(witness, ctx);
    let mut display = display::new_with_fields<LendingReceipt>(&package, keys, values, ctx);
    display.update_version();

    transfer::public_transfer(package, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}

#[allow(lint(public_entry))]
public entry fun create_sbtc_pool(
    sbtc: Coin<MOCK_SBTC>,
    apy_bps: u64,
    ctx: &mut TxContext
) {
    let owner = ctx.sender();

    let lending_pool = SbtcLendingPool {
        id: object::new(ctx),
        sbtc_balance: sbtc.into_balance(),
        lender_deposits: table::new(ctx),
        total_lent: 0,
        accumulated_yield: 0,
        apy_bps,
        owner
    };

    event::emit(EventLendingPoolCreated {
        pool_id: object::id(&lending_pool),
        apy_bps: lending_pool.apy_bps,
        owner
    });

    transfer::share_object(lending_pool);
}

// Create sBTC lending pool with zero initial balance
#[allow(lint(public_entry))]
public entry fun create_sbtc_pool_zero(
    apy_bps: u64,
    ctx: &mut TxContext
) {
    let owner = ctx.sender();

    let lending_pool = SbtcLendingPool {
        id: object::new(ctx),
        sbtc_balance: sui::balance::zero<MOCK_SBTC>(),
        lender_deposits: table::new(ctx),
        total_lent: 0,
        accumulated_yield: 0,
        apy_bps,
        owner
    };

    event::emit(EventLendingPoolCreated {
        pool_id: object::id(&lending_pool),
        apy_bps: lending_pool.apy_bps,
        owner
    });

    transfer::share_object(lending_pool);
}

#[allow(lint(public_entry))]
public entry fun deposit_sbtc(
    pool: &mut SbtcLendingPool,
    sbtc: Coin<MOCK_SBTC>,
    ctx: &mut TxContext
) {
    let sbtc_amount = sbtc.value();
    assert!(sbtc_amount > 0, E_INVALID_AMOUNT);

    let lender = ctx.sender();

    // Add sBTC to the pool's balance
    pool.sbtc_balance.join(sbtc.into_balance());

    // Track lender's deposit
    if (pool.lender_deposits.contains(lender)) {
        let current = pool.lender_deposits.borrow_mut(lender);
        *current = *current + sbtc_amount;
    } else {
        pool.lender_deposits.add(lender, sbtc_amount);
    };

    // Create a receipt NFT for the deposit
    let receipt = LendingReceipt {
        id: object::new(ctx),
        pool_id: object::id(pool),
        lender,
        amount: sbtc_amount,
        deposited_at: ctx.epoch_timestamp_ms()
    };
    
    event::emit(EventLendingPoolDeposited {
        pool_id: object::id(pool),
        lender,
        amount: sbtc_amount,
        total_pool_balance: pool.sbtc_balance.value(),
    });

    transfer::transfer(receipt, lender);
}

#[allow(lint(public_entry))]
public entry fun withdraw_sbtc(
    pool: &mut SbtcLendingPool,
    receipt: LendingReceipt,
    ctx: &mut TxContext
) {
    let LendingReceipt {
        id,
        pool_id,
        lender,
        amount,
        deposited_at
    } = receipt;

    // Verify receipt matches pool
    assert!(pool_id == object::id(pool), E_NOT_MATCHING_POOL);
    assert!(lender == ctx.sender(), E_NOT_OWNER);

    // Calculate interest based on time passed and accumulated yield
    let current_time = ctx.epoch_timestamp_ms();
    let time_passed_ms = current_time - deposited_at;
    let interest = calculate_interest(amount, pool.apy_bps, time_passed_ms, pool.accumulated_yield, pool.sbtc_balance.value());
    let total_withdrawal = amount + interest;

    // Check pool has enough (principal + interest)
    assert!(pool.sbtc_balance.value() >= total_withdrawal, E_INSUFFICIENT_POOL_BALANCE);

    // Update lender deposit tracking
    if (pool.lender_deposits.contains(lender)) {
        let current = pool.lender_deposits.borrow_mut(lender);
        *current = *current - amount;
    } else {
        // This should never happen due to earlier checks
        assert!(false, E_NOT_OWNER);
    };

    // Deduct interest from accumulated yield if available
    if (interest > 0 && pool.accumulated_yield >= interest) {
        pool.accumulated_yield = pool.accumulated_yield - interest;
    };

    // Remove sBTC from pool balance (principal + interest)
    let withdrawal_coin = coin::from_balance(pool.sbtc_balance.split(total_withdrawal), ctx);
    
    event::emit(EventLendingPoolWithdrawn {
        pool_id: object::id(pool),
        lender,
        amount,
        interest_earned: interest,
    });

    // Transfer sBTC back to lender
    transfer::public_transfer(withdrawal_coin, lender);
    // Destroy the receipt NFT
    object::delete(id);
}

// ========================================
//  POOL MANAGEMENT (called by borrow controller)
// ========================================

// Called by borrow controller when someone borrows against collateral
public fun borrow_from_pool(
    pool: &mut SbtcLendingPool,
    amount: u64,
    borrower: address,
    _ctx: &mut TxContext
): Coin<MOCK_SBTC> {
    // Check available balance (total - already lent)
    let available = pool.sbtc_balance.value() - pool.total_lent;
    assert!(available >= amount, E_INSUFFICIENT_AVAILABLE_BALANCE);

    // Update total lent
    pool.total_lent = pool.total_lent + amount;

    // Split and return the borrowed amount
    let borrowed_coin = coin::from_balance(pool.sbtc_balance.split(amount), _ctx);

    event::emit(EventBorrowFromPool {
        pool_id: object::id(pool),
        borrower,
        amount,
        total_lent: pool.total_lent,
    });

    borrowed_coin
}

// Called when borrower repays - adds yield to pool
#[allow(lint(public_entry))]
public entry fun distribute_yield(
    pool: &mut SbtcLendingPool,
    yield_payment: Coin<MOCK_SBTC>,
    repaid_principal: u64,
    _ctx: &mut TxContext
) {
    let yield_amount = yield_payment.value();

    // Add repaid principal + yield back to pool
    pool.sbtc_balance.join(yield_payment.into_balance());

    // Update tracking
    pool.total_lent = pool.total_lent - repaid_principal;
    pool.accumulated_yield = pool.accumulated_yield + yield_amount;

    event::emit(EventYieldDistributed {
        pool_id: object::id(pool),
        yield_amount,
        total_pool_balance: pool.sbtc_balance.value(),
    });
}

// ========================================
//  VIEW FUNCTIONS
// ========================================

// Get pool utilization rate in basis points (0-10000)
public fun get_utilization_rate(pool: &SbtcLendingPool): u64 {
    let total_balance = pool.sbtc_balance.value();
    if (total_balance == 0) return 0;

    // utilization = (total_lent / total_balance) * 10000
    (pool.total_lent * 10000) / total_balance
}

// Get available balance for borrowing
public fun get_available_balance(pool: &SbtcLendingPool): u64 {
    pool.sbtc_balance.value() - pool.total_lent
}

// Get total pool balance
public fun get_total_balance(pool: &SbtcLendingPool): u64 {
    pool.sbtc_balance.value()
}

// Get total lent amount
public fun get_total_lent(pool: &SbtcLendingPool): u64 {
    pool.total_lent
}

// Get accumulated yield
public fun get_accumulated_yield(pool: &SbtcLendingPool): u64 {
    pool.accumulated_yield
}

// Get pool APY
public fun get_apy_bps(pool: &SbtcLendingPool): u64 {
    pool.apy_bps
}

// Get lender's deposit amount
public fun get_lender_deposit(pool: &SbtcLendingPool, lender: address): u64 {
    if (pool.lender_deposits.contains(lender)) {
        *pool.lender_deposits.borrow(lender)
    } else {
        0
    }
}

// ========================================
//  HELPERS
// ========================================
fun calculate_interest(
    principal: u64,
    apy_bps: u64,
    time_passed_ms: u64,
    accumulated_yield: u64,
    total_pool_balance: u64
): u64 {
    if (time_passed_ms == 0 || apy_bps == 0) return 0;

    // Convert milliseconds to years (365.25 days * 24 hours * 60 min * 60 sec * 1000 ms)
    let ms_per_year: u64 = 31557600000; // 365.25 * 24 * 60 * 60 * 1000

    // Calculate theoretical interest: (principal * apy_bps * time) / (10000 * year_in_ms)
    // apy_bps = 500 means 5% APY
    let theoretical_interest = (principal * apy_bps * time_passed_ms) / (10000 * ms_per_year);

    // Cap interest by available yield in pool
    // Lenders can only earn from accumulated yield (from borrower repayments)
    if (accumulated_yield == 0) {
        return 0
    };

    // Calculate lender's share of yield proportional to their deposit
    let lender_share = if (total_pool_balance > 0) {
        (accumulated_yield * principal) / total_pool_balance
    } else {
        0
    };

    // Return the minimum of theoretical interest and available yield share
    if (theoretical_interest < lender_share) {
        theoretical_interest
    } else {
        lender_share
    }
}
