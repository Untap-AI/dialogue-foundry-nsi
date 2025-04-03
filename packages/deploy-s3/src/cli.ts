#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import { S3Deployer } from './index';

// Get package.json version
const packageJsonPath = path.resolve(__dirname, '../package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

interface DeployOptions {
  bucket: string;
  package: string;
  version: string;
  source: string;
  region?: string;
  basePath?: string;
  force?: boolean;
}

interface CheckOptions {
  bucket: string;
  package: string;
  version: string;
  region?: string;
  basePath?: string;
}

program
  .name('df-deploy-s3')
  .description('Deploy packages to AWS S3 with versioned folders')
  .version(version);

program
  .command('deploy')
  .description('Deploy a package to S3 with versioned folders')
  .requiredOption('-b, --bucket <name>', 'AWS S3 bucket name')
  .requiredOption('-p, --package <name>', 'Package name')
  .requiredOption('-v, --version <version>', 'Package version (semver)')
  .requiredOption('-s, --source <path>', 'Path to the directory containing files to deploy')
  .option('-r, --region <region>', 'AWS region (default: us-east-1)')
  .option('--base-path <path>', 'Base path in the S3 bucket')
  .option('-f, --force', 'Force deployment even if the version already exists')
  .action(async (options: DeployOptions) => {
    try {
      console.log(chalk.blue(`🚀 Deploying ${options.package} version ${options.version} to S3 bucket ${options.bucket}...`));
      
      const deployer = new S3Deployer({
        bucket: options.bucket,
        packageName: options.package,
        version: options.version,
        sourcePath: options.source,
        region: options.region,
        basePath: options.basePath,
        force: options.force,
      });
      
      const result = await deployer.deploy();
      
      if (result.success) {
        console.log(chalk.green(`✅ Successfully deployed ${options.package} version ${options.version}`));
        console.log(chalk.dim(`Uploaded ${result.uploaded.length} files`));
        
        // Display the paths
        const majorVersion = parseInt(options.version.split('.')[0], 10);
        const minorVersion = parseInt(options.version.split('.')[1], 10);
        
        const versionPath = `s3://${options.bucket}/${options.basePath || ''}${options.package}/${majorVersion}.${minorVersion}/${options.version}/`;
        const latestPath = `s3://${options.bucket}/${options.basePath || ''}${options.package}/latest/`;
        
        console.log(chalk.blue('📦 Deployed to:'));
        console.log(`  - Versioned: ${chalk.cyan(versionPath)}`);
        console.log(`  - Latest: ${chalk.cyan(latestPath)}`);
      } else {
        console.error(chalk.red('❌ Deployment failed'));
        process.exit(1);
      }
    } catch (error: unknown) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check if a package version exists in S3')
  .requiredOption('-b, --bucket <name>', 'AWS S3 bucket name')
  .requiredOption('-p, --package <name>', 'Package name')
  .requiredOption('-v, --version <version>', 'Package version (semver)')
  .option('-r, --region <region>', 'AWS region (default: us-east-1)')
  .option('--base-path <path>', 'Base path in the S3 bucket')
  .action(async (options: CheckOptions) => {
    try {
      console.log(chalk.blue(`🔍 Checking if ${options.package} version ${options.version} exists in S3 bucket ${options.bucket}...`));
      
      const deployer = new S3Deployer({
        bucket: options.bucket,
        packageName: options.package,
        version: options.version,
        sourcePath: '.', // Not used for checking
        region: options.region,
        basePath: options.basePath,
      });
      
      // Use internal versionExists method for checking
      const exists = await (deployer as any).versionExists();
      
      if (exists) {
        console.log(chalk.green(`✅ Version ${options.version} of ${options.package} exists in bucket ${options.bucket}`));
      } else {
        console.log(chalk.yellow(`⚠️ Version ${options.version} of ${options.package} does not exist in bucket ${options.bucket}`));
      }
    } catch (error: unknown) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 