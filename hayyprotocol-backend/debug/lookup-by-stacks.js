// API endpoint untuk lookup Sui address berdasarkan Stacks address
import { SuiClient } from '@mysten/sui.js/client';

const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const SUI_BORROW_REGISTRY_ID = '0x7d9a953e5a5292ace438c670130d3eb49d6ba060329ef8d754da2afebfbff7b3';

// Mapping dari relayer state (ini bisa jadi API call ke relayer)
const ADDRESS_MAPPINGS = {
  "ST1WVZNYKMK1MS2V2B728ZWJ2C76TAN49C6HSY7JF": "0x4debb63a2d35913b8bc544c074d877706c67cdb00c6d9b685f1702e3e978c600",
  "STTRAP4N32293HKRHC6VWNQA9ANQF2AXQTB9YN8G": "0x680a261a842df3743248432c932ce32c46c58a2f8d9f1ae0e917d55aed4e28c6"
};

async function findCollateralByStacksAddress(stacksAddress) {
  console.log(`🔍 Looking for collateral for Stacks address: ${stacksAddress}`);
  
  // 1. Check if we have a mapping
  const suiAddress = ADDRESS_MAPPINGS[stacksAddress];
  if (!suiAddress) {
    console.log('❌ No Sui address mapped for this Stacks address');
    return null;
  }
  
  console.log(`📍 Mapped to Sui address: ${suiAddress}`);
  
  // 2. Check if position exists on Sui
  try {
    const dynamicFields = await suiClient.getDynamicFields({
      parentId: SUI_BORROW_REGISTRY_ID,
    });

    for (const field of dynamicFields.data) {
      if (field.name.value === suiAddress) {
        const position = await suiClient.getObject({
          id: field.objectId,
          options: {
            showContent: true,
          },
        });

        const fields = position.data.content.fields.value.fields;
        const stxCollateral = parseInt(fields.stx_collateral_stacks) / 1000000;
        const usdcBorrowed = parseInt(fields.usdc_borrowed) / 1000000;
        
        console.log('✅ Found collateral position!');
        console.log(`   STX Collateral: ${stxCollateral} STX`);
        console.log(`   USDC Borrowed: ${usdcBorrowed} USDC`);
        
        return {
          stacksAddress,
          suiAddress,
          stxCollateral,
          usdcBorrowed,
          isLiquidatable: fields.is_liquidatable
        };
      }
    }
    
    console.log('❌ No position found for this Sui address');
    return null;
  } catch (error) {
    console.error('Error checking position:', error);
    return null;
  }
}

// Test dengan address user
const userStacksAddress = 'STTRAP4N32293HKRHC6VWNQA9ANQF2AXQTB9YN8G';
findCollateralByStacksAddress(userStacksAddress);