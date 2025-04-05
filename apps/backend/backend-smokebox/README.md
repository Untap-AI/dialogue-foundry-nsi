# Backend Smokebox Environment

This package represents the test/development environment deployment for the backend service. It always uses the latest workspace version of the backend API.

## Purpose

The Smokebox environment serves as a testing ground for new features and changes before they are deployed to production. It automatically reflects the current state of the backend codebase in the main branch.

## Deployment

The Smokebox environment is automatically deployed whenever changes are pushed to the main branch that affect the backend code.

### Manual Deployment

To manually deploy to the Smokebox environment:

1. Go to the GitHub Actions tab in the repository
2. Select the "Backend Deployment" workflow
3. Click "Run workflow"
4. Select "smokebox" from the environment dropdown
5. Click "Run workflow"

## Version Management

This package always uses the workspace version (`workspace:*`) of the `@dialogue-foundry/backend` package, which means it will always use the latest version available in your local workspace or the latest published version when deployed.

## Architecture

When deployed, this package contains only the compiled distribution files of the backend service, reducing the package size and improving deployment efficiency. 