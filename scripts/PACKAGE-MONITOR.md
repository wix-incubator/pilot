# Package Monitor

This tool allows you to monitor changes in specific packages of the monorepo and automatically trigger builds when files are modified.

To add more packages to be monitored, add them to the `packageMonitor.packages` section in your `package.json`:

## Usage

From the root of the monorepo, run:

```bash
npm run watch
```
This will run the `package-monitor.js` script, and will start watching all configured packages for changes and trigger builds when files are modified.

## Configuration

All configuration is stored in the root `package.json` file under the `packageMonitor` key.

### Customizing Watch Patterns

You can customize which files are watched by editing the `watchPatterns` array in the `packageMonitor` section:

```json
"watchPatterns": [
  "src/**/*.ts",
  "src/**/*.tsx", 
  "lib/**/*.js"
]
```

### Customizing Ignore Patterns

To exclude certain files or directories from being watched, edit the `ignorePatterns` array:

```json
"ignorePatterns": [
  "**/node_modules/**",
  "**/dist/**",
  "**/*.spec.ts"
]
```

### Adjusting Debounce Time

You can adjust how long the system waits after a file change before triggering a build:

```json
"debounceMs": 500
```

This will wait 500ms after changes before building.
