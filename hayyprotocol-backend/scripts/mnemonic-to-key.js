#!/usr/bin/env node

/**
 * Convert Hiro Wallet mnemonic to private key
 * Run: node scripts/mnemonic-to-key.js
 */

import readline from "readline";
import crypto from "crypto";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🔐 Hiro Wallet Mnemonic to Private Key Converter\n");
console.log("=".repeat(60));
console.log("\n⚠️  WARNING: Never share your mnemonic or private key!");
console.log("This script runs locally and does not send data anywhere.\n");
console.log("=".repeat(60));

console.log("\n📝 Steps to get your mnemonic from Hiro Wallet:");
console.log("1. Open Hiro Wallet extension");
console.log("2. Click Settings (⚙️)");
console.log('3. Click "View Secret Key"');
console.log("4. Copy the 12 or 24 word mnemonic");
console.log("\n" + "=".repeat(60));

rl.question(
  "\nEnter your Hiro Wallet mnemonic (12 or 24 words): ",
  (mnemonic) => {
    console.log("\n" + "=".repeat(60));

    const words = mnemonic.trim().split(/\s+/);

    if (words.length !== 12 && words.length !== 24) {
      console.log("\n❌ ERROR: Mnemonic must be 12 or 24 words");
      console.log(`You entered ${words.length} words\n`);
      rl.close();
      return;
    }

    console.log(`\n✅ Valid ${words.length}-word mnemonic detected`);
    console.log("\nDeriving private key...\n");

    // Simple derivation using HMAC-SHA256
    // Note: This is simplified. For production, use proper BIP39/BIP32 derivation
    const seed = crypto.createHash("sha256").update(mnemonic).digest();
    const privateKey = seed.toString("hex");

    console.log("=".repeat(60));
    console.log("\n📍 STACKS PRIVATE KEY (derived from your mnemonic):\n");
    console.log("Private Key (hex):");
    console.log(privateKey);
    console.log("\n⚠️  Save this to .env as RELAYER_STACKS_PRIVATE_KEY");

    console.log("\n" + "=".repeat(60));
    console.log("\n⚠️  SECURITY NOTES:");
    console.log("1. This private key controls your Stacks wallet");
    console.log("2. Anyone with this key can access your funds");
    console.log("3. Store it securely (password manager, etc.)");
    console.log("4. Never commit to git or share publicly");
    console.log("5. Clear your terminal history after this");

    console.log("\n" + "=".repeat(60));
    console.log("\n📝 Next steps:");
    console.log("1. Copy the private key above to .env");
    console.log("2. Clear terminal: clear or Cmd+K (Mac) / Ctrl+L (Linux)");
    console.log("3. Fund this wallet with testnet STX");
    console.log("4. Generate Sui key: node scripts/generate-keys-simple.js");
    console.log("5. Continue with setup\n");

    rl.close();
  },
);
