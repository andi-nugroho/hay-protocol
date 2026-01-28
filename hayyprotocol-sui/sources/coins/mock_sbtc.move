module hayyprotocol::mock_sbtc;

use sui::{coin::{Self, Coin, TreasuryCap}, url};

public struct MOCK_SBTC has drop { }

#[allow(deprecated_usage)]
fun init(witness: MOCK_SBTC, ctx: &mut TxContext) {
    let url_icon = url::new_unsafe_from_bytes(b"https://asset-metadata-service-production.s3.amazonaws.com/asset_icons/7a322b610252ca8a28b950773b0fb8855ebc2611e6611d20525284bcdd9fde63.png");

    let (treasury_cap, metadata) = coin::create_currency<MOCK_SBTC>(
        witness,
        8, // BTC decimals
        b"sBTC",
        b"Stacks Bitcoin",
        b"Mock sBTC - represent Bitcoin on Stacks",
        option::some(url_icon),
        ctx
    );

    transfer::public_transfer(treasury_cap, ctx.sender());
    transfer::public_transfer(metadata, ctx.sender());
}

#[allow(lint(public_entry))]
public entry fun mint(
    treasury_cap: &mut TreasuryCap<MOCK_SBTC>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    coin::mint_and_transfer<MOCK_SBTC>(treasury_cap, amount, recipient, ctx);
}

#[allow(lint(public_entry))]
public entry fun burn(
    treasury_cap: &mut TreasuryCap<MOCK_SBTC>,
    coin: Coin<MOCK_SBTC>,
) {
    coin::burn<MOCK_SBTC>(treasury_cap, coin);
}
