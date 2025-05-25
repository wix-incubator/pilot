#!/usr/bin/env node

/**
 * Shared release script for all packages in the monorepo
 *
 * Usage: node release-package.js [patch|minor|major] [--prerelease]
 * Example: node release-package.js patch
 * Example: node release-package.js minor --prerelease
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt for OTP
const promptOTP = () => {
  return new Promise((resolve) => {
    readline.question('Enter your NPM OTP: ', (otp) => {
      readline.close();
      if (!otp) {
        console.error('OTP is required for publishing.');
        process.exit(1);
      }
      resolve(otp);
    });
  });
};

// Parse arguments
const args = process.argv.slice(2);
let releaseType = args[0];
const isPrerelease = args.includes('--prerelease');
const preid = 'alpha';

const validTypes = ['patch', 'minor', 'major'];
if (!validTypes.includes(releaseType)) {
  console.error('Please provide a valid release type: patch, minor, or major');
  process.exit(1);
}

// Map to pre* if prerelease
let npmReleaseType = releaseType;
if (isPrerelease) {
  if (releaseType === 'patch') npmReleaseType = 'prepatch';
  if (releaseType === 'minor') npmReleaseType = 'preminor';
  if (releaseType === 'major') npmReleaseType = 'premajor';
}

// Get package info
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageName = packageJson.name;
const currentVersion = packageJson.version;

console.log(`Releasing ${isPrerelease ? npmReleaseType + ' (prerelease)' : releaseType} version of ${packageName} (current: v${currentVersion})...`);

(async () => {
  try {
    // Run install
    console.log('Running npm install...');
    execSync('npm install', { stdio: 'inherit' });
    // Run tests
    console.log('Running tests...');
    execSync('npm test', { stdio: 'inherit' });

    // Bump version
    console.log(`Bumping ${isPrerelease ? npmReleaseType + ' (prerelease)' : releaseType} version...`);
    let versionOutput;
    if (isPrerelease) {
      versionOutput = execSync(`npm version ${npmReleaseType} --preid=${preid} --no-git-tag-version`).toString().trim();
    } else {
      versionOutput = execSync(`npm version ${releaseType} --no-git-tag-version`).toString().trim();
    }
    const cleanVersion = versionOutput.split('\n').find(line => line.startsWith('v')).replace('v', '');

    // Build package
    console.log('Building package...');
    execSync('npm run build', { stdio: 'inherit' });

    // Commit version bump with consistent message format
    console.log('Committing version bump...');
    execSync(`git commit -am "chore: bump ${isPrerelease ? npmReleaseType + ' (prerelease)' : releaseType} version to v${cleanVersion}"`, { stdio: 'inherit' });

    // Check if we should skip publishing
    const skipPublish = process.env.SKIP_PUBLISH === 'true';
    if (skipPublish) {
      console.log('Skipping package publishing (SKIP_PUBLISH=true)');
    } else {
      // Publish package
      console.log('Publishing package...');
      const otp = await promptOTP(); // Get OTP from user
      let publishCmd = `npm publish --access public --otp=${otp}`;
      if (isPrerelease) {
        publishCmd += ' --tag alpha';
      }
      execSync(publishCmd, { stdio: 'inherit' });
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
})();
