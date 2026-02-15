# @offlinecli/crush

[![npm version](https://img.shields.io/npm/v/@offlinecli/crush.svg)](https://www.npmjs.com/package/@offlinecli/crush)
[![npm downloads](https://img.shields.io/npm/dm/@offlinecli/crush.svg)](https://www.npmjs.com/package/@offlinecli/crush)

Offline-friendly npm distribution of [Crush](https://github.com/charmbracelet/crush) by [Charmbracelet](https://charm.sh).

This package works behind **corporate firewalls** where GitHub is blocked but npm registry is accessible.

> **Note**: This is an unofficial redistribution. For the official package, see [@charmland/crush](https://www.npmjs.com/package/@charmland/crush).

## Installation

```bash
npm install -g @offlinecli/crush
```

Or use npx:

```bash
npx @offlinecli/crush
```

## Quick Start for Enterprise/Air-Gapped Environments

### 1. Run the Setup Wizard

```bash
crush-setup
```

This interactive wizard will:
- Configure your Azure AI Foundry or other LLM endpoint
- Disable telemetry and auto-updates
- Generate required environment variables
- Create the configuration file

### 2. Or Use Quick Setup (Non-Interactive)

```bash
# Azure AI Foundry
crush-setup quick azure-foundry https://your-resource.openai.azure.com/ gpt-4

# Azure OpenAI
crush-setup quick azure-openai https://your-resource.openai.azure.com/ gpt-4

# Any OpenAI-compatible API
crush-setup quick openai-compat https://your-internal-llm.corp.com/v1/ model-name

# Local Ollama
crush-setup quick ollama http://localhost:11434/v1/ llama3:70b
```

### 3. Set Environment Variables

```bash
# Required for Azure AI Foundry
export AZURE_AI_FOUNDRY_API_KEY="your-api-key"

# Disable telemetry (already set by setup wizard in config)
export CRUSH_DISABLE_METRICS=1
export CRUSH_DISABLE_PROVIDER_AUTO_UPDATE=1
export DO_NOT_TRACK=1
```

### 4. Run Crush

```bash
crush
```

## Setup Commands

| Command | Description |
|---------|-------------|
| `crush-setup` | Interactive setup wizard |
| `crush-setup quick <type> <endpoint> [model]` | Quick non-interactive setup |
| `crush-setup show` | Show current configuration |
| `crush-setup env` | Print environment variables for shell |
| `crush-setup help` | Show help |

## Why This Package?

The official `@charmland/crush` npm package downloads binaries from GitHub during `postinstall`. This fails in enterprise environments where:

- `registry.npmjs.org` is **allowed** (standard for development)
- `github.com` is **blocked** (common security policy)

This package embeds binaries directly in platform-specific npm packages, so everything downloads from npm only.

## How It Works

```
@offlinecli/crush (thin wrapper + setup wizard)
  └── optionalDependencies:
      ├── @offlinecli/crush-linux-x64   (binary embedded, ~18MB)
      ├── @offlinecli/crush-linux-arm64
      ├── @offlinecli/crush-darwin-x64
      ├── @offlinecli/crush-darwin-arm64
      ├── @offlinecli/crush-win32-x64
      └── ...
```

npm automatically installs only the package matching your platform.

## Supported Platforms

| Platform | Package |
|----------|---------|
| Linux x64 | `@offlinecli/crush-linux-x64` |
| Linux ARM64 | `@offlinecli/crush-linux-arm64` |
| macOS x64 | `@offlinecli/crush-darwin-x64` |
| macOS ARM64 | `@offlinecli/crush-darwin-arm64` |
| Windows x64 | `@offlinecli/crush-win32-x64` |
| Windows ARM64 | `@offlinecli/crush-win32-arm64` |

## Manual Configuration

If you prefer manual configuration, create `~/.config/crush/crush.json` (Linux/macOS) or `%LOCALAPPDATA%\crush\crush.json` (Windows):

```json
{
  "$schema": "https://charm.land/crush.json",
  "options": {
    "disable_provider_auto_update": true,
    "disable_metrics": true,
    "disable_default_providers": true,
    "disabled_tools": ["fetch", "sourcegraph"]
  },
  "providers": {
    "azure-foundry": {
      "type": "openai-compat",
      "base_url": "https://your-resource.openai.azure.com/",
      "api_key": "$AZURE_AI_FOUNDRY_API_KEY",
      "models": [
        {
          "id": "gpt-4",
          "name": "GPT-4 (Azure AI Foundry)",
          "context_window": 128000,
          "default_max_tokens": 4096,
          "cost_per_1m_in": 0,
          "cost_per_1m_out": 0,
          "cost_per_1m_in_cached": 0,
          "cost_per_1m_out_cached": 0,
          "can_reason": false,
          "supports_attachments": true,
          "options": {}
        }
      ]
    }
  }
}
```

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `CRUSH_DISABLE_METRICS` | Disable telemetry (`1` to disable) |
| `CRUSH_DISABLE_PROVIDER_AUTO_UPDATE` | Disable fetching provider updates (`1` to disable) |
| `DO_NOT_TRACK` | Standard opt-out signal (`1` to disable) |
| `AZURE_OPENAI_API_KEY` | API key for Azure OpenAI |
| `AZURE_OPENAI_API_ENDPOINT` | Endpoint for Azure OpenAI |
| `AZURE_AI_FOUNDRY_API_KEY` | API key for Azure AI Foundry |

## Versioning

This package tracks Crush releases. Version `0.43.0` of this package contains Crush `v0.43.0`.

## Attribution

**Crush** is created by [Charmbracelet, Inc.](https://charm.sh) and licensed under [FSL-1.1-MIT](https://github.com/charmbracelet/crush/blob/main/LICENSE.md).

This is an unofficial redistribution for offline/corporate environments. For the official package, see [@charmland/crush](https://www.npmjs.com/package/@charmland/crush).

## License

Crush is licensed under [FSL-1.1-MIT](https://github.com/charmbracelet/crush/blob/main/LICENSE.md) by Charmbracelet, Inc.

## Credits

- [Crush](https://github.com/charmbracelet/crush) by [Charm](https://charm.sh)
- Distribution pattern inspired by [esbuild](https://github.com/evanw/esbuild) and [OpenCode](https://github.com/anomalyco/opencode)
