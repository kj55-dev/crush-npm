# Contributing to @offlinecli/crush

Thank you for your interest in contributing!

## Project Overview

This repository provides an npm distribution of [Crush](https://github.com/charmbracelet/crush) by Charmbracelet. It repackages the official Crush binaries for installation via npm, enabling use in corporate environments where GitHub is blocked.

## How It Works

1. **Build script** (`scripts/build.sh`) downloads Crush binaries from GitHub releases
2. **Binaries** are stored as `.bin` files (for web filter compatibility)
3. **Platform packages** (`@offlinecli/crush-{platform}-{arch}`) contain embedded binaries
4. **Main package** (`@offlinecli/crush`) is a thin wrapper that finds and executes the correct binary
5. **Setup wizard** (`bin/setup.js`) helps configure Crush for offline/Azure environments

## Publishing a New Version

### Prerequisites

- npm organization `@offlinecli` must exist
- Trusted Publishing must be configured on npmjs.com
- GitHub Actions workflow permissions set correctly

### Steps

1. Check the [latest Crush release](https://github.com/charmbracelet/crush/releases)
2. Go to **Actions** → **Build and Publish to npm**
3. Click **Run workflow**
4. Enter the version (e.g., `0.44.0`)
5. Optionally check "Dry run" to test without publishing
6. Click **Run workflow**

### First-Time Setup

For the initial publish, you may need to:

1. Create the `@offlinecli` organization on [npmjs.com](https://www.npmjs.com/org/create)
2. Configure Trusted Publishing:
   - Go to package settings → Trusted Publisher
   - Select GitHub Actions
   - Organization: `kj55-dev`
   - Repository: `crush-npm`  
   - Workflow: `publish.yml`

## Local Development

### Testing the Build

```bash
# Build packages for a specific version
./scripts/build.sh 0.43.0

# Test the wrapper locally
node bin/crush.js --version

# Test the setup wizard
node bin/setup.js help
```

### Testing with Local Install

```bash
# Create test directory
mkdir /tmp/crush-test && cd /tmp/crush-test

# Copy built packages
mkdir -p node_modules/@offlinecli
cp -r /path/to/crush-npm/dist/packages/crush-linux-x64 node_modules/@offlinecli/

# Copy wrapper
cp /path/to/crush-npm/bin/crush.js .

# Test
node crush.js --version
```

## Code Style

- JavaScript files use CommonJS (for Node.js compatibility)
- Shell scripts should be POSIX-compatible where possible
- Use descriptive commit messages

## Questions?

- For Crush issues: https://github.com/charmbracelet/crush/issues
- For this npm distribution: Open an issue in this repo
