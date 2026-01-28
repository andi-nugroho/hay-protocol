import { SuiClient } from '@mysten/sui.js/client';
import { config } from './src/config.js';

// Initialize Sui client
const suiClient = new SuiClient({ url: config.SUI_RPC_URL });

async function debugSuiCall() {
  try {
    console.log('🔍 Debug: Testing register_stacks_collateral call...');
    
    // Test with the exact parameters from relayer
    const tx = {
      target: `${config.SUI_PACKAGE_ID}::borrow_controller::register_stacks_collateral`,
      arguments: [
        config.SUI_BORROW_REGISTRY_ID, // registry
        '0x4debb63a2d35913b8bc544c074d877706c67cdb00c6d9b685f1702e3e978c600', // borrower (test with relayer address)
        3, // collateral_type: 3 = STX from Stacks (COLLATERAL_TYPE_STX_STACKS)
        1000000, // amount in microSTX (1 STX for testing)
      ],
    };

    console.log('\nTransaction details:');
    console.log(`Target: ${tx.target}`);
    console.log(`Registry: ${config.SUI_BORROW_REGISTRY_ID}`);
    console.log(`Borrower: ${tx.arguments[1]}`);
    console.log(`Collateral Type: ${tx.arguments[2]}`);
    console.log(`Amount: ${tx.arguments[3]}`);

    // Test the constants
    console.log('\nChecking constants:');
    console.log('COLLATERAL_TYPE_SBTC_SUI = 1');
    console.log('COLLATERAL_TYPE_SBTC_STACKS = 2');
    console.log('COLLATERAL_TYPE_STX_STACKS = 3');
    console.log(`Using collateral_type = ${tx.arguments[2]} (should be 3 for STX)`);

    // Try to validate inputs
    if (tx.arguments[2] !== 3) {
      console.log('❌ ERROR: Wrong collateral type!');
    } else {
      console.log('✅ Collateral type is correct');
    }

    if (tx.arguments[3] <= 0) {
      console.log('❌ ERROR: Invalid amount!');
    } else {
      console.log('✅ Amount is valid');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugSuiCall();