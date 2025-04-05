# Backend Production Environment

This package represents the production environment deployment for the backend service. It uses a specific, manually-selected version of the backend API for stable production deployments.

## Purpose

The Production environment is the stable, customer-facing deployment of the backend service. It only receives updates through a controlled, manual deployment process to ensure maximum stability and reliability.

## Deployment

The Production environment is only updated through manual deployments, requiring approval from authorized team members.

### Manual Deployment

To deploy to the Production environment:

1. Go to the GitHub Actions tab in the repository
2. Select the "Backend Deployment" workflow
3. Click "Run workflow"
4. Select "production" from the environment dropdown
5. Click "Run workflow"
6. Wait for approval from an authorized reviewer
7. Once approved, the deployment will proceed

## Version Management

This package uses a specific version of the `@dialogue-foundry/backend` package that is manually updated during the deployment process. This ensures that only thoroughly tested versions of the backend service are deployed to production.

When a production deployment is initiated, the workflow automatically:

1. Fetches the latest published version of the backend package
2. Updates the production package.json to use this version
3. Builds and deploys the production package

## Architecture

When deployed, this package contains only the compiled distribution files of the backend service, reducing the package size and improving deployment efficiency. 