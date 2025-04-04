# Versioning and Deployment Guide

This document explains how versioning and deployment work in the Dialogue Foundry monorepo.

## Versioning with Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for version management. Changesets makes it easy to:

- Create versioning proposals
- Generate changelogs
- Publish packages
- Handle interdependencies between packages

### Basic Workflow

1. **Make changes** to one or more packages in the monorepo
2. **Create a changeset** to document your changes:

   ```bash
   pnpm changeset
   ```

   This will:
   - Ask which packages you've changed
   - Ask what type of change it is (patch, minor, major)
   - Prompt for a summary of the changes
   - Create a Markdown file in the `.changeset` directory

3. **Commit** the changeset file along with your code changes:

   ```bash
   git add .
   git commit -m "feat: add new feature with changeset"
   git push
   ```

4. **Before Release**: When you're ready to release, bump the versions according to the changesets:

   ```bash
   pnpm version
   ```

   This will:
   - Update package versions based on the changesets
   - Update interdependent packages as needed
   - Generate/update changelog files
   - Remove the consumed changeset files

5. **Build and Publish** the updated packages:

   ```bash
   pnpm publish-package
   ```

## Deployment to AWS S3

For deploying packages to AWS S3 with proper versioning, we use the `@dialogue-foundry/deploy-s3` package.

### Deployment Structure

Packages are deployed to S3 with the following structure:

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

This structure allows:
- Access to specific versions via the full semver path
- Access to the latest version in each major.minor series
- Access to the overall latest version

### Deployment Commands

To deploy a package to S3:

```bash
# Basic usage
pnpm deploy-to-s3 --package @dialogue-foundry/my-package --bucket my-deployment-bucket

# With additional options
pnpm deploy-to-s3 \
  --package @dialogue-foundry/my-package \
  --bucket my-deployment-bucket \
  --region us-west-2 \
  --base-path optional/path \
  --force
```

### Automated Deployment

You can set up CI/CD pipelines (e.g., with GitHub Actions) to automatically deploy packages to S3 when:
- A new version is released
- A PR is merged to main
- A tag is created

Example GitHub Actions workflow setup in `.github/workflows/deploy.yml`:

```yaml
name: Deploy to S3

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 9.4.0
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build packages
        run: pnpm build
      
      - name: Deploy to S3
        run: pnpm deploy-to-s3 --package @dialogue-foundry/my-package --bucket ${{ secrets.S3_BUCKET }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
```

## Best Practices

1. **Always create changesets** for meaningful changes
2. **Use semantic versioning** correctly:
   - `patch` for backward compatible bug fixes
   - `minor` for backward compatible new features
   - `major` for breaking changes
3. **Write clear changeset messages** that explain what changed and why
4. **Deploy after version bumps**, not before
5. **Keep the main branch deployable** at all times

## Troubleshooting

### Common Issues

- **Changeset creation fails**: Make sure you have uncommitted changes and are running the command from the root of the monorepo
- **Version command errors**: Check for dependency cycle issues in your packages
- **Deployment fails**: Verify AWS credentials and bucket permissions 