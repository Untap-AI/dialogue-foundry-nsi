# S3 Deployment Scripts

This directory contains scripts for deploying packages to S3 with version-based folder structures.

## version-based-deploy.ts

A TypeScript script that manages intelligent version-based deployments to AWS S3. This script can be invoked using `ts-node`.

### Features

- Creates new major.minor folders when major or minor version changes
- Only updates the latest folder for patch version changes
- Creates version.txt in each folder to track full version
- Skips deployment if the version hasn't changed
- Supports dry run mode to preview deployment actions
- Can be used directly from package scripts
- Supports AWS credentials via parameters or environment variables

### Prerequisites

- AWS credentials configured either via environment variables, AWS profile, or command-line parameters
- ts-node installed globally or as a project dependency
- Required npm packages: aws-sdk, semver, commander, chalk, glob

### Usage

```bash
ts-node version-based-deploy.ts --package <packageJsonPath> --source <sourcePath> --bucket <bucketName> [options]
```

### Required Parameters

- `--package <path>`: Path to the package.json file containing version information
- `--source <path>`: Path to the directory containing files to deploy
- `--bucket <n>`: AWS S3 bucket name

### Optional Parameters

- `--folder <n>`: Specific folder name to deploy to (defaults to package name from package.json)
- `--region <region>`: AWS region (default: us-east-1 or AWS_REGION env variable)
- `--base-path <path>`: Base path in the S3 bucket
- `--force`: Force deployment even if the version already exists
- `--dry-run`: Execute in dry run mode (no actual deployment)

### AWS Credentials Parameters

- `--access-key-id <key>`: AWS access key ID (can also use AWS_ACCESS_KEY_ID env variable)
- `--secret-access-key <secret>`: AWS secret access key (can also use AWS_SECRET_ACCESS_KEY env variable)
- `--session-token <token>`: AWS session token (can also use AWS_SESSION_TOKEN env variable)

### Using in GitHub Actions

To use this script in GitHub Actions, you can use the AWS credentials from GitHub secrets:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Option 1: Using environment variables
      - name: Deploy to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: 'us-east-1'
          DEPLOY_BUCKET: ${{ secrets.DEPLOY_BUCKET }}
        run: |
          ts-node packages/deploy-s3/scripts/version-based-deploy.ts \
            --package ./package.json \
            --source ./dist \
            --bucket $DEPLOY_BUCKET
      
      # Option 2: Using CLI parameters
      - name: Deploy to S3 (with CLI parameters)
        run: |
          ts-node packages/deploy-s3/scripts/version-based-deploy.ts \
            --package ./package.json \
            --source ./dist \
            --bucket ${{ secrets.DEPLOY_BUCKET }} \
            --access-key-id ${{ secrets.AWS_ACCESS_KEY_ID }} \
            --secret-access-key ${{ secrets.AWS_SECRET_ACCESS_KEY }} \
            --region us-east-1
```

### Example Usage in package.json

```json
{
  "scripts": {
    "publish-package": "ts-node ../../packages/deploy-s3/scripts/version-based-deploy.ts --package ./package.json --source ./dist --bucket my-deployment-bucket"
  }
}
```

### Example with CORS and Cache Headers

For web assets that need cross-origin access (like HTML/JS/CSS files):

```json
{
  "scripts": {
    "publish-package:web": "ts-node ../../packages/deploy-s3/scripts/version-based-deploy.ts --package ./package.json --source ./dist --bucket my-deployment-bucket --extra-headers '{\"Cache-Control\":\"public, max-age=31536000\", \"Access-Control-Allow-Origin\":\"*\", \"Access-Control-Allow-Methods\":\"GET, OPTIONS\", \"Access-Control-Allow-Headers\":\"Content-Type\"}'"
  }
}
```

For hosting HTML files with proper caching for different asset types:

```bash
# HTML files should have short caching, CSS/JS files can have longer caching
ts-node version-based-deploy.ts --package ./package.json --source ./dist --bucket my-bucket \
  --folder my-webapp --extra-headers '{
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*"
  }'
```

### Output Structure

The script creates the following S3 directory structure:

```
s3://bucket-name/
  └── package-name/
      ├── 1.0/             # Major.minor version folder
      │   ├── version.txt  # Contains full version (e.g., "1.0.5")
      │   └── [content]    # Deployed files
      │
      └── latest/          # "Latest" folder (updated for newer versions)
          ├── version.txt  # Contains full version
          └── [content]    # Deployed files
```

### Version Management Logic

1. If a new major or minor version is detected, a new folder is created
2. For patch versions, only the content is updated in the existing major.minor folder 
3. The "latest" folder is only updated if the version is newer than the current latest
4. The script checks version.txt in each folder to determine the currently deployed version 