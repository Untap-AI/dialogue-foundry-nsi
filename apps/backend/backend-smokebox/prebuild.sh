#!/bin/bash

# This script runs before Render builds the Docker image

echo "Starting prebuild script for backend-smokebox..."

# Navigate to the backend directory to build the base package
cd ../

# Install dependencies
echo "Installing dependencies..."
npm install -g pnpm
pnpm install

# Build the main backend package
echo "Building main backend package..."
pnpm build

# Go back to smokebox directory
cd backend-smokebox

# Ensure the dist directory exists
mkdir -p dist

# Copy all built files from the main backend's dist folder
echo "Copying built files to smokebox dist folder..."
cp -r ../dist/* dist/

# Copy the package.json to dist
cp package.json dist/

echo "Prebuild completed for backend-smokebox." 