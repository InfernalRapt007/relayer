# Bridge Relayer

## How Cross-Chain Communication Works

The bridge uses an **off-chain relayer** to communicate between chains:

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Sepolia Chain  │         │   Relayer    │         │   QIE Chain     │
│                 │         │   Service    │         │                 │
│  1. User calls  │────────▶│              │         │                 │
│     deposit()   │         │  2. Listens  │         │                 │
│                 │         │     for      │         │                 │
│  3. Emits       │────────▶│     Deposit  │         │                 │
│     Deposit     │         │     events   │         │                 │
│     event       │         │              │────────▶│  4. Calls       │
│                 │         │  5. Verifies │         │     process     │
│                 │         │     event    │         │     BridgeDeposit│
│                 │         │              │         │                 │
│                 │         │              │         │  6. Mints       │
│                 │         │              │◀────────│     MockUSDC    │
│                 │         │              │         │     to user     │
└─────────────────┘         └──────────────┘         └─────────────────┘
```

## Components

### 1. Source Chain Bridges (Sepolia networks)
- Lock user's USDC
- Emit `Deposit` event with:
  - User address
  - Amount
  - Destination chain ID
  - Transaction hash

### 2. Relayer Service (This folder)
- Listens to all Sepolia Bridge contracts
- Detects `Deposit` events
- Creates unique deposit ID (prevents replay attacks)
- Calls `processBridgeDeposit()` on QIE Bridge

### 3. QIE Bridge Contract
- Receives deposit proof from relayer
- Verifies deposit hasn't been processed
- Calls `mint()` on MockUSDC
- Marks deposit as processed

## Setup

1. **Install dependencies:**
   ```bash
   cd relayer
   npm install
   ```

2. **Configure environment:**
   Add to your `.env` file:
   ```
   RELAYER_PRIVATE_KEY=your_relayer_wallet_private_key
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   OP_SEPOLIA_RPC_URL=https://sepolia.optimism.io
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   ```

3. **Deploy updated contracts:**
   - Deploy new `QIEBridge.sol` to QIE Testnet
   - Deploy updated `MockUSDC.sol` to QIE Testnet
   - Call `MockUSDC.addMinter(QIEBridge_address)` to allow bridge to mint

4. **Fund relayer wallet:**
   - Get QIE testnet tokens for gas fees
   - The relayer pays gas to mint tokens on QIE

5. **Run the relayer:**
   ```bash
   npm start
   ```

## Security Considerations

### Current Implementation (Testnet)
- ✅ Single relayer (centralized but simple)
- ✅ Deposit ID prevents replay attacks
- ✅ Only relayer can call `processBridgeDeposit`
- ⚠️  Single point of failure

### Production Improvements
- Use multiple relayers with consensus (e.g., 2-of-3 multisig)
- Implement challenge period for withdrawals
- Add rate limiting and circuit breakers
- Use Chainlink CCIP or LayerZero for decentralized messaging
- Implement fraud proofs

## How to Test

1. Start the relayer: `npm start`
2. Bridge USDC from Sepolia using the UI
3. Watch the relayer logs:
   ```
   📥 New Deposit Detected!
      Chain: Ethereum Sepolia
      From: 0x1234...
      Amount: 10.0 USDC
      TX: 0xabcd...
      🔄 Processing on QIE chain...
      ✅ Bridge completed!
   ```
4. Check your QIE wallet for MockUSDC

## Monitoring

The relayer logs all activity:
- 🔍 Listening to chains
- 📥 New deposits detected
- 🔄 Processing transactions
- ✅ Successful bridges
- ❌ Errors

For production, integrate with monitoring tools like:
- Grafana/Prometheus for metrics
- Sentry for error tracking
- Discord/Telegram for alerts
