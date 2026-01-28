// Check all positions in the borrow registry and find ones related to a Stacks address
import { SuiClient } from '@mysten/sui.js/client';

const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const SUI_BORROW_REGISTRY_ID = '0x7d9a953e5a5292ace438c670130d3eb49d6ba060329ef8d754da2afebfbff7b3';

async function findAllPositions() {
  console.log('🔍 Checking ALL positions in borrow registry...');
  
  try {
    const dynamicFields = await suiClient.getDynamicFields({
      parentId: SUI_BORROW_REGISTRY_ID,
    });

    console.log(`\nTotal positions in registry: ${dynamicFields.data.length}\n`);

    for (const field of dynamicFields.data) {
      const suiAddress = field.name.value;
      
      const position = await suiClient.getObject({
        id: field.objectId,
        options: {
          showContent: true,
        },
      });

      const fields = position.data.content.fields.value.fields;
      const stxCollateral = parseInt(fields.stx_collateral_stacks) / 1000000; // Convert to STX
      const usdcBorrowed = parseInt(fields.usdc_borrowed) / 1000000; // Convert to USDC

      console.log(`📊 Address: ${suiAddress}`);
      console.log(`   STX Collateral: ${stxCollateral} STX`);
      console.log(`   USDC Borrowed: ${usdcBorrowed} USDC`);
      console.log(`   Is Liquidatable: ${fields.is_liquidatable}`);
      console.log('   ---');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

findAllPositions();