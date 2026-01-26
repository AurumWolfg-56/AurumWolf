# How to Connect AurumWolf to Hostinger

This guide explains how to set up automated deployments so that every time you push code to GitHub, it automatically updates your Hostinger website.

## Prerequisites

1.  **Hostinger Account**: You must have a active Hostinger hosting plan.
2.  **GitHub Repository**: You are already here!

## Step 1: Get FTP Details from Hostinger

1.  Log in to your **Hostinger Dashboard**.
2.  Go to **Hosting** -> **Manage** (for your domain).
3.  On the sidebar, look for **Files** -> **FTP Accounts**.
4.  Note down the following details:
    *   **FTP Host**: (e.g., `ftp.yourdomain.com`)
    *   **FTP Username**: (e.g., `u123456789` or `u123456789.yourname`). **IMPORTANT**: Must include the full string, including the numbers/prefix.
    *   **FTP Password**: (If you don't know it, create a new FTP account or reset the password for the main one).

## Step 2: Add Secrets to GitHub

To store your credentials safely, we use GitHub Secrets.

1.  Go to your GitHub Repository: `https://github.com/AurumWolfg-56/AurumWolf`
2.  Click on **Settings** (top tab).
3.  In the left sidebar, click **Secrets and variables** -> **Actions**.
4.  Click **New repository secret** (green button).
5.  Add the following 3 secrets (names must match exactly):

    *   **Name**: `FTP_SERVER`
        *   **Value**: `ftp.yourdomain.com` (Your FTP Host from Step 1)
    *   **Name**: `FTP_USERNAME`
        *   **Value**: `u123456789` (Your FTP Username)
    *   **Name**: `FTP_PASSWORD`
        *   **Value**: `YourStrongPassword` (The password)

## Step 3: Trigger a Deployment

Once the secrets are added:

1.  Go to the **Actions** tab in your GitHub repository.
2.  You should see a workflow called "Deploy to Hostinger".
3.  It will run automatically whenever you push to the `main` branch.
4.  To test it manually:
    *   Select "Deploy to Hostinger" on the left.
    *   Click **Run workflow** (blue button) on the right.

## Troubleshooting

-   **"Login Failed"**: Check your `FTP_USERNAME` and `FTP_PASSWORD` in GitHub Secrets.
-   **"Connection Timeout"**: Make sure `FTP_SERVER` is correct. Sometimes it's an IP address.
-   **"Directory not found"**: The configuration assumes your site lives in `public_html`. If it's a subdomain, you might need to change `server-dir` in `.github/workflows/deploy.yml`.
