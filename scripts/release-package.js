#!/usr/bin/env node

/**
 * Shared release script for all packages in the monorepo
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
const currentVersion = packageJson.version;

console.log(`Releasing ${releaseType} version of ${packageName} (current: v${currentVersion})...`);

try {
    // Run install
  console.log('Running npm install...');
  execSync('npm install', { stdio: 'inherit' });
  // Run tests
  console.log('Running tests...');
  execSync('npm test', { stdio: 'inherit' });

  // Bump version
  console.log(`Bumping ${releaseType} version...`);
  const versionOutput = execSync(`npm version ${releaseType} --no-git-tag-version`).toString().trim();
  const cleanVersion = versionOutput.split('\n').find(line => line.startsWith('v')).replace('v', '');

  // Build package
  console.log('Building package...');
  execSync('npm run build', { stdio: 'inherit' });

  // Commit version bump with consistent message format
  console.log('Committing version bump...');
  execSync(`git commit -am "chore: bump ${releaseType} version to v${cleanVersion}"`, { stdio: 'inherit' });

  // Check if we should skip publishing
  const skipPublish = process.env.SKIP_PUBLISH === 'true';
  if (skipPublish) {
    console.log('Skipping package publishing (SKIP_PUBLISH=true)');
  } else {
    // Publish package
    console.log('Publishing package...');
    execSync('npm publish --access public', { stdio: 'inherit' });
  }

  // Update dependencies in other packages
  console.log('Updating dependent packages...');
  execSync(`node ${path.join(__dirname, 'update-dependents.js')} ${packageName} ${cleanVersion}`, {
    stdio: 'inherit',
  });

  // Push changes to git
  console.log('Pushing changes to git...');
  execSync('git push', { stdio: 'inherit' });

  console.log(`Successfully released ${packageName}@${cleanVersion}`);
} catch (error) {
  console.error('Release failed:', error.message);
  process.exit(1);
}
