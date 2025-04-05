#!/bin/bash

# This script builds the backend-prod package for Render deployment

echo "Starting build for backend-prod..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Remove previous build if it exists
rm -rf dist
mkdir -p dist

# Copy backend dist files to our dist directory
echo "Copying backend dist files..."
cp -r ../dist/* dist/

# Prepare the package.json for the dist folder
cp package.json dist/

# The production environment uses a pinned version in package.json
# So it will deploy with that specific version

echo "Build completed for backend-prod." 