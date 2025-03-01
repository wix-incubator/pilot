#!/usr/bin/env node

// See PACKAGE-MONITOR.md for usage instructions

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

// Read configuration from package.json
const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

// Load package.json and extract configuration
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('Failed to read package.json:', error.message);
  process.exit(1);
}

// Extract package monitor config
const config = packageJson.packageMonitor || {};
const packagesToMonitor = {};

// Process packages from config
if (config.packages) {
  Object.entries(config.packages).forEach(([name, pkgConfig]) => {
    packagesToMonitor[name] = {
      path: path.join(rootDir, pkgConfig.path),
      buildCommand: pkgConfig.buildCommand
    };
  });
}

// If no packages are configured, exit with an error
if (Object.keys(packagesToMonitor).length === 0) {
  console.error('No packages configured for monitoring in package.json');
  console.error('Please add configuration to the "packageMonitor.packages" section:');
  console.error(`
  "packageMonitor": {
    "packages": {
      "example-package": {
        "path": "packages/example-package",
        "buildCommand": "npm run build --workspace=@scope/example-package"
      }
    }
  }`);
  process.exit(1);
}

// Get watch and ignore patterns from config
const watchPatterns = config.watchPatterns;

if (!watchPatterns) {
  console.error('No watch patterns configured in package.json');
  console.error('Please add configuration to the "packageMonitor.watchPatterns" section:');
  console.error(`
  "packageMonitor": {
    "watchPatterns": ["src/**/*.ts", "src/**/*.tsx"]
  }`);
  process.exit(1);
}

const ignorePatterns = config.ignorePatterns;

if (!ignorePatterns) {
  console.error('No ignore patterns configured in package.json');
  console.error('Please add configuration to the "packageMonitor.ignorePatterns" section:');
  console.error(`
  "packageMonitor": {
    "ignorePatterns": ["**/node_modules/**", "**/dist/**"]
  }`);
  process.exit(1);
}

// Get debounce time from config
const debounceMs = config.debounceMs;

if (!debounceMs) {
  console.error('No debounce time configured in package.json');
  console.error('Please add configuration to the "packageMonitor.debounceMs" section:');
  console.error(`
  "packageMonitor": {
    "debounceMs": 1000
  }`);
  process.exit(1);
}

// Build a specific package
function buildPackage(packageName, packageConfig) {
  console.log(`\nBuilding package: ${packageName}...`);
  try {
    execSync(packageConfig.buildCommand, { stdio: 'inherit' });
    console.log(`\n✅ Successfully built ${packageName}`);
  } catch (error) {
    console.error(`\n❌ Failed to build ${packageName}:`, error.message);
  }
}

// Build all configured packages
function buildAllPackages() {
  Object.entries(packagesToMonitor).forEach(([name, config]) => {
    buildPackage(name, config);
  });
}

// Watch packages for changes
function watchPackages() {
  Object.entries(packagesToMonitor).forEach(([packageName, packageConfig]) => {
    console.log(`Watching ${packageName} at ${packageConfig.path}...`);

    // Set up watch patterns
    const watchPaths = watchPatterns.map(pattern =>
     path.join(packageConfig.path, pattern)
    );

    // Set up watcher
    const watcher = chokidar.watch(watchPaths, {
      ignored: ignorePatterns,
      persistent: true
    });

    // Build on changes
    let debounceTimer;
    watcher.on('change', (filePath) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`\nChange detected in ${packageName}: ${path.relative(packageConfig.path, filePath)}`);
        buildPackage(packageName, packageConfig);
      }, debounceMs);
    });
  });

  console.log('\n👀 Watching for changes. Press Ctrl+C to exit.');
}

// Main execution
async function main() {
  // Install chokidar if not already installed
  try {
    require.resolve('chokidar');
  } catch (e) {
    console.log('Installing required dependencies...');
    execSync('npm install --no-save chokidar', { stdio: 'inherit' });
    console.log('Dependencies installed.');
  }

  // Always run initial build first
  buildAllPackages();
  console.log('\nInitial build completed. Starting watch mode...');

  // Always watch for changes
  watchPackages();
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
