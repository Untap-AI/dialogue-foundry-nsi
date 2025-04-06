#!/usr/bin/env node

/**
 * Build script for preparing the backend deployment package
 * This version installs the backend package from GitHub Package Registry
 * 
 * Usage: node build.js [environment] [version]
 * environment: 'smokebox' or 'production', defaults to 'smokebox'
 * version: package version for production, defaults to 'latest'
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const environment = process.argv[2] || 'smokebox';
const version = process.argv[3] || 'latest';

console.log(`Starting build for backend ${environment} environment...`);

// Validate environment
if (environment !== 'smokebox' && environment !== 'production') {
  console.error('Error: Environment must be either "smokebox" or "production"');
  process.exit(1);
}

// Get directory paths
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Ensure we're in the right directory
process.chdir(rootDir);

// Clean up previous build
console.log('Cleaning up previous build...');
try {
  execSync('rm -rf dist');
  execSync('mkdir -p dist');
} catch (error) {
  console.error('Error during cleanup:', error);
  process.exit(1);
}

// Create .npmrc file for GitHub Packages access
console.log('Creating .npmrc file for GitHub Packages...');
const npmrcContent = `@peytonhobson:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=\${NPM_TOKEN}
always-auth=true`;

fs.writeFileSync(path.join(rootDir, '.npmrc'), npmrcContent);

// Create a package.json file for installing the backend
const backendVersion = environment === 'production' && version !== 'latest' ? version : 'latest';
console.log(`Using backend version: ${backendVersion}`);

const packageJson = {
  "name": `dialogue-foundry-backend-${environment}-server`,
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@peytonhobson/backend": backendVersion
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

// Write the package.json to the dist directory
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Copy .npmrc to dist directory
fs.copyFileSync(path.join(rootDir, '.npmrc'), path.join(distDir, '.npmrc'));

// Create a simple server file that imports and runs the backend
console.log('Creating server entrypoint...');
const serverFile = `// This file simply requires and starts the backend package
const { PORT = 8080 } = process.env;

// Copy all environment variables that might be needed
Object.entries(process.env).forEach(([key, value]) => {
  // The backend will have access to all environment variables
  if (key !== 'NPM_TOKEN' && key !== 'BACKEND_VERSION') { // Don't pass along sensitive tokens
    process.env[key] = value;
  }
});

// Handle termination signals for clean shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

// Require and start the backend
console.log('Starting @peytonhobson/backend (${environment} environment)...');
console.log('Backend version:', require('@peytonhobson/backend/package.json').version);

try {
  require('@peytonhobson/backend');
} catch (error) {
  console.error('Failed to start backend:', error);
  process.exit(1);
}`;

fs.writeFileSync(path.join(distDir, 'index.js'), serverFile);

// Copy installation files to the root directory for use during build
fs.copyFileSync(path.join(distDir, 'package.json'), path.join(rootDir, 'package.json'));

console.log(`Build setup completed for backend-${environment}.`);
console.log('During deployment, pnpm install will install the backend package from GitHub Packages.'); 