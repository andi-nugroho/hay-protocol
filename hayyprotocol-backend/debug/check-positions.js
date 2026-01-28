import { SuiClient } from '@mysten/sui.js/client';
import { config } from './src/config.js';

// Initialize Sui client
const suiClient = new SuiClient({ url: config.SUI_RPC_URL });

async function checkPositions() {
  try {
    console.log('📊 Checking existing positions...');

    // Get the registry object
    const registryObject = await suiClient.getObject({
      id: config.SUI_BORROW_REGISTRY_ID,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (registryObject.data?.content?.fields) {
      const fields = registryObject.data.content.fields;
      console.log(`Total Positions: ${fields.total_positions}`);

      // Get all dynamic fields (positions)
      const dynamicFields = await suiClient.getDynamicFields({
        parentId: config.SUI_BORROW_REGISTRY_ID,
      });

      console.log('\n🔍 Existing Positions:');
      for (const field of dynamicFields.data) {
        console.log(`- ${field.name?.value} (type: ${field.name?.type})`);
        
        // Get position details
        try {
          const positionObject = await suiClient.getObject({
            id: field.objectId,
            options: {
              showContent: true,
              showType: true,
            },
          });

          if (positionObject.data?.content?.fields) {
            const position = positionObject.data.content.fields.value;
            console.log(`  Borrower: ${position.borrower}`);
            console.log(`  STX Collateral: ${position.stx_collateral_stacks}`);
            console.log(`  sBTC Collateral (Sui): ${position.sbtc_collateral_sui}`);
            console.log(`  sBTC Collateral (Stacks): ${position.sbtc_collateral_stacks}`);
            console.log(`  USDC Borrowed: ${position.usdc_borrowed}`);
            console.log('');
          }
        } catch (error) {
          console.log(`  Error getting position details: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPositions();