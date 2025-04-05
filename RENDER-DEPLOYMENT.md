# Backend Deployment to Render

This document outlines how to deploy the backend service to Render using our GitHub Package Registry approach.

## Overview

We use a lightweight deployment model where:

1. The backend package is published to GitHub Package Registry via our existing `publish-package` workflow
2. Render services install the package directly from GitHub Package Registry
3. Two environments are maintained:
   - **Smokebox (Test)**: Always uses the latest version from the registry
   - **Production**: Uses a specific, pinned version for stability

This approach keeps the memory footprint as small as possible on the Render servers.

## Initial Setup

### 1. Set up Render Blueprint

1. In your Render dashboard, create a new "Blueprint" using the `render.yaml` in the root of this repository
2. Connect your GitHub repository to Render
3. The Blueprint will create two services:
   - `dialogue-foundry-backend-smokebox` 
   - `dialogue-foundry-backend-prod`

### 2. Configure Environment Variables

For each service in Render, set the following:

1. `NPM_TOKEN`: A GitHub Personal Access Token with `packages:read` scope to access the GitHub Package Registry
2. Copy all other environment variables from your `.env` file that are needed by your backend service

For the production service, also set:
- `BACKEND_VERSION`: The specific version to deploy (e.g., "1.0.0")

### 3. Set up GitHub Secrets

In your GitHub repository settings, under "Secrets and variables > Actions", add:

1. `RENDER_API_KEY`: Your Render API key
2. `RENDER_SMOKEBOX_ID`: The Render service ID for the Smokebox environment
3. `RENDER_PROD_ID`: The Render service ID for the Production environment

## Deployment Process

### Automatic Deployment to Smokebox

The Smokebox (test) environment is automatically deployed when:

1. Changes are pushed to the main branch
2. The `Deploy Packages to S3` workflow completes successfully
3. This triggers the `Render Deployment` workflow, which deploys to Smokebox

### Manual Deployment to Production

To deploy to production:

1. Go to the GitHub Actions tab in your repository
2. Select the "Render Deployment" workflow
3. Click "Run workflow"
4. Select "production" from the environment dropdown
5. Specify the version to deploy (optional, if not specified it will fetch the latest version)
6. Click "Run workflow"
7. When prompted, review and approve the deployment

Each manual deployment will:
- Update the `BACKEND_VERSION` environment variable in Render
- Trigger a redeployment of the service

This allows for explicit control over when to deploy, even if redeploying the same version.

## How It Works

### Package Publication

The backend package is published to GitHub Package Registry using the existing `publish-package` workflow.

### Render Setup Scripts

When Render builds the services, it runs the setup scripts:

- `render-scripts/setup-smokebox.sh` for the test environment
- `render-scripts/setup-prod.sh` for the production environment

These scripts:
1. Create an `.npmrc` file with GitHub authentication
2. Create a minimal `package.json` that depends on our backend package
3. Create a simple `server.js` file that just requires and starts the backend
4. Install the dependencies from GitHub Package Registry

### Version Management

- **Smokebox** always uses `"latest"` in its package.json
- **Production** uses a specific version from the `BACKEND_VERSION` environment variable

### Benefits of This Approach

1. **Minimal Resource Usage**: Only the compiled backend package is deployed to Render, not the entire repository
2. **Fast Deployments**: No build process needed on Render, just install the pre-built package
3. **Environment Separation**: Test and production environments can run different versions
4. **Automatic Updates**: Test environment always gets the latest changes
5. **Controlled Production Releases**: Production updates require manual approval

## Troubleshooting

### Common Issues

- **Authentication Errors**: Make sure your NPM_TOKEN in Render has the correct GitHub permissions
- **Package Not Found**: Ensure the package was published successfully to GitHub Package Registry
- **Environment Variables**: Check that all necessary environment variables are set in Render
- **Deployment Not Triggered**: Verify the GitHub workflow ran correctly and check the Render API key

## Local Testing

You can test the Render setup scripts locally:

```bash
# Set required environment variables
export NPM_TOKEN=your_github_token
export BACKEND_VERSION=1.0.0  # For production only

# Run the setup script
./render-scripts/setup-smokebox.sh  # or setup-prod.sh

# Start the server
node server.js
``` 