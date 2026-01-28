import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can initialize admin",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let block = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'init-admin', [], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Can deposit STX collateral",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const amount = 1000000; // 1 STX (in microSTX)

        let block = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(amount)
            ], wallet1.address)
        ]);

        block.receipts[0].result.expectOk().expectUint(amount);

        // Verify event emitted
        block.receipts[0].events.expectSTXTransferEvent(
            amount,
            wallet1.address,
            `${deployer.address}.collateral-v1`
        );
    },
});

Clarinet.test({
    name: "Can get collateral balance",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const amount = 5000000; // 5 STX

        // Deposit first
        let block = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(amount)
            ], wallet1.address)
        ]);

        // Check balance
        let balance = chain.callReadOnlyFn(
            'collateral-v1',
            'get-collateral',
            [types.principal(wallet1.address)],
            wallet1.address
        );

        balance.result.expectUint(amount);
    },
});

Clarinet.test({
    name: "Can request withdrawal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const depositAmount = 10000000; // 10 STX
        const withdrawAmount = 5000000; // 5 STX

        // Deposit first
        let block1 = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(depositAmount)
            ], wallet1.address)
        ]);

        // Request withdrawal
        let block2 = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'request-withdraw', [
                types.uint(withdrawAmount)
            ], wallet1.address)
        ]);

        block2.receipts[0].result.expectOk().expectBool(true);

        // Print event should be emitted
        assertEquals(block2.receipts[0].events.length > 0, true);
    },
});

Clarinet.test({
    name: "Cannot withdraw more than deposited",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const depositAmount = 5000000; // 5 STX
        const withdrawAmount = 10000000; // 10 STX (more than deposited)

        // Deposit
        let block1 = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(depositAmount)
            ], wallet1.address)
        ]);

        // Try to request more than deposited
        let block2 = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'request-withdraw', [
                types.uint(withdrawAmount)
            ], wallet1.address)
        ]);

        block2.receipts[0].result.expectErr().expectUint(101); // err-insufficient-funds
    },
});

Clarinet.test({
    name: "Admin can unlock collateral",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const amount = 10000000; // 10 STX

        let block = chain.mineBlock([
            // Init admin
            Tx.contractCall('collateral-v1', 'init-admin', [], deployer.address),
            // User deposits
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(amount)
            ], wallet1.address),
            // Admin unlocks
            Tx.contractCall('collateral-v1', 'admin-unlock-collateral', [
                types.principal(wallet1.address),
                types.uint(amount)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk(); // init-admin
        block.receipts[1].result.expectOk(); // deposit
        block.receipts[2].result.expectOk().expectUint(0); // unlock (balance now 0)

        // Verify STX returned to user
        block.receipts[2].events.expectSTXTransferEvent(
            amount,
            `${deployer.address}.collateral-v1`,
            wallet1.address
        );
    },
});

Clarinet.test({
    name: "Non-admin cannot unlock collateral",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const amount = 10000000;

        let block = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'init-admin', [], deployer.address),
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(amount)
            ], wallet1.address),
            // wallet2 tries to unlock (not admin)
            Tx.contractCall('collateral-v1', 'admin-unlock-collateral', [
                types.principal(wallet1.address),
                types.uint(amount)
            ], wallet2.address)
        ]);

        block.receipts[2].result.expectErr().expectUint(105); // err-not-admin
    },
});

Clarinet.test({
    name: "Can get total collateral",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(5000000)
            ], wallet1.address),
            Tx.contractCall('collateral-v1', 'deposit-collateral', [
                types.uint(3000000)
            ], wallet2.address)
        ]);

        let total = chain.callReadOnlyFn(
            'collateral-v1',
            'get-total-collateral',
            [],
            wallet1.address
        );

        total.result.expectUint(8000000); // 5 + 3 STX
    },
});
