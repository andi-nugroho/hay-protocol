import { SuiClient } from '@mysten/sui.js/client';

const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const BORROW_REGISTRY_ID = '0x42aa67fc1c179459922ba6a8e55d55da4bdc1aa354eea165d7447943f7f15ac8';
const USER_ADDRESS = '0x6c67d6b8cc8d52c4a758dd9373eb8e04a9feb23292e6bea8c672ed29be6b2e75';

async function checkPosition() {
  console.log('🔍 Checking Borrow Registry...\n');

  // 1. Get registry object
  const registry = await suiClient.getObject({
    id: BORROW_REGISTRY_ID,
    options: {
      showContent: true,
      showType: true,
    },
  });

  console.log('📋 Registry Object:');
  console.log(JSON.stringify(registry, null, 2));

  // 2. Get dynamic fields (positions)
  console.log('\n📦 Checking Dynamic Fields (User Positions)...\n');
  const dynamicFields = await suiClient.getDynamicFields({
    parentId: BORROW_REGISTRY_ID,
  });

  console.log('Total positions:', dynamicFields.data.length);

  for (const field of dynamicFields.data) {
    console.log('\n---');
    console.log('Field Name:', field.name);
    console.log('Object ID:', field.objectId);

    if (field.name && field.name.value === USER_ADDRESS) {
      console.log('✅ Found user position!');

      // Get position details
      const position = await suiClient.getObject({
        id: field.objectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      console.log('\n🎯 User Position Details:');
      console.log(JSON.stringify(position, null, 2));

      if (position.data?.content && 'fields' in position.data.content) {
        const fields = position.data.content.fields;
        if (fields.value && fields.value.fields) {
          const pos = fields.value.fields;
          console.log('\n📊 Position Summary:');
          console.log('STX Collateral (Stacks):', parseInt(pos.stx_collateral_stacks || '0') / 1_000_000, 'STX');
          console.log('sBTC Collateral (Sui):', parseInt(pos.sbtc_collateral_sui || '0') / 100_000_000, 'sBTC');
          console.log('sBTC Collateral (Stacks):', parseInt(pos.sbtc_collateral_stacks || '0') / 100_000_000, 'sBTC');
          console.log('USDC Borrowed:', parseInt(pos.usdc_borrowed || '0') / 1_000_000, 'USDC');

          // Calculate borrow power
          const stxAmount = parseInt(pos.stx_collateral_stacks || '0') / 1_000_000;
          const stxValue = stxAmount * 0.5; // STX @ $0.5
          const maxBorrow = stxValue * 0.6; // 60% LTV

          console.log('\n💰 Calculated Values:');
          console.log('STX Value:', '$' + stxValue.toFixed(2));
          console.log('Max Borrow Power:', '$' + maxBorrow.toFixed(2), 'USDC');
        }
      }
    }
  }

  // 3. Check USDC lending pool
  console.log('\n\n💵 Checking USDC Lending Pool...\n');
  const USDC_POOL_ID = '0x4d8839f0dc2e8de2200312a90ac7d2d8fbb4a9e593a7f2896340405bb666a30d';

  const pool = await suiClient.getObject({
    id: USDC_POOL_ID,
    options: {
      showContent: true,
      showType: true,
    },
  });

  console.log('USDC Pool:');
  console.log(JSON.stringify(pool, null, 2));

  if (pool.data?.content && 'fields' in pool.data.content) {
    const fields = pool.data.content.fields;
    console.log('\n📊 Pool Summary:');
    console.log('Available Liquidity:', parseInt(fields.available_liquidity || '0') / 1_000_000, 'USDC');
    console.log('Total Borrowed:', parseInt(fields.total_borrowed || '0') / 1_000_000, 'USDC');
  }
}

checkPosition().catch(console.error);
