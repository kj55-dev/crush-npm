#!/usr/bin/env node
/**
 * Crush CLI wrapper script
 * 
 * This script finds and executes the platform-specific Crush binary
 * from the optionalDependencies packages.
 * 
 * The binary is stored as .bin to avoid corporate web filters that block
 * .exe downloads. On first run, it's renamed to the proper executable name.
 * 
 * Pattern based on esbuild, turbo, and opencode distribution.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PACKAGE_SCOPE = '@offlinecli/crush';

/**
 * Get the platform-specific package name
 */
function getPlatformPackage() {
  const platform = process.platform;
  const arch = process.arch;
  return `${PACKAGE_SCOPE}-${platform}-${arch}`;
}

/**
 * Get the correct binary name for this platform
 */
function getBinaryName() {
  return process.platform === 'win32' ? 'crush.exe' : 'crush';
}

/**
 * Find the binary in various possible locations.
 * If only .bin exists, rename it to the proper executable name first.
 */
function findBinary() {
  const platform = process.platform;
  const arch = process.arch;
  const platformPkg = getPlatformPackage();
  const binaryName = getBinaryName();
  const disguisedName = 'crush.bin';
  
  // Possible base directories to check
  const baseDirs = [
    // Scoped package location
    path.join(__dirname, '..', '..', '@offlinecli', `crush-${platform}-${arch}`, 'bin'),
    
    // Hoisted to root node_modules
    path.join(__dirname, '..', '..', '..', '@offlinecli', `crush-${platform}-${arch}`, 'bin'),
    
    // pnpm/yarn PnP style - try require.resolve
    (() => {
      try {
        const pkgPath = require.resolve(`${platformPkg}/package.json`);
        return path.join(path.dirname(pkgPath), 'bin');
      } catch {
        return null;
      }
    })(),
  ].filter(Boolean);
  
  for (const binDir of baseDirs) {
    const finalPath = path.join(binDir, binaryName);
    const disguisedPath = path.join(binDir, disguisedName);
    
    // Check if final binary already exists
    if (fs.existsSync(finalPath)) {
      return finalPath;
    }
    
    // Check if disguised binary exists - rename it
    if (fs.existsSync(disguisedPath)) {
      try {
        fs.renameSync(disguisedPath, finalPath);
        // Ensure executable permission on Unix
        if (process.platform !== 'win32') {
          fs.chmodSync(finalPath, 0o755);
        }
        return finalPath;
      } catch (err) {
        // If rename fails (permissions), try to execute .bin directly
        // This works on Unix, may need special handling on Windows
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(disguisedPath, 0o755);
            return disguisedPath;
          } catch {
            // Fall through
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Print helpful error message when binary is not found
 */
function printNotFoundError() {
  const platform = process.platform;
  const arch = process.arch;
  const platformPkg = getPlatformPackage();
  
  console.error(`
Crush binary not found for ${platform}-${arch}

The platform-specific package "${platformPkg}" was not installed.

This can happen if:
1. Your platform (${platform}-${arch}) is not supported
2. npm failed to install the optional dependency
3. You're using a package manager that doesn't support optionalDependencies

To fix this, try:
  npm install ${platformPkg}

Or install Crush directly:
  # macOS
  brew install charmbracelet/tap/crush
  
  # Windows
  winget install charmbracelet.crush
  
  # Linux (Debian/Ubuntu)
  sudo apt install crush
  
  # Or download from:
  https://github.com/charmbracelet/crush/releases

Supported platforms:
  - linux-x64, linux-arm64
  - darwin-x64, darwin-arm64
  - win32-x64, win32-arm64
`);
}

/**
 * Main entry point
 */
function main() {
  const binaryPath = findBinary();
  
  if (!binaryPath) {
    printNotFoundError();
    process.exit(1);
  }
  
  // Forward all arguments to the binary
  const args = process.argv.slice(2);
  
  // Use spawn for better signal handling and TTY support
  const child = spawn(binaryPath, args, {
    stdio: 'inherit',
    windowsHide: false,
  });
  
  child.on('error', (err) => {
    console.error(`Failed to execute Crush: ${err.message}`);
    process.exit(1);
  });
  
  child.on('exit', (code, signal) => {
    if (signal) {
      // Re-raise the signal
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 1);
    }
  });
  
  // Forward signals to child process
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  });
}

main();
