#!/usr/bin/env node

/**
 * This script updates all dependent packages in the monorepo when a package is published.
 * It's designed to be run after a package is published, to ensure that all packages
 * that depend on it are updated to use the latest version.
 * 
 * Usage: node update-dependents.js <package-name> <new-version>
 * Example: node update-dependents.js @wix-pilot/core 3.1.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const [packageName, versionParam] = process.argv.slice(2);

if (!packageName || !versionParam) {
  console.error('Please provide package name and version parameter');
  console.error('Usage: node update-dependents.js <package-name> <package-name@new-version>');
  process.exit(1);
}

// Extract version from the package-name@version format
const newVersion = versionParam.includes('@') 
  ? versionParam.split('@').pop() 
  : versionParam;

// Remove 'v' prefix if present
const cleanVersion = newVersion.replace(/^v/, '');

// Find all package.json files in the monorepo
const findPackageJsonFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      findPackageJsonFiles(filePath, fileList);
    } else if (file === 'package.json') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
};

// Get the root directory of the monorepo
const rootDir = path.resolve(__dirname, '..');
const packageJsonFiles = findPackageJsonFiles(rootDir);
const updatedPackages = [];

// Update dependencies in each package.json
packageJsonFiles.forEach(filePath => {
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = false;
  
  // Skip the package being updated
  if (packageJson.name === packageName) {
    return;
  }
  
  // Check and update dependencies
  if (packageJson.dependencies && packageJson.dependencies[packageName]) {
    packageJson.dependencies[packageName] = `^${cleanVersion}`;
    updated = true;
  }
  
  // Check and update devDependencies
  if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
    packageJson.devDependencies[packageName] = `^${cleanVersion}`;
    updated = true;
  }
  
  // Check and update peerDependencies
  if (packageJson.peerDependencies && packageJson.peerDependencies[packageName]) {
    packageJson.peerDependencies[packageName] = `^${cleanVersion}`;
    updated = true;
  }
  
  if (updated) {
    // Write the updated package.json back to disk
    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
    updatedPackages.push(path.relative(rootDir, filePath));
  }
});

// If any packages were updated, create a commit
if (updatedPackages.length > 0) {
  console.log(`Updated ${updatedPackages.length} dependent packages to use ${packageName}@${cleanVersion}`);
  
  try {
    // Add all updated package.json files to git
    execSync('git add ' + updatedPackages.join(' '), { stdio: 'inherit' });
    
    // Create a commit with the package updates
    execSync(`git commit -m "chore: update dependents to use ${packageName} v${cleanVersion}"`, { stdio: 'inherit' });
    
    console.log('Created commit with dependent package updates');
  } catch (error) {
    console.error('Failed to create commit:', error.message);
    process.exit(1);
  }
} else {
  console.log(`No dependent packages found for ${packageName}`);
}