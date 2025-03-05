#!/usr/bin/env node

/**
 * Shared release script for all packages
 *
 * Usage: node release-package.js [patch|minor|major]
 * Example: node release-package.js patch
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get release type from args
const releaseType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(releaseType)) {
  console.error('Please provide a valid release type: patch, minor, or major');
  process.exit(1);
}

// Get package info
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageName = packageJson.name;

console.log(`Releasing ${releaseType} version of ${packageName}...`);

try {
  // Run tests
  console.log('Running tests...');
  execSync('npm test', { stdio: 'inherit' });

  // Bump version
  console.log(`Bumping ${releaseType} version...`);
  const versionOutput = execSync(`npm version ${releaseType} --no-git-tag-version`).toString().trim();
  const newVersion = versionOutput.replace(/^v/, '');

  // Commit version bump
  console.log('Committing version bump...');
  execSync(`git commit -am "chore: bump ${releaseType} version of ${packageName} to v${newVersion}"`, { stdio: 'inherit' });

  // Build package
  console.log('Building package...');
  execSync('npm run build', { stdio: 'inherit' });

  // Publish package
  console.log('Publishing package...');
  execSync('npm publish --access public', { stdio: 'inherit' });

  // Update dependencies in other packages
  console.log('Updating dependent packages...');
  execSync(`node ${path.join(__dirname, 'update-dependents.js')} ${packageName} ${newVersion}`, {
    stdio: 'inherit',
  });

  // Push changes to git
  console.log('Pushing changes to git...');
  execSync('git push', { stdio: 'inherit' });

  console.log(`Successfully released ${packageName}@${newVersion}`);
} catch (error) {
  console.error('Release failed:', error.message);
  process.exit(1);
}
