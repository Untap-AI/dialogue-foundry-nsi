# Dialogue Foundry

This is the monorepo for Dialogue Foundry, containing all of our applications and shared packages.

## Overview

This repository is structured as a monorepo using pnpm workspaces and Turborepo for task orchestration. It contains:

- Frontend and backend applications in the `apps/` directory
- Shared packages and utilities in the `packages/` directory
- Robust versioning with Changesets
- Deployment system for AWS S3

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Run the development server:

```bash
# Run everything
pnpm dev

# Run only frontend
pnpm dev:frontend

# Run only backend
pnpm dev:backend
```

3. Build the applications:

```bash
pnpm build
```

## Versioning and Deployment

This project uses a robust versioning system with Changesets and has a dedicated deployment mechanism for AWS S3. 

### Deployment to S3

To deploy the frontend to an S3 bucket:

```bash
# Set the environment variables for deployment
export DEPLOY_BUCKET=your-s3-bucket-name
export AWS_REGION=us-east-1

# Deploy the frontend
pnpm deploy-to-s3:frontend
```

This will build the frontend and deploy it to the specified S3 bucket with a versioned folder structure:

```
<bucket>
├── frontend
│   ├── <major>.<minor>
│   │   ├── <major>.<minor>.<patch>
│   │   │   ├── (frontend files)
│   │   │   └── ...
│   │   └── ...
│   ├── latest
│   │   ├── (frontend files)
│   │   └── ...
│   └── ...
└── ...
```

For detailed information on our versioning and deployment process, see [VERSIONING.md](VERSIONING.md).

## Package Management

This repository uses [pnpm](https://pnpm.io/) for package management. New dependencies should be added using:

```bash
pnpm add <package> --filter=<workspace>
```

For example, to add a dependency to the frontend:

```bash
pnpm add react-router-dom --filter=@dialogue-foundry/frontend
```

## Project Structure

```
.
├── apps/               # Application code
│   ├── frontend/       # Frontend application
│   └── backend/        # Backend application
├── packages/           # Shared packages
│   ├── eslint-config/  # Shared ESLint configuration
│   ├── tsconfig/       # Shared TypeScript configuration 
│   ├── tailwind-config/# Shared Tailwind configuration
│   └── deploy-s3/      # S3 deployment utility
├── scripts/            # Helper scripts
├── .changeset/         # Changeset files for versioning
└── turbo.json          # Turborepo configuration
```

## License

Proprietary - All rights reserved 