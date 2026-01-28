import { SuiClient } from '@mysten/sui.js/client';

const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const SUI_BORROW_REGISTRY_ID = '0x7d9a953e5a5292ace438c670130d3eb49d6ba060329ef8d754da2afebfbff7b3';

async function checkPosition() {
  const userAddress = '0x680a261a842df3743248432c932ce32c46c58a2f8d9f1ae0e917d55aed4e28c6';
  
  console.log('🔍 Checking STX collateral for:', userAddress);
  console.log('Registry ID:', SUI_BORROW_REGISTRY_ID);
  
  try {
    const dynamicFields = await suiClient.getDynamicFields({
      parentId: SUI_BORROW_REGISTRY_ID,
    });

    console.log('\nTotal positions in registry:', dynamicFields.data.length);

    for (const field of dynamicFields.data) {
      if (field.name && field.name.value === userAddress) {
        console.log('✅ Found user position!');
        
        const position = await suiClient.getObject({
          id: field.objectId,
          options: {
            showContent: true,
          },
        });

        console.log('\n📊 Position details:');
        console.log(JSON.stringify(position.data.content.fields, null, 2));
        return;
      }
    }
    
    console.log('❌ No position found for this address');
    console.log('\n📋 All positions in registry:');
    for (const field of dynamicFields.data) {
      console.log('- Address:', field.name.value);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPosition();