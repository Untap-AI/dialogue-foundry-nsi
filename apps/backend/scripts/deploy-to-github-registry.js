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
const { execSync, spawnSync } = require('child_process')

// Configuration
const distDir = path.resolve(process.cwd(), 'dist')
const packageJsonPath = path.join(distDir, 'package.json')

console.log(`Current working directory: ${process.cwd()}`)
console.log(`Looking for dist at: ${distDir}`)

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

// Log that we found a token (without showing it)
console.log(`Found authentication token: ${token ? '✓' : '✗'}`)

// Create .npmrc file in the dist directory for GitHub authentication
const npmrcPath = path.join(distDir, '.npmrc')
const githubRegistry = 'https://npm.pkg.github.com'
// Use the actual GitHub username for publishing instead of package organization
const githubUsername = 'peytonhobson'

console.log(`Package name: ${name}`)
console.log(`Original package org: ${name.split('/')[0].replace('@', '')}`)
console.log(`Using GitHub username: ${githubUsername}`)
console.log(`Using GitHub Registry: ${githubRegistry}`)

// Get the package name without the scope
const packageNameWithoutScope = name.split('/')[1]

// Create a temporary modified package.json for publishing
const tempPackageJson = { ...packageJson }
tempPackageJson.name = `@${githubUsername}/${packageNameWithoutScope}`
tempPackageJson.repository = {
  type: 'git',
  url: `git+https://github.com/${githubUsername}/dialogue-foundry.git`
}
tempPackageJson.publishConfig = {
  registry: githubRegistry
}

// Write the modified package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(tempPackageJson, undefined, 2))
console.log(`Modified package.json for GitHub Packages compatibility`)
console.log(`New package name: ${tempPackageJson.name}`)

fs.writeFileSync(
  npmrcPath,
  `registry=${githubRegistry}\n` +
    `@${githubUsername}:registry=${githubRegistry}\n` +
    `//npm.pkg.github.com/:_authToken=${token}\n` +
    `always-auth=true\n`
)

console.log(
  `Preparing to publish ${tempPackageJson.name}@${version} to GitHub Package Registry...`
)

// Function to check if the package version already exists
function checkIfPackageVersionExists(packageName, packageVersion) {
  console.log(`Checking if ${packageName}@${packageVersion} already exists...`)

  // Use npm view command which will fail if the package doesn't exist
  const result = spawnSync(
    'npm',
    [
      'view',
      `${packageName}@${packageVersion}`,
      'version',
      '--registry',
      githubRegistry
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_AUTH_TOKEN: token }
    }
  )

  // If the exit code is 0, the package exists
  const exists = result.status === 0
  console.log(
    `Package ${packageName}@${packageVersion} ${exists ? 'already exists' : 'does not exist yet'}`
  )
  return exists
}

function publishPackage() {
  try {
    // Navigate to the dist directory
    process.chdir(distDir)
    console.log(`Changed directory to: ${process.cwd()}`)

    // Show .npmrc file content for debugging (without showing the token)
    console.log('Created .npmrc file with content:')
    const npmrcContent = fs.readFileSync(npmrcPath, 'utf8')
    console.log(npmrcContent.replace(/(_authToken=)[^\\n]+/, '$1[REDACTED]'))

    // Check if package version already exists
    const packageExists = checkIfPackageVersionExists(
      tempPackageJson.name,
      version
    )

    if (packageExists) {
      console.log(
        `Skipping publication: ${tempPackageJson.name}@${version} already exists in the registry.`
      )
      return
    }

    // Publish the package
    console.log('Publishing package...')
    try {
      execSync('npm publish --registry=https://npm.pkg.github.com', {
        stdio: 'inherit'
      })
    } catch (publishError) {
      // If the error is about the version already existing, we can just skip
      if (
        publishError.message.includes('409 Conflict') ||
        publishError.message.includes('already exists')
      ) {
        console.log(
          `Package ${tempPackageJson.name}@${version} already exists. Skipping publication.`
        )
        return
      }

      console.error(
        'npm publish command failed with error:',
        publishError.message
      )
      console.error('This might be due to:')
      console.error('1. Authentication issues with GitHub')
      console.error('2. Package already exists with same version')
      console.error('3. Package name conflicts')
      console.error('4. Network issues')
      console.error('Try running with npm publish --verbose for more details')
      throw publishError
    }

    console.log(
      `Successfully published ${tempPackageJson.name}@${version} to GitHub Package Registry!`
    )
  } catch (error) {
    console.error('Failed to publish package:', error.message)
    process.exit(1)
  } finally {
    // Clean up the .npmrc file
    if (fs.existsSync(npmrcPath)) {
      fs.unlinkSync(npmrcPath)
      console.log('Cleaned up .npmrc file')
    }
  }
}

publishPackage()
