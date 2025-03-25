#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const srcDir = path.join(__dirname, '..', 'src')

// Find all .ts files recursively
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList)
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

// Process a file to add .js extensions to relative imports
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  // Regular expression to match relative imports without extensions
  const importRegex = /from\s+['"](\.[^'"]*)['"]/g

  // Replace all matching imports with .js extension
  content = content.replace(importRegex, (match, importPath) => {
    // Skip if already has extension
    if (
      importPath.endsWith('.js') ||
      importPath.endsWith('.mjs') ||
      importPath.endsWith('.cjs')
    ) {
      return match
    }

    // Add .js extension
    return `from '${importPath}.js'`
  })

  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`Updated imports in ${path.relative(process.cwd(), filePath)}`)
}

// Main script execution
try {
  const tsFiles = findTsFiles(srcDir)
  console.log(`Found ${tsFiles.length} TypeScript files to process.`)

  tsFiles.forEach(processFile)

  console.log('All imports updated successfully!')
} catch (error) {
  console.error('Error processing files:', error)
  process.exit(1)
}
