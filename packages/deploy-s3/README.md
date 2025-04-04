# @dialogue-foundry/deploy-s3

A deployment utility to deploy packages to AWS S3 with proper versioning structure.

## Features

- Deploy packages to AWS S3 with a versioned folder structure
- Automatically organizes deployments by major and minor versions
- Maintains a "latest" folder for the most recent version
- CLI interface for easy integration with CI/CD pipelines
- TypeScript support

## Versioning Structure

The package creates the following structure in your S3 bucket:

```
<bucket>
├── <package-name>
│   ├── <major>.<minor>
│   │   ├── <major>.<minor>.<patch>
│   │   │   ├── (package files)
│   │   │   └── ...
│   │   └── ...
│   ├── latest
│   │   ├── (package files)
│   │   └── ...
│   └── ...
└── ...
```

## Installation

```bash
# Local installation in your project
npm install --save-dev @dialogue-foundry/deploy-s3

# Global installation
npm install -g @dialogue-foundry/deploy-s3
```

## Usage

### As a CLI

```bash
# Deploy a package
df-deploy-s3 deploy \
  --bucket your-s3-bucket \
  --package your-package-name \
  --version 1.0.0 \
  --source ./dist \
  --region us-east-1 \
  --base-path optional/base/path

# Check if a version exists
df-deploy-s3 check \
  --bucket your-s3-bucket \
  --package your-package-name \
  --version 1.0.0
```

### As a Node.js module

```typescript
import { S3Deployer } from '@dialogue-foundry/deploy-s3';

const deployer = new S3Deployer({
  bucket: 'your-s3-bucket',
  packageName: 'your-package-name',
  version: '1.0.0',
  sourcePath: './dist',
  region: 'us-east-1',
  basePath: 'optional/base/path',
});

async function deploy() {
  try {
    const result = await deployer.deploy();
    if (result.success) {
      console.log(`Successfully uploaded ${result.uploaded.length} files!`);
    }
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

deploy();
```

## Configuration with Changesets

This package works well with the Changesets workflow for versioning in a monorepo:

1. Make changes to your package(s)
2. Run `pnpm changeset` to create a changeset file
3. Commit the changeset file
4. When ready to release, run `pnpm version` to bump versions
5. Build your packages with `pnpm build`
6. Deploy with `df-deploy-s3 deploy`

## AWS Authentication

This package uses the AWS SDK, which will look for credentials in the following order:

1. Environment variables (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. If running on Amazon EC2, EC2 instance metadata service

Make sure you have properly configured AWS credentials with permissions to write to the target S3 bucket.

## License

MIT 