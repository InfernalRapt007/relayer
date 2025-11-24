# Deploying Bridge Relayer to Railway 🚂

Railway is the easiest way to deploy this relayer. It will automatically detect the Node.js app and keep it running 24/7.

## Prerequisites

1.  **GitHub Account**: Your code must be pushed to a GitHub repository.
2.  **Railway Account**: Sign up at [railway.app](https://railway.app/) (Free tier available).

## Step 1: Push Code to GitHub

If you haven't already, push your project to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
# Replace with your repo URL
git remote add origin https://github.com/YOUR_USERNAME/qiexchange.git
git push -u origin main
```

## Step 2: Create Railway Project

1.  Go to your [Railway Dashboard](https://railway.app/dashboard).
2.  Click **+ New Project**.
3.  Select **Deploy from GitHub repo**.
4.  Select your `qiexchange` repository.
5.  Click **Deploy Now**.

## Step 3: Configure Root Directory

*Important: Since the relayer is in a subfolder, we need to tell Railway where to look.*

1.  Click on your new service card in the Railway dashboard.
2.  Go to **Settings**.
3.  Scroll down to **Root Directory**.
4.  Enter: `relayer`
5.  Railway will automatically trigger a redeploy.

## Step 4: Add Environment Variables

1.  Go to the **Variables** tab in your service.
2.  Click **Raw Editor** (easier for bulk add).
3.  Paste the contents of your `relayer/.env` file:

```env
RELAYER_PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/demo
ARB_SEPOLIA_RPC_URL=https://arbitrum-sepolia.blockpi.network/v1/rpc/public
OP_SEPOLIA_RPC_URL=https://sepolia.optimism.io
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

4.  **Update the `RELAYER_PRIVATE_KEY`** with your actual private key!
5.  Click **Update Variables**.

## Step 5: Verify Deployment

1.  Go to the **Deployments** tab.
2.  Click on the latest deployment to view **Logs**.
3.  You should see:
    ```
    🌉 Bridge Relayer Starting...
    📡 Monitoring chains:
       • Ethereum Sepolia
       • Arbitrum Sepolia
       ...
    ✅ Relayer is running...
    ```

## That's it! 🎉

Your relayer is now running in the cloud. It will automatically restart if it crashes and redeploy if you push new code to GitHub.
