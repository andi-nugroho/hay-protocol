module hayyprotocol::mock_usdc;

use sui::{coin::{Self, Coin, TreasuryCap}, url};

public struct MOCK_USDC has drop { }

#[allow(deprecated_usage)]
fun init(witness: MOCK_USDC, ctx: &mut TxContext) {
    let url_icon = url::new_unsafe_from_bytes(b"https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png");

    let (treasury_cap, metadata) = coin::create_currency<MOCK_USDC>(
        witness,
        6,
        b"USDC",
        b"USD Coin",
        b"Mock USDC - a stablecoin pegged to the US Dollar",
        option::some(url_icon),
        ctx
    );

    transfer::public_transfer(treasury_cap, ctx.sender());
    transfer::public_transfer(metadata, ctx.sender());
}

#[allow(lint(public_entry))]
public entry fun mint(
    treasury_cap: &mut TreasuryCap<MOCK_USDC>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    coin::mint_and_transfer<MOCK_USDC>(treasury_cap, amount, recipient, ctx);
}

#[allow(lint(public_entry))]
public entry fun burn(
    treasury_cap: &mut TreasuryCap<MOCK_USDC>,
    coin: Coin<MOCK_USDC>,
) {
    coin::burn<MOCK_USDC>(treasury_cap, coin);
}
