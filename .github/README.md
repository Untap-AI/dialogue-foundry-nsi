# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating CI/CD tasks in the Dialogue Foundry project.

## Available Workflows

### Deploy Packages to S3 (`deploy-to-s3.yml`)

This workflow builds and deploys packages to AWS S3 with intelligent version-based folder management using Turborepo.

#### Triggers

- **Pull Request Merge to main**: Automatically triggered when a pull request is merged into the `main` branch that affects files in:
  - `apps/`
  - `packages/`
  - `.github/workflows/deploy-to-s3.yml`

- **Manual Workflow Dispatch**: Can be manually triggered from the GitHub Actions UI with these optional parameters:
  - `filter`: Target specific package(s) using Turborepo filter syntax (e.g., `--filter=@dialogue-foundry/frontend`)
  - `force`: Force deployment even if the version is already deployed (boolean, default: false)

#### Workflow Steps

1. **Checkout code**: Fetches the repository (with history for Turborepo change detection)
2. **Setup Node.js and pnpm**: Configures the JavaScript environment
3. **Install dependencies**: Installs project dependencies using pnpm
4. **Build packages**: Builds all packages or only the filtered ones
5. **Deploy packages**: Runs the `publish-package` script for all packages that define it
6. **Create deployment summary**: Generates a summary report of deployed packages
7. **Send notifications**: Sends a Slack notification with deployment results

#### Environment Secrets

This workflow requires the following GitHub secrets:

- `AWS_ACCESS_KEY_ID`: AWS access key with S3 permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_REGION`: AWS region (default: us-east-1)
- `DEPLOY_BUCKET`: S3 bucket name for deployments
- `SLACK_WEBHOOK_URL`: Slack incoming webhook URL for notifications

#### How it Works with Turborepo

The workflow uses Turborepo to:
- Detect which packages need to be built/deployed
- Build packages in the correct dependency order
- Only deploy packages that define a `publish-package` script

#### Example: Manually Deploying a Specific Package

To deploy only the frontend package and force a redeployment:

1. Go to the Actions tab in GitHub
2. Select the "Deploy Packages to S3" workflow
3. Click "Run workflow"
4. Set filter to `--filter=@dialogue-foundry/frontend`
5. Check the "Force deployment" checkbox
6. Click "Run workflow"

#### Notifications

The workflow sends Slack notifications with:
- Deployment status (success/failure)
- List of deployed packages and versions
- Repository and workflow information
- Who triggered the deployment
- Direct link to the workflow run

To enable Slack notifications:
1. Create an incoming webhook in your Slack workspace
2. Add the webhook URL as a GitHub repository secret named `SLACK_WEBHOOK_URL`

#### Troubleshooting

Common issues and solutions:

- **Missing AWS credentials**: Ensure all required secrets are configured in your repository settings
- **Failed build**: Check the build logs for specific errors; might need to run `pnpm clean` locally first
- **Skipped deployment**: If version already exists, use the `force` option to override
- **No deployment triggered**: Ensure your PR was actually merged to main and not just closed
- **Missing notifications**: Check that the `SLACK_WEBHOOK_URL` secret is properly configured

For more details on the S3 deployment script, see the [deploy-s3 package documentation](../packages/deploy-s3/scripts/README.md). 