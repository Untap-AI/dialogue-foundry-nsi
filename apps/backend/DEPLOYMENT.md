# Backend Deployment Guide

This document explains how to set up and use the backend deployment system with GitHub Package Registry.

## Initial Setup

Before you can use this deployment system, you need to configure your GitHub repository:

### 1. Enable GitHub Packages

1. Go to your GitHub repository settings
2. Navigate to "Packages" in the sidebar
3. Ensure GitHub Packages is enabled for your repository

### 2. Configure Repository Secrets

In your GitHub repository settings, under "Secrets and variables" > "Actions", add the following secrets if they don't already exist:

- `GITHUB_TOKEN` is automatically provided by GitHub
- Any additional secrets needed for your backend (database credentials, API keys, etc.)

### 3. Set Up GitHub Environments

1. Go to your GitHub repository settings
2. Navigate to "Environments" in the sidebar
3. Create a new environment called "production"
4. Under "Environment protection rules", enable "Required reviewers" and add team members who can approve production deployments
5. Optionally, configure "Deployment branches" to restrict which branches can deploy to production

## Deployment Environments

The backend service has two deployment environments:

1. **Smokebox (Test)** - Automatically updated with the latest changes from the main branch
2. **Production** - Manually updated and requires approval before deployment

## Deployment Process

### Automatic Test Deployment

Every time changes are pushed to the main branch that affect the backend code, the test (smokebox) environment is automatically updated with the latest changes.

### Manual Production Deployment

To deploy to production:

1. Go to the GitHub Actions tab in your repository
2. Select the "Backend Deployment" workflow
3. Click "Run workflow"
4. Select "production" from the environment dropdown
5. Click "Run workflow"
6. Wait for an authorized reviewer to approve the deployment
7. Once approved, the deployment will proceed

## Architecture

This deployment system:

1. Builds the backend package and publishes it to GitHub Package Registry
2. Creates separate deployment packages for test and production that reference the backend package
3. Deploys only the compiled distribution files, reducing the package size

## Version Management

- **Smokebox** always uses the latest version of the backend (`workspace:*`)
- **Production** uses a specific version that is updated during the deployment process

## Local Development

You can test the deployment process locally:

1. Build the main backend package:
   ```
   cd apps/backend
   pnpm build
   ```

2. Build and deploy the test package:
   ```
   cd apps/backend/backend-smokebox
   pnpm build
   ```

3. Or build and deploy the production package:
   ```
   cd apps/backend/backend-prod
   pnpm build
   ```

## Troubleshooting

### Common Issues

- **Package not published**: Check GitHub token permissions and ensure the package.json is correctly configured
- **Version conflict**: Make sure different environments are not trying to publish the same version
- **Build failures**: Verify that all dependencies are properly installed and the build process is working correctly 