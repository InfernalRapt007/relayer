# Deploying Bridge Relayer to AWS Fargate

This guide will help you deploy the relayer to AWS Fargate, which runs your container 24/7 without managing servers.

## Prerequisites

1.  **AWS CLI** installed and configured (`aws configure`)
2.  **Docker** installed and running
3.  **AWS Account** with permissions for ECR and ECS

## Step 1: Create ECR Repository

Create a place to store your Docker image:

```bash
aws ecr create-repository --repository-name bridge-relayer --region us-east-1
```

*Note the `repositoryUri` from the output (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com/bridge-relayer`).*

## Step 2: Build and Push Image

Login to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

Build and push (replace `YOUR_URI` with your repository URI):
```bash
cd relayer
docker build -t bridge-relayer .
docker tag bridge-relayer:latest YOUR_URI:latest
docker push YOUR_URI:latest
```

## Step 3: Create ECS Cluster

Create a Fargate cluster:
```bash
aws ecs create-cluster --cluster-name bridge-cluster
```

## Step 4: Create Task Definition

1.  Go to **AWS Console > ECS > Task Definitions**.
2.  Click **Create new Task Definition** (Choose **Fargate**).
3.  **Name**: `bridge-relayer-task`
4.  **Task Role**: `ecsTaskExecutionRole`
5.  **Memory**: 0.5 GB
6.  **CPU**: 0.25 vCPU
7.  **Container Definitions**:
    *   **Name**: `relayer-container`
    *   **Image**: `YOUR_URI:latest`
    *   **Environment Variables** (Add your secrets here!):
        *   `RELAYER_PRIVATE_KEY`: `your_private_key`
        *   `SEPOLIA_RPC_URL`: `https://...`
        *   `ARB_SEPOLIA_RPC_URL`: `https://...`
        *   `OP_SEPOLIA_RPC_URL`: `https://...`
        *   `BASE_SEPOLIA_RPC_URL`: `https://...`

## Step 5: Run the Service

1.  Go to **AWS Console > ECS > Clusters > bridge-cluster**.
2.  Click **Services > Create**.
3.  **Launch type**: FARGATE
4.  **Task Definition**: `bridge-relayer-task`
5.  **Service name**: `bridge-relayer-service`
6.  **Number of tasks**: 1
7.  **VPC/Subnets**: Select your default VPC and all subnets.
8.  **Security Group**: Default is fine (no inbound ports needed).
9.  Click **Create Service**.

## Verification

1.  Wait for the service status to be **Active** and the task to be **Running**.
2.  Click on the **Task ID** > **Logs** tab.
3.  You should see:
    ```
    🌉 Bridge Relayer Starting...
    ✅ Relayer is running...
    ```

## Cost Estimate
*   0.25 vCPU / 0.5 GB RAM Fargate Task: **~$8-10 / month** (running 24/7)
