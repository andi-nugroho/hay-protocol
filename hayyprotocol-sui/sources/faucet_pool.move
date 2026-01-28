module hayyprotocol::faucet_pool;

use sui::{coin::{Self, TreasuryCap}, event, table::{Self, Table}};
use hayyprotocol::mock_usdc::MOCK_USDC;
use hayyprotocol::mock_sbtc::MOCK_SBTC;

// ========================================
//  ERROR CODES
// ========================================
const E_NOT_ADMIN: u64 = 201;
#[allow(unused_const)]
const E_FAUCET_EMPTY: u64 = 202;
#[allow(unused_const)]
const E_AMOUNT_TOO_LARGE: u64 = 203;
const E_DAILY_LIMIT_EXCEEDED: u64 = 204;
const E_COOLDOWN_ACTIVE: u64 = 205;

// ========================================
//  CONSTANTS
// ========================================
const MAX_SINGLE_USDC_MINT: u64 = 1_000_000_000; // 1,000 USDC
const MAX_SINGLE_SBTC_MINT: u64 = 1_000_000; // 0.01 sBTC (8 decimals)
const DAILY_USDC_LIMIT: u64 = 5_000_000_000; // 5,000 USDC per day
const DAILY_SBTC_LIMIT: u64 = 10_000_000; // 0.1 sBTC per day
const COOLDOWN_PERIOD_MS: u64 = 300000; // 5 minutes
const MS_PER_DAY: u64 = 86400000; // 24 hours in milliseconds

// ========================================
//  STRUCTS
// ========================================

public struct FAUCET_POOL has drop {}

/// Main faucet pool for testing tokens
public struct FaucetPool has key {
    id: UID,
    usdc_treasury: TreasuryCap<MOCK_USDC>,
    sbtc_treasury: TreasuryCap<MOCK_SBTC>,
    admin: address,
    is_active: bool,
    
    // Usage tracking
    usdc_daily_usage: Table<address, DailyUsage>,
    sbtc_daily_usage: Table<address, DailyUsage>,
    last_mint_time: Table<address, u64>,
}

public struct DailyUsage has store {
    amount: u64,
    last_reset_day: u64,
}

// ========================================
//  EVENTS
// ========================================

public struct EventFaucetCreated has copy, drop {
    pool_id: ID,
    admin: address,
}

public struct EventTokenMinted has copy, drop {
    user: address,
    token_type: vector<u8>,
    amount: u64,
    remaining_daily: u64,
}

public struct EventDailyLimitReset has copy, drop {
    user: address,
    token_type: vector<u8>,
    new_day: u64,
}

// ========================================
//  INITIALIZATION
// ========================================

fun init(_witness: FAUCET_POOL, _ctx: &mut TxContext) {
    // Empty init - admin creates pool manually
}

/// Create a new faucet pool
public fun create_faucet_pool(
    usdc_treasury: TreasuryCap<MOCK_USDC>,
    sbtc_treasury: TreasuryCap<MOCK_SBTC>,
    ctx: &mut TxContext
) {
    let pool = FaucetPool {
        id: object::new(ctx),
        usdc_treasury,
        sbtc_treasury,
        admin: ctx.sender(),
        is_active: true,
        usdc_daily_usage: table::new(ctx),
        sbtc_daily_usage: table::new(ctx),
        last_mint_time: table::new(ctx),
    };

    event::emit(EventFaucetCreated {
        pool_id: object::id(&pool),
        admin: pool.admin,
    });

    transfer::share_object(pool);
}

// ========================================
//  ADMIN FUNCTIONS
// ========================================

/// Admin can activate/deactivate faucet
public fun set_faucet_active(
    pool: &mut FaucetPool,
    active: bool,
    ctx: &TxContext
) {
    assert!(ctx.sender() == pool.admin, E_NOT_ADMIN);
    pool.is_active = active;
}

// ========================================
//  MINTING FUNCTIONS
// ========================================

/// Mint USDC tokens
#[allow(lint(self_transfer))]
public fun mint_usdc(
    pool: &mut FaucetPool,
    amount: u64,
    ctx: &mut TxContext
) {
    // assert!(pool.is_active, E_FAUCET_EMPTY);
    // assert!(amount <= MAX_SINGLE_USDC_MINT, E_AMOUNT_TOO_LARGE);
    
    let user = ctx.sender();
    let current_time = ctx.epoch_timestamp_ms();
    
    // Check cooldown
    // check_cooldown(&pool.last_mint_time, user, current_time);
    
    // Check daily limits
    // let remaining = check_and_update_daily_usage(
    //     &mut pool.usdc_daily_usage,
    //     user,
    //     amount,
    //     DAILY_USDC_LIMIT,
    //     current_time
    // );
    
    // Mint tokens
    let minted_coin = coin::mint(&mut pool.usdc_treasury, amount, ctx);
    
    // Update last mint time
    update_last_mint_time(&mut pool.last_mint_time, user, current_time);
    
    event::emit(EventTokenMinted {
        user,
        token_type: b"USDC",
        amount,
        // remaining_daily: remaining,
        remaining_daily: 0
    });
    
    transfer::public_transfer(minted_coin, user);
}

/// Mint sBTC tokens
#[allow(lint(self_transfer))]
public fun mint_sbtc(
    pool: &mut FaucetPool,
    amount: u64,
    ctx: &mut TxContext
) {
    // assert!(pool.is_active, E_FAUCET_EMPTY);
    // assert!(amount <= MAX_SINGLE_SBTC_MINT, E_AMOUNT_TOO_LARGE);
    
    let user = ctx.sender();
    let current_time = ctx.epoch_timestamp_ms();
    
    // Check cooldown
    // check_cooldown(&pool.last_mint_time, user, current_time);
    
    // Check daily limits
    // let remaining = check_and_update_daily_usage(
    //     &mut pool.sbtc_daily_usage,
    //     user,
    //     amount,
    //     DAILY_SBTC_LIMIT,
    //     current_time
    // );
    
    // Mint tokens
    let minted_coin = coin::mint(&mut pool.sbtc_treasury, amount, ctx);
    
    // Update last mint time
    update_last_mint_time(&mut pool.last_mint_time, user, current_time);
    
    event::emit(EventTokenMinted {
        user,
        token_type: b"sBTC",
        amount,
        // remaining_daily: remaining,
        remaining_daily: 0
    });
    
    transfer::public_transfer(minted_coin, user);
}

// ========================================
//  HELPER FUNCTIONS
// ========================================
#[allow(unused_function)]
fun check_cooldown(
    time_table: &Table<address, u64>,
    user: address,
    current_time: u64
) {
    if (time_table.contains(user)) {
        let last_mint = *time_table.borrow(user);
        assert!(current_time >= last_mint + COOLDOWN_PERIOD_MS, E_COOLDOWN_ACTIVE);
    }
}

#[allow(unused_function)]
fun check_and_update_daily_usage(
    usage_table: &mut Table<address, DailyUsage>,
    user: address,
    amount: u64,
    daily_limit: u64,
    current_time: u64
): u64 {
    let current_day = current_time / MS_PER_DAY;
    
    if (usage_table.contains(user)) {
        let usage = usage_table.borrow_mut(user);
        
        // Reset if new day
        if (usage.last_reset_day < current_day) {
            usage.amount = 0;
            usage.last_reset_day = current_day;
            
            event::emit(EventDailyLimitReset {
                user,
                token_type: b"RESET",
                new_day: current_day,
            });
        };
        
        // Check daily limit
        assert!(usage.amount + amount <= daily_limit, E_DAILY_LIMIT_EXCEEDED);
        
        // Update usage
        usage.amount = usage.amount + amount;
        daily_limit - usage.amount
    } else {
        // First time user
        assert!(amount <= daily_limit, E_DAILY_LIMIT_EXCEEDED);
        
        usage_table.add(user, DailyUsage {
            amount,
            last_reset_day: current_day,
        });
        
        daily_limit - amount
    }
}

fun update_last_mint_time(
    time_table: &mut Table<address, u64>,
    user: address,
    current_time: u64
) {
    if (time_table.contains(user)) {
        *time_table.borrow_mut(user) = current_time;
    } else {
        time_table.add(user, current_time);
    }
}

// ========================================
//  READ-ONLY FUNCTIONS
// ========================================

/// Get user's remaining daily limits
public fun get_user_daily_remaining(
    pool: &FaucetPool,
    user: address,
    current_time: u64
): (u64, u64) {
    let current_day = current_time / MS_PER_DAY;
    
    // Check USDC remaining
    let usdc_remaining = if (pool.usdc_daily_usage.contains(user)) {
        let usage = pool.usdc_daily_usage.borrow(user);
        if (usage.last_reset_day < current_day) {
            DAILY_USDC_LIMIT // New day, full limit available
        } else {
            DAILY_USDC_LIMIT - usage.amount
        }
    } else {
        DAILY_USDC_LIMIT // First time user
    };
    
    // Check sBTC remaining
    let sbtc_remaining = if (pool.sbtc_daily_usage.contains(user)) {
        let usage = pool.sbtc_daily_usage.borrow(user);
        if (usage.last_reset_day < current_day) {
            DAILY_SBTC_LIMIT // New day, full limit available
        } else {
            DAILY_SBTC_LIMIT - usage.amount
        }
    } else {
        DAILY_SBTC_LIMIT // First time user
    };
    
    (usdc_remaining, sbtc_remaining)
}

/// Get cooldown remaining time
public fun get_cooldown_remaining(
    pool: &FaucetPool,
    user: address,
    current_time: u64
): u64 {
    if (pool.last_mint_time.contains(user)) {
        let last_mint = *pool.last_mint_time.borrow(user);
        let next_allowed = last_mint + COOLDOWN_PERIOD_MS;
        if (current_time >= next_allowed) {
            0 // No cooldown
        } else {
            next_allowed - current_time
        }
    } else {
        0 // First time user
    }
}

/// Get pool statistics
public fun get_pool_stats(pool: &FaucetPool): (bool, u64, u64) {
    (
        pool.is_active,
        table::length(&pool.usdc_daily_usage),
        table::length(&pool.sbtc_daily_usage)
    )
}

/// Get max single mint amounts
public fun get_max_single_mint(): (u64, u64) {
    (MAX_SINGLE_USDC_MINT, MAX_SINGLE_SBTC_MINT)
}
