#!/usr/bin/env tsx

/**
 * Generate keypairs for HayyProtocol Relayer
 * Run: npx tsx scripts/generate-keys.ts
 */

import { generateSecretKey, getPublicKey } from '@stacks/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

console.log('🔑 Generating Keypairs for HayyProtocol Relayer\n');
console.log('=' .repeat(60));

// Generate Stacks Admin Keypair
console.log('\n📍 STACKS ADMIN KEYPAIR:\n');

const stacksPrivateKey = generateSecretKey();
const stacksPublicKey = getPublicKey(stacksPrivateKey);

console.log('Private Key (hex):');
console.log(stacksPrivateKey);
console.log('\nPublic Key (hex):');
console.log(stacksPublicKey.data.toString('hex'));
console.log('\n⚠️  Save this private key to .env as RELAYER_STACKS_PRIVATE_KEY');

// Generate Sui Relayer Keypair
console.log('\n' + '='.repeat(60));
console.log('\n🔷 SUI RELAYER KEYPAIR:\n');

const suiKeypair = new Ed25519Keypair();
const suiAddress = suiKeypair.getPublicKey().toSuiAddress();
const suiPrivateKey = suiKeypair.export().privateKey; // base64

console.log('Address:');
console.log(suiAddress);
console.log('\nPrivate Key (base64):');
console.log(suiPrivateKey);
console.log('\n⚠️  Save this private key to .env as RELAYER_SUI_PRIVATE_KEY');

console.log('\n' + '='.repeat(60));
console.log('\n✅ Keys generated successfully!');
console.log('\n📝 Next steps:');
console.log('1. Copy these keys to your .env file');
console.log('2. Fund Stacks address with testnet STX: https://explorer.hiro.so/sandbox/faucet?chain=testnet');
console.log(`3. Fund Sui address with testnet SUI: https://faucet.sui.io/ (address: ${suiAddress})`);
console.log('4. Run: clarinet console → (contract-call? .collateral-v2 init-admin)');
console.log('5. Start relayer: npm run dev\n');
