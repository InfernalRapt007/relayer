const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const SEPOLIA_CHAINS = [
    { name: 'Ethereum Sepolia', rpc: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo', chainId: 11155111, bridgeAddress: '0x575E9bA2012eA2f3fcA384ADAd69677946568e25' },
    { name: 'Arbitrum Sepolia', rpc: process.env.ARB_SEPOLIA_RPC_URL || 'https://arbitrum-sepolia.blockpi.network/v1/rpc/public', chainId: 421614, bridgeAddress: '0xe44BD1DD833C90c4995CBa3AFD7e1957b98804cF' },
    { name: 'Optimism Sepolia', rpc: process.env.OP_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io', chainId: 11155420, bridgeAddress: '0xe44BD1DD833C90c4995CBa3AFD7e1957b98804cF' },
    { name: 'Base Sepolia', rpc: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org', chainId: 84532, bridgeAddress: '0x6658e6C719678CF555eF04294BF2e2A412A25a93' },
];

const QIE_RPC = 'https://testnetqierpc1.digital';
const QIE_BRIDGE_ADDRESS = '0x72815898398d372589883499E76D185004C8EB95';
const MOCK_USDC_ADDRESS = '0x2d61343F52410F5C10f540A7BfBD29Af6d94e4Be';

// ABIs
const BRIDGE_ABI = [
    'event Deposit(address indexed sender, address indexed token, uint256 amount, uint256 destinationChainId)'
];

const QIE_BRIDGE_ABI = [
    'function processBridgeDeposit(bytes32 depositId, address recipient, uint256 amount, uint256 sourceChainId, address sourceToken, address targetToken) external'
];

// Track processed deposits and last checked blocks
const processedDeposits = new Set();
const processingDeposits = new Set(); // Track deposits currently being processed
const lastCheckedBlocks = new Map();

async function pollChainForEvents(chainConfig) {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const bridgeContract = new ethers.Contract(chainConfig.bridgeAddress, BRIDGE_ABI, provider);

    try {
        const currentBlock = await provider.getBlockNumber();
        const lastBlock = lastCheckedBlocks.get(chainConfig.chainId) || currentBlock - 10;

        const fromBlock = Math.max(lastBlock + 1, currentBlock - 100); // Start from lastBlock + 1

        if (fromBlock > currentBlock) {
            return; // No new blocks
        }

        // Query for Deposit events
        const filter = bridgeContract.filters.Deposit();
        const events = await bridgeContract.queryFilter(filter, fromBlock, currentBlock);

        // Process each event
        for (const event of events) {
            await processDepositEvent(event, chainConfig);
        }

        // Update last checked block
        lastCheckedBlocks.set(chainConfig.chainId, currentBlock);

    } catch (error) {
        // Silently ignore common polling errors
        if (!error.message.includes('could not coalesce')) {
            console.error(`❌ Error polling ${chainConfig.name}:`, error.message);
        }
    }
}

async function processDepositEvent(event, chainConfig) {
    try {
        const [sender, token, amount, destinationChainId] = event.args;

        // Create unique deposit ID
        const depositId = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ['uint256', 'address', 'uint256', 'bytes32'],
                [chainConfig.chainId, sender, amount, event.transactionHash]
            )
        );

        // Check if already processed or currently processing
        if (processedDeposits.has(depositId) || processingDeposits.has(depositId)) {
            return;
        }

        // Mark as processing
        processingDeposits.add(depositId);

        console.log(`\n📥 New Deposit Detected!`);
        console.log(`   Chain: ${chainConfig.name}`);
        console.log(`   From: ${sender}`);
        console.log(`   Amount: ${ethers.formatUnits(amount, 6)} USDC`);
        console.log(`   TX: ${event.transactionHash}`);
        console.log(`   Block: ${event.blockNumber}`);

        // Process on QIE chain
        await processBridgeOnQIE(depositId, sender, amount, chainConfig.chainId, token);

        // Mark as processed
        processedDeposits.add(depositId);
        processingDeposits.delete(depositId);

    } catch (error) {
        console.error(`❌ Error processing deposit:`, error.message);
        // Remove from processing set on error
        const depositId = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ['uint256', 'address', 'uint256', 'bytes32'],
                [chainConfig.chainId, event.args[0], event.args[2], event.transactionHash]
            )
        );
        processingDeposits.delete(depositId);
    }
}

async function processBridgeOnQIE(depositId, recipient, amount, sourceChainId, sourceToken) {
    try {
        const qieProvider = new ethers.JsonRpcProvider(QIE_RPC);
        const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, qieProvider);

        const qieBridge = new ethers.Contract(QIE_BRIDGE_ADDRESS, QIE_BRIDGE_ABI, wallet);

        console.log(`   🔄 Processing on QIE chain...`);

        const tx = await qieBridge.processBridgeDeposit(
            depositId,
            recipient,
            amount,
            sourceChainId,
            sourceToken,
            MOCK_USDC_ADDRESS
        );

        console.log(`   ⏳ Waiting for confirmation... TX: ${tx.hash}`);
        await tx.wait();

        console.log(`   ✅ Bridge completed! User received ${ethers.formatUnits(amount, 6)} MockUSDC on QIE`);

    } catch (error) {
        // Handle specific errors gracefully
        if (error.message.includes('tx already in mempool')) {
            console.log(`   ⚠️  Transaction already submitted, waiting for confirmation...`);
            return; // Don't throw, just return
        }
        if (error.message.includes('already processed')) {
            console.log(`   ℹ️  Deposit already processed on QIE`);
            return;
        }
        console.error(`   ❌ Failed to process on QIE:`, error.message);
        throw error;
    }
}

async function startPolling() {
    console.log('🔄 Starting polling loop (checking every 1 second)...\n');

    setInterval(async () => {
        for (const chain of SEPOLIA_CHAINS) {
            pollChainForEvents(chain).catch(() => { }); // Silently catch errors
        }
    }, 1000);

    // Initial poll
    for (const chain of SEPOLIA_CHAINS) {
        await pollChainForEvents(chain);
    }
}

async function main() {
    console.log('🌉 Bridge Relayer Starting...\n');

    if (!process.env.RELAYER_PRIVATE_KEY) {
        console.error('❌ RELAYER_PRIVATE_KEY not set in .env');
        process.exit(1);
    }

    console.log('📡 Monitoring chains:');
    for (const chain of SEPOLIA_CHAINS) {
        console.log(`   • ${chain.name}`);
    }

    console.log('\n✅ Relayer is running. Press Ctrl+C to stop.\n');

    await startPolling();
}

main().catch(console.error);
