#!/usr/bin/env node

/**
 * Script to publish the backend package to the GitHub Package Registry
 *
 * Usage:
 *   node deploy-to-github-registry.js
 *
 * Environment variables:
 *   GITHUB_TOKEN - GitHub personal access token with package:write scope
 */

/* eslint-env node */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const distDir = path.resolve(process.cwd(), 'dist')
const packageJsonPath = path.join(distDir, 'package.json')

// Ensure we're running from a directory with a dist folder
if (!fs.existsSync(distDir)) {
  console.error(
    'Error: dist directory not found. Run this script from a package root after building.'
  )
  process.exit(1)
}

// Ensure package.json exists in the dist folder
if (!fs.existsSync(packageJsonPath)) {
  console.error(
    'Error: package.json not found in dist directory. Make sure to copy it during build.'
  )
  process.exit(1)
}

// Read the package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const { name, version } = packageJson

if (!name || !version) {
  console.error('Error: package.json must contain name and version fields.')
  process.exit(1)
}

// Check for GitHub token
const token = process.env.GITHUB_TOKEN || process.env.NODE_AUTH_TOKEN
if (!token) {
  console.error(
    'Error: GITHUB_TOKEN or NODE_AUTH_TOKEN environment variable is required.'
  )
  process.exit(1)
}

// Create .npmrc file in the dist directory for GitHub authentication
const npmrcPath = path.join(distDir, '.npmrc')
const githubRegistry = 'https://npm.pkg.github.com'
const orgName = name.split('/')[0].replace('@', '')

fs.writeFileSync(
  npmrcPath,
  `${orgName}:registry=${githubRegistry}/\n` +
    `//npm.pkg.github.com/:_authToken=${token}\n` +
    `always-auth=true\n`
)

console.log(
  `Preparing to publish ${name}@${version} to GitHub Package Registry...`
)

try {
  // Navigate to the dist directory
  process.chdir(distDir)

  // Publish the package
  console.log('Publishing package...')
  execSync('npm publish', { stdio: 'inherit' })

  console.log(
    `Successfully published ${name}@${version} to GitHub Package Registry!`
  )
} catch (error) {
  console.error('Failed to publish package:', error.message)
  process.exit(1)
} finally {
  // Clean up the .npmrc file
  if (fs.existsSync(npmrcPath)) {
    fs.unlinkSync(npmrcPath)
  }
}
