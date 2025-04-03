#!/usr/bin/env ts-node

/**
 * Script for publishing packages to S3 with intelligent version-based folder structure
 * 
 * Features:
 * - Creates new major.minor folders when major or minor version changes
 * - Only updates the latest folder for patch version changes
 * - Creates version.txt in each folder to track full version
 * - Skips deployment if the version hasn't changed
 * 
 * Usage:
 *   ts-node version-based-deploy.ts --package <packageJsonPath> --source <sourcePath> --bucket <bucketName> [options]
 */

import * as fs from 'fs';
import * as path from 'path';
import { S3 } from 'aws-sdk';
import * as semver from 'semver';
import { Command } from 'commander';
import chalk from 'chalk';
import { glob } from 'glob';

// Define the command line interface
const program = new Command();

interface DeployOptions {
  package: string;
  source: string;
  bucket: string;
  folder?: string;
  region?: string;
  basePath?: string;
  force?: boolean;
  dryRun?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  extraHeaders?: string;
}

program
  .description('Deploy a package to S3 with intelligent version-based folder structure')
  .requiredOption('--package <path>', 'Path to package.json file')
  .requiredOption('--source <path>', 'Path to the directory containing files to deploy')
  .requiredOption('--bucket <n>', 'AWS S3 bucket name')
  .option('--folder <n>', 'Specific folder name to deploy to (defaults to package name)')
  .option('--region <region>', 'AWS region (default: us-east-1 or AWS_REGION env variable)')
  .option('--base-path <path>', 'Base path in the S3 bucket')
  .option('--force', 'Force deployment even if the version already exists')
  .option('--dry-run', 'Dry run (do not actually deploy)')
  .parse(process.argv);

const options = program.opts<DeployOptions>();

// Main function
async function main() {
  try {
    // Read package.json to get package details
    if (!fs.existsSync(options.package)) {
      console.error(chalk.red(`Error: package.json not found at ${options.package}`));
      process.exit(1);
    }

    const packageData = JSON.parse(fs.readFileSync(options.package, 'utf8'));
    const packageName = options.folder || packageData.name.replace(/^@[^/]+\//, ''); // Remove scope if present
    const currentVersion = packageData.version;

    if (!semver.valid(currentVersion)) {
      console.error(chalk.red(`Error: Invalid version ${currentVersion} in package.json`));
      process.exit(1);
    }

    // Check if source directory exists
    if (!fs.existsSync(options.source)) {
      console.error(chalk.red(`Error: Source directory ${options.source} does not exist`));
      process.exit(1);
    }

    // Parse version components
    const major = semver.major(currentVersion);
    const minor = semver.minor(currentVersion);
    const patch = semver.patch(currentVersion);

    if(!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error(chalk.red('Error: AWS credentials not found in environment variables'));
      process.exit(1);
    }
    
    // AWS credentials configuration
    const awsConfig: S3.ClientConfiguration = {  
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
    
    // Initialize S3 client with configured credentials
    const s3 = new S3(awsConfig);

    console.log(chalk.blue(`\n🚀 Preparing to deploy ${packageName} v${currentVersion} to S3 bucket ${options.bucket}`));

    // Define paths
    const basePath = options.basePath || '';
    const majorMinorPath = `${major}.${minor}`;
    
    // Key paths in S3
    const versionPath = path.join(basePath, packageName, majorMinorPath).replace(/\\/g, '/');
    const versionTxtKey = path.join(versionPath, 'version.txt').replace(/\\/g, '/');
    const latestPath = path.join(basePath, packageName, 'latest').replace(/\\/g, '/');
    const latestVersionTxtKey = path.join(latestPath, 'version.txt').replace(/\\/g, '/');

    // Check if version file exists (to determine if this exact version was already deployed)
    let currentS3Version: string | null = null;
    try {
      const response = await s3.getObject({
        Bucket: options.bucket,
        Key: versionTxtKey
      }).promise();
      
      currentS3Version = response.Body?.toString('utf-8').trim() || null;
      
      if (currentS3Version === currentVersion && !options.force) {
        console.log(chalk.green(`✅ Version ${currentVersion} is already deployed. Skipping deployment.`));
        return;
      }
    } catch (error: any) {
      // If file doesn't exist, that's fine - we'll create it
      if (error.code !== 'NoSuchKey') {
        console.warn(chalk.yellow(`Warning checking version file: ${error.message}`));
      }
    }

    // Check if we need to create a new major.minor directory
    let shouldCreateNewMajorMinor = false;
    
    if (!currentS3Version) {
      // No version exists yet, so create the major.minor directory
      shouldCreateNewMajorMinor = true;
    } else if (options.force) {
      // Force flag is specified, go ahead and update
      shouldCreateNewMajorMinor = true;
    } else {
      // Check if the current version in S3 has a different major.minor
      const existingMajor = semver.major(currentS3Version);
      const existingMinor = semver.minor(currentS3Version);
      
      shouldCreateNewMajorMinor = existingMajor !== major || existingMinor !== minor;
    }

    // Check if we need to update the "latest" folder
    let shouldUpdateLatest = false;
    try {
      const response = await s3.getObject({
        Bucket: options.bucket,
        Key: latestVersionTxtKey
      }).promise();
      
      const latestVersion = response.Body?.toString('utf-8').trim() || '';
      
      // Update "latest" if current version is greater than existing latest version
      shouldUpdateLatest = latestVersion === '' || semver.gt(currentVersion, latestVersion) || options.force === true;
    } catch (error: any) {
      // If file doesn't exist, we should update the latest folder
      shouldUpdateLatest = true;
    }

    // Create a temporary version.txt file to upload
    const tempDir = path.join(options.source, '.tmp-version');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempVersionFile = path.join(tempDir, 'version.txt');
    fs.writeFileSync(tempVersionFile, currentVersion);

    // Dry run check
    if (options.dryRun) {
      console.log(chalk.cyan('\n🔍 DRY RUN - No changes will be made'));
      console.log(chalk.cyan(`Would deploy ${packageName} v${currentVersion} to:`));
      if (shouldCreateNewMajorMinor) {
        console.log(chalk.cyan(`- s3://${options.bucket}/${versionPath}/`));
      }
      if (shouldUpdateLatest) {
        console.log(chalk.cyan(`- s3://${options.bucket}/${latestPath}/`));
      }
      
      // Clean up
      try {
        fs.unlinkSync(tempVersionFile);
        fs.rmdirSync(tempDir);
      } catch (error) {
        // Ignore cleanup errors
      }
      
      return;
    }

    // Deploy files
    if (shouldCreateNewMajorMinor) {
      console.log(chalk.blue(`\n📤 Deploying to major.minor folder: s3://${options.bucket}/${versionPath}/`));
      await deployToS3(s3, options.bucket, options.source, versionPath);
      
      // Upload version.txt to the major.minor directory
      await s3.putObject({
        Bucket: options.bucket,
        Key: versionTxtKey,
        Body: currentVersion,
        ContentType: 'text/plain'
      }).promise();
      
      console.log(chalk.green(`✅ Deployed to ${versionPath}`));
    }

    if (shouldUpdateLatest) {
      console.log(chalk.blue(`\n📤 Updating latest folder: s3://${options.bucket}/${latestPath}/`));
      await deployToS3(s3, options.bucket, options.source, latestPath);
      
      // Upload version.txt to the latest directory
      await s3.putObject({
        Bucket: options.bucket,
        Key: latestVersionTxtKey,
        Body: currentVersion,
        ContentType: 'text/plain'
      }).promise();
      
      console.log(chalk.green(`✅ Updated latest to ${currentVersion}`));
    }

    // Clean up
    try {
      fs.unlinkSync(tempVersionFile);
      fs.rmdirSync(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }

    console.log(chalk.green(`\n🎉 Successfully deployed ${packageName} v${currentVersion} to S3 bucket ${options.bucket}`));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

// Helper function to deploy directory contents to S3
async function deployToS3(s3: S3, bucket: string, sourcePath: string, s3Path: string): Promise<void> {
  // Find all files to upload
  const files = await glob('**/*', { cwd: sourcePath, nodir: true });
  
  // Parse extra headers if provided
  let extraHeaders: Record<string, string> = {};
  if (options.extraHeaders) {
    try {
      extraHeaders = JSON.parse(options.extraHeaders);
      console.log(chalk.blue(`📋 Using extra headers: ${JSON.stringify(extraHeaders)}`));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Failed to parse extra headers: ${error}`));
    }
  }
  
  for (const file of files) {
    const filePath = path.join(sourcePath, file);
    const key = path.join(s3Path, file).replace(/\\/g, '/');
    
    // Skip temporary files
    if (filePath.includes('.tmp-version')) continue;
    
    // Create S3 params
    const params: S3.PutObjectRequest = {
      Bucket: bucket,
      Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: getContentType(filePath)
    };
    
    try {
      await s3.putObject(params).promise();
    } catch (error: any) {
      throw new Error(`Failed to upload ${file}: ${error.message}`);
    }
  }
}

// Get content type based on file extension
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  const contentTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.map': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Run the main function
main().catch(error => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
}); 