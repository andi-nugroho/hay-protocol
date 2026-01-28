import { SuiClient } from '@mysten/sui.js/client';

// Initialize Sui client
const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

// Registry ID from config
const registryId = '0x7d9a953e5a5292ace438c670130d3eb49d6ba060329ef8d754da2afebfbff7b3';

// Relayer address from the output
const relayerAddress = '0x4debb63a2d35913b8bc544c074d877706c67cdb00c6d9b685f1702e3e978c600';

async function checkRegistry() {
  try {
    console.log('📋 Checking Sui Borrow Registry...');
    console.log(`Registry ID: ${registryId}`);
    console.log(`Relayer Address: ${relayerAddress}`);
    console.log('');

    // Get the registry object
    const registryObject = await suiClient.getObject({
      id: registryId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    console.log('Registry Object:');
    console.log(JSON.stringify(registryObject, null, 2));

    if (registryObject.data?.content?.fields) {
      const fields = registryObject.data.content.fields;
      console.log('\n🔍 Registry Fields:');
      console.log(`Admin: ${fields.admin}`);
      console.log(`Total Positions: ${fields.total_positions}`);
      console.log(`STX Price USD: ${fields.stx_price_usd}`);
      console.log(`sBTC Price USD: ${fields.sbtc_price_usd}`);
      console.log(`USDC Price USD: ${fields.usdc_price_usd}`);

      // Check if relayer is admin
      if (fields.admin === relayerAddress) {
        console.log('\n✅ Relayer is correctly set as admin!');
      } else {
        console.log('\n❌ ERROR: Relayer is NOT admin!');
        console.log(`Expected: ${relayerAddress}`);
        console.log(`Actual: ${fields.admin}`);
      }
    }

  } catch (error) {
    console.error('Error checking registry:', error);
  }
}

checkRegistry();