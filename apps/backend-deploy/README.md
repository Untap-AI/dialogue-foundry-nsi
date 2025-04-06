# Backend Deployment Package

This package provides a deployment solution for the backend service, supporting both smokebox (test) and production environments. It uses the GitHub Package Registry to install the backend package, which keeps the deployed codebase small and efficient.

## Purpose

This package simplifies the deployment process by:

1. Installing the backend package from GitHub Package Registry
2. Deploying directly to the Render service
3. Managing different backend versions for production

## How It Works

The deployment process:

1. Creates a minimal server wrapper around the backend package
2. Uses NPM_TOKEN to authenticate with GitHub Package Registry
3. Installs the appropriate version of the backend package
4. Starts the server with the correct environment settings

This approach keeps the deployed codebase small (staying within free/starter plan limits) while still providing full deployment functionality.

> **Important Note:** While the package is referenced as `@dialogue-foundry/backend` in the local workspace, it's published to GitHub Package Registry as `@peytonhobson/backend`. The build script handles this difference by configuring the correct package name for deployment.

## Usage

### Deploying to Environments

```bash
# Deploy to smokebox
npm run deploy:smokebox

# Deploy to production (latest version)
npm run deploy:production

# Deploy to production (specific version)
npm run deploy:production 1.2.3
```

## CI/CD Integration

The deployment process is handled by the `Backend Deployment` GitHub workflow, which implements:

- **Automatic deployments to smokebox** when:
  - Changes are pushed to the backend-deploy folder
  - A new backend package is published to GitHub Packages

- **Manual deployment to production** with approval required for production deployments
- Version management for production deployments

This approach ensures:
- Test environment (smokebox) is always up-to-date with the latest code
- Production environment is only updated through deliberate, manual actions

To manually deploy to production:

1. Go to the Actions tab
2. Select "Backend Deployment"
3. Click "Run workflow"
4. Select "production" from the environment dropdown
5. Optionally specify a version
6. Click "Run workflow"
7. Approve the deployment when prompted

### Environment Variables

This package requires the following environment variables for deployment:

```
RENDER_API_KEY=your_render_api_key
RENDER_SMOKEBOX_ID=your_smokebox_service_id
RENDER_PROD_ID=your_production_service_id
```

Additionally, Render requires:

```
NPM_TOKEN=your_github_package_registry_token
```

The NPM_TOKEN needs permissions to read packages from the GitHub Package Registry under the `@peytonhobson` organization.

## Render Configuration

The Render service is configured to:

1. Use the `apps/backend-deploy` directory as the root directory
2. Run the build script to create a minimal server 
3. Install the backend package from GitHub Packages using the name `@peytonhobson/backend`
4. Start the server

This approach ensures a small, efficient deployment that stays within the free/starter plan limits. 