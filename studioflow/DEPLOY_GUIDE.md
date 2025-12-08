# Deploying StudioFlow Backend to Google Cloud Run

This guide will help you deploy the backend server to Google Cloud Run.

## Prerequisites

1.  **Google Cloud CLI (`gcloud`)**: Must be installed and authenticated.
    -   [Install gcloud CLI](https://cloud.google.com/sdk/docs/install)
    -   Run `gcloud auth login`
    -   Run `gcloud config set project YOUR_PROJECT_ID`

2.  **Billing Enabled**: Your Google Cloud project must have billing enabled.

3.  **APIs Enabled**:
    -   Cloud Run API
    -   Cloud Build API
    -   Artifact Registry API

    Run this to enable them:
    ```bash
    gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
    ```

## Deployment Steps

We have created a helper script `deploy_to_cloud_run.ps1` in the `server` directory to make this easy.

1.  **Open Terminal** in the `server` directory:
    ```powershell
    cd studioflow/server
    ```

2.  **Verify .env file**:
    Ensure your `.env` file is present in `studioflow/server/.env` and contains production values.
    *   **CRITICAL**: `MONGO_URI` must allow access from minimal IP (0.0.0.0/0) or be a Cloud Atlas cluster.
    *   **CRITICAL**: `REDIS_URL` must be accessible (e.g., Redis Cloud or a VPC connector if using Memorystore). If Redis is local or behind a firewall, it won't work.
    *   **CRITICAL**: All file uploads now use S3/R2 storage. Ensure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_S3_BUCKET` (or Cloudflare R2 equivalents) are set.

3.  **Run the script**:
    ```powershell
    ./deploy_to_cloud_run.ps1
    ```

    This script will:
    -   Convert your `.env` variables to a temporary `env.yaml` file.
    -   Run `gcloud run deploy` to build and deploy your container.
    -   The service name will be `studioflow-backend`.

4.  **Deployment URL**:
    Once finished, it will output a URL (e.g., `https://studioflow-backend-xyz.a.run.app`).

## Troubleshooting

-   **Uploads**: Creating the uploads folder is handled, but files uploaded to `/api/upload` (legacy endpoint) will be ephemeral unless S3/valid storage is configured. We have updated the code to use your configured Storage Provider (S3/R2) for permanent storage.
-   **Database**: If the backend times out on start, check your MongoDB IP Whitelist (allow `0.0.0.0/0` for Cloud Run dynamic IPs).
-   **Redis**: If the app fails to connect to Redis, ensure you are using a cloud-hosted Redis (like Upstash or Redis Cloud) as Cloud Run cannot connect to your local machine's Redis.

## Manual Deployment (if script fails)

If you prefer to run the command manually:

```bash
gcloud run deploy studioflow-backend --source . --region us-central1 --allow-unauthenticated --env-vars-file env.yaml
```
(You need to create `env.yaml` from your `.env` first).
