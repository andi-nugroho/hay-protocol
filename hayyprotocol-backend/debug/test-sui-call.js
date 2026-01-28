import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import { config } from './src/config.js';

// Initialize Sui client
const suiClient = new SuiClient({ url: config.SUI_RPC_URL });

// Initialize relayer keypair
const decoded = decodeSuiPrivateKey(config.RELAYER_SUI_PRIVATE_KEY);
const relayerKeypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
const relayerAddress = relayerKeypair.getPublicKey().toSuiAddress();

async function testRegisterStacksCollateral() {
  try {
    console.log('🧪 Testing register_stacks_collateral...');
    console.log(`Relayer Address: ${relayerAddress}`);
    console.log(`Package ID: ${config.SUI_PACKAGE_ID}`);
    console.log(`Registry ID: ${config.SUI_BORROW_REGISTRY_ID}`);
    
    const tx = new TransactionBlock();

    // Test with minimal amount
    tx.moveCall({
      target: `${config.SUI_PACKAGE_ID}::borrow_controller::register_stacks_collateral`,
      arguments: [
        tx.object(config.SUI_BORROW_REGISTRY_ID), // registry
        tx.pure(relayerAddress, 'address'), // borrower (use relayer as test borrower)
        tx.pure(3, 'u8'), // collateral_type: 3 = STX from Stacks
        tx.pure(1000000, 'u64'), // amount in microSTX (1 STX)
      ],
    });

    console.log('\n🔍 Dry run to see error details...');
    
    // Set the sender for the transaction
    tx.setSender(relayerAddress);
    
    const dryRunResult = await suiClient.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: suiClient }),
    });

    console.log('Dry run result:');
    console.log(JSON.stringify(dryRunResult, null, 2));

    if (dryRunResult.effects.status.status === 'failure') {
      console.log('\n❌ Error detected:');
      console.log(dryRunResult.effects.status.error);
    } else {
      console.log('\n✅ Dry run successful!');
      console.log('Now attempting real execution...');

      const result = await suiClient.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: relayerKeypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log('Transaction result:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testRegisterStacksCollateral();