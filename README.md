# crush-npm

npm distribution of [Crush](https://github.com/charmbracelet/crush) using the **optionalDependencies pattern**.

This package works behind **corporate firewalls** where GitHub is blocked but npm registry is accessible.

## Installation

```bash
npm install -g @anthropic-ai/crush-corp
```

Or use npx:

```bash
npx @anthropic-ai/crush-corp
```

## Why This Package?

The official `@charmland/crush` npm package downloads binaries from GitHub during `postinstall`. This fails in enterprise environments where:

- `registry.npmjs.org` is **allowed** (standard for development)
- `github.com` is **blocked** (common security policy)

This package embeds binaries directly in platform-specific npm packages, so everything downloads from npm only.

## How It Works

```
@anthropic-ai/crush-corp (thin wrapper, ~5KB)
  └── optionalDependencies:
      ├── @anthropic-ai/crush-corp-linux-x64   (binary embedded, ~18MB)
      ├── @anthropic-ai/crush-corp-linux-arm64
      ├── @anthropic-ai/crush-corp-darwin-x64
      ├── @anthropic-ai/crush-corp-darwin-arm64
      ├── @anthropic-ai/crush-corp-win32-x64
      └── ...
```

npm automatically installs only the package matching your platform.

## Supported Platforms

| Platform | Package |
|----------|---------|
| Linux x64 | `@anthropic-ai/crush-corp-linux-x64` |
| Linux ARM64 | `@anthropic-ai/crush-corp-linux-arm64` |
| macOS x64 | `@anthropic-ai/crush-corp-darwin-x64` |
| macOS ARM64 | `@anthropic-ai/crush-corp-darwin-arm64` |
| Windows x64 | `@anthropic-ai/crush-corp-win32-x64` |
| Windows ARM64 | `@anthropic-ai/crush-corp-win32-arm64` |

## Versioning

This package tracks Crush releases. Version `0.43.0` of this package contains Crush `v0.43.0`.

## Configuration

See the [official Crush documentation](https://github.com/charmbracelet/crush#configuration) for configuration options.

### Air-Gapped Configuration

For fully air-gapped environments, disable provider auto-updates and metrics:

```json
{
  "$schema": "https://charm.land/crush.json",
  "options": {
    "disable_provider_auto_update": true,
    "disable_metrics": true
  },
  "providers": {
    "azure": {
      "type": "openai-compat",
      "base_url": "https://your-azure-endpoint.com/v1/",
      "api_key": "$AZURE_API_KEY"
    }
  }
}
```

## License

Crush is licensed under [FSL-1.1-MIT](https://github.com/charmbracelet/crush/blob/main/LICENSE.md).

This npm distribution wrapper is MIT licensed.

## Credits

- [Crush](https://github.com/charmbracelet/crush) by [Charm](https://charm.sh)
- Distribution pattern inspired by [esbuild](https://github.com/evanw/esbuild) and [OpenCode](https://github.com/anthropic-ai/opencode)
