#!/bin/bash

# This script sets up the Smokebox environment on Render
# by installing the latest version of the backend package from GitHub Packages

echo "Setting up Smokebox environment..."

# Create .npmrc file with GitHub authentication
echo "Creating .npmrc for GitHub Packages authentication..."
cat > .npmrc << EOL
@dialogue-foundry:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
always-auth=true
EOL

# Create a minimal package.json for the server
echo "Creating package.json..."
cat > package.json << EOL
{
  "name": "dialogue-foundry-backend-smokebox-server",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@dialogue-foundry/backend": "latest"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOL

# Create a simple server file that just requires and starts the backend
echo "Creating server.js..."
cat > server.js << EOL
// This file simply requires and starts the backend package
const { PORT = 8080 } = process.env;

// Copy all environment variables that might be needed
Object.entries(process.env).forEach(([key, value]) => {
  // The backend will have access to all environment variables
  if (key !== 'NPM_TOKEN') { // Don't pass along sensitive tokens
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
console.log('Starting @dialogue-foundry/backend (latest version)...');
try {
  require('@dialogue-foundry/backend');
} catch (error) {
  console.error('Failed to start backend:', error);
  process.exit(1);
}
EOL

# Install dependencies
echo "Installing dependencies from GitHub Packages..."
npm install --production

echo "Smokebox environment setup complete!" 