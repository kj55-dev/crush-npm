#!/bin/bash
# build.sh - Build platform-specific npm packages from Crush releases
#
# Usage: ./scripts/build.sh <version>
# Example: ./scripts/build.sh 0.43.0

set -euo pipefail

VERSION="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
PACKAGE_SCOPE="@anthropic-ai/crush-corp"

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 0.43.0"
    exit 1
fi

echo "Building npm packages for Crush v${VERSION}"

# Clean dist directory
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}/packages"

# Platform mappings
declare -A PLATFORMS=(
    ["Linux_x86_64"]="linux-x64"
    ["Linux_arm64"]="linux-arm64"
    ["Darwin_x86_64"]="darwin-x64"
    ["Darwin_arm64"]="darwin-arm64"
    ["Windows_x86_64"]="win32-x64"
    ["Windows_arm64"]="win32-arm64"
)

declare -A OS_MAP=(
    ["linux-x64"]="linux"
    ["linux-arm64"]="linux"
    ["darwin-x64"]="darwin"
    ["darwin-arm64"]="darwin"
    ["win32-x64"]="win32"
    ["win32-arm64"]="win32"
)

declare -A CPU_MAP=(
    ["linux-x64"]="x64"
    ["linux-arm64"]="arm64"
    ["darwin-x64"]="x64"
    ["darwin-arm64"]="arm64"
    ["win32-x64"]="x64"
    ["win32-arm64"]="arm64"
)

BUILT_PLATFORMS=""

# Download and build platform packages
for archive_suffix in "${!PLATFORMS[@]}"; do
    npm_platform="${PLATFORMS[$archive_suffix]}"
    os="${OS_MAP[$npm_platform]}"
    cpu="${CPU_MAP[$npm_platform]}"
    
    # Determine archive type
    if [ "$os" = "win32" ]; then
        archive_name="crush_${VERSION}_${archive_suffix}.zip"
        binary_name="crush.exe"
    else
        archive_name="crush_${VERSION}_${archive_suffix}.tar.gz"
        binary_name="crush"
    fi
    
    archive_path="${DIST_DIR}/${archive_name}"
    download_url="https://github.com/charmbracelet/crush/releases/download/v${VERSION}/${archive_name}"
    
    echo ""
    echo "Processing ${npm_platform}..."
    
    # Download if not exists
    if [ ! -f "$archive_path" ]; then
        echo "  Downloading ${archive_name}..."
        if ! curl -fsSL -o "$archive_path" "$download_url"; then
            echo "  Skipping ${npm_platform}: download failed"
            rm -f "$archive_path"
            continue
        fi
    fi
    
    # Create package directory
    pkg_name="crush-corp-${npm_platform}"
    pkg_dir="${DIST_DIR}/packages/${pkg_name}"
    mkdir -p "${pkg_dir}/bin"
    
    # Extract binary
    echo "  Extracting binary..."
    if [ "$os" = "win32" ]; then
        unzip -q -j "$archive_path" "*/${binary_name}" -d "${pkg_dir}/bin/" 2>/dev/null || \
        unzip -q -j "$archive_path" "${binary_name}" -d "${pkg_dir}/bin/" 2>/dev/null || \
        (unzip -q "$archive_path" -d "${pkg_dir}/temp" && \
         find "${pkg_dir}/temp" -name "${binary_name}" -exec mv {} "${pkg_dir}/bin/" \; && \
         rm -rf "${pkg_dir}/temp")
    else
        tar -xzf "$archive_path" -C "${pkg_dir}/bin" --strip-components=1 --wildcards "*/${binary_name}" 2>/dev/null || \
        tar -xzf "$archive_path" -C "${pkg_dir}/bin" "${binary_name}" 2>/dev/null || \
        (tar -xzf "$archive_path" -C "${pkg_dir}" && \
         find "${pkg_dir}" -name "${binary_name}" -exec mv {} "${pkg_dir}/bin/" \; && \
         find "${pkg_dir}" -maxdepth 1 -type d -name "crush_*" -exec rm -rf {} \;)
    fi
    
    chmod +x "${pkg_dir}/bin/${binary_name}" 2>/dev/null || true
    
    # Verify binary exists
    if [ ! -f "${pkg_dir}/bin/${binary_name}" ]; then
        echo "  ERROR: Failed to extract binary for ${npm_platform}"
        rm -rf "${pkg_dir}"
        continue
    fi
    
    # Create package.json
    cat > "${pkg_dir}/package.json" << EOF
{
  "name": "${PACKAGE_SCOPE}-${npm_platform}",
  "version": "${VERSION}",
  "description": "Crush binary for ${npm_platform}",
  "license": "FSL-1.1-MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/kj55-dev/crush-npm.git"
  },
  "os": ["${os}"],
  "cpu": ["${cpu}"],
  "files": ["bin/"],
  "preferUnplugged": true
}
EOF
    
    # Create README
    cat > "${pkg_dir}/README.md" << EOF
# ${PACKAGE_SCOPE}-${npm_platform}

Platform-specific binary package for Crush on ${npm_platform}.

This package is automatically installed as a dependency of \`${PACKAGE_SCOPE}\`.
You should not need to install this package directly.

## About Crush

Crush is a glamorous agentic coding assistant for your terminal.
Learn more at https://charm.sh/crush
EOF
    
    echo "  Built ${pkg_name}"
    BUILT_PLATFORMS="${BUILT_PLATFORMS} ${npm_platform}"
done

# Update main package version
echo ""
echo "Updating main package version to ${VERSION}..."

# Update package.json version
cd "${ROOT_DIR}"
node -e "
const pkg = require('./package.json');
pkg.version = '${VERSION}';

// Update optionalDependencies versions
for (const dep in pkg.optionalDependencies) {
  pkg.optionalDependencies[dep] = '${VERSION}';
}

require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="
echo ""
echo "Platforms built:${BUILT_PLATFORMS}"
echo ""
echo "Platform packages: ${DIST_DIR}/packages/"
ls -la "${DIST_DIR}/packages/"
echo ""
echo "Next steps:"
echo "  1. cd ${DIST_DIR}/packages/<platform>"
echo "  2. npm publish --access public"
echo "  3. cd ${ROOT_DIR}"
echo "  4. npm publish --access public"
