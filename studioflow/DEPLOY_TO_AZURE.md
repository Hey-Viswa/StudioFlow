# Deploying to Azure App Service (Container)

## 1. Create Web App Resource (Fresh Start)
1.  In Azure Portal, search for **App Services**.
2.  Click **+ Create** -> **Web App**.
3.  **Basics Tab Configuration**:
    *   **Subscription**: Select "Azure for Students".
    *   **Resource Group**: Create `studioflow-rg`.
    *   **Name**: `studioflow-api-test` (must be unique).
    *   **Publish**: Select **Container** (Important!).
    *   **Operating System**: Select **Linux**.
    *   **Region**: Select a "US" region (Cheaper/More features).
    *   **Pricing Plan**: Select **Free F1** or **Basic B1**.
4.  **Container Tab (CRITICAL STEP)**:
    *   **Sidecar support**: **DISABLE / OFF**. (This enables the simple GitHub wizard).
    *   **Image Source**: Select **Quickstart**.
    *   **Sample**: Select **NGINX**.
5.  Click **Review + create** -> **Create**.
6.  Wait for deployment -> Click **Go to resource**.

## 2. Connect to GitHub (Deployment Center)
1.  In your Web App sidebar, click **Deployment** > **Deployment Center**.
2.  **Source**: Select **GitHub**.
3.  **Authorize** your GitHub account.
4.  **Organization**: Select yours.
5.  **Repository**: `Hey-Viswa/StudioFlow`.
6.  **Branch**: `production`.
7.  **Build Option**: Ensure **GitHub Actions** is selected.
8.  **Registry settings**: Leave as default.
9.  Click **Save**.

## 3. Verify & Fix Build Path
1.  Go to your **GitHub Repository** -> **Actions** tab.
2.  You will see a workflow running. **It will likely fail** because our Dockerfile is in `server/`.
3.  **Fixing it**:
    *   In GitHub, go to **Code** tab.
    *   Navigate to `.github/workflows` folder.
    *   Open the `.yml` file there -> Click **Edit** (Pencil).
    *   Find the step named **Build and push container image**.
    *   Look for `context: .` or similar. Change it to `context: ./server`.
    *   Look for `file: ./Dockerfile`. Change it to `file: ./server/Dockerfile`.
    *   Commit changes.
4.  This triggers a new build which should pass!

## 4. Environment Variables
1.  In Azure Portal, go to **Settings** > **Environment variables**.
2.  Add all variables from your `.env` file.
3.  Add `WEBSITES_PORT` = `3000`.
4.  Click **Apply**.
