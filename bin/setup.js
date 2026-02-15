#!/usr/bin/env node
/**
 * Crush Offline Setup Wizard
 * 
 * Configures Crush for air-gapped/corporate environments with Azure AI Foundry
 * or other OpenAI-compatible endpoints.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// Configuration paths
const CONFIG_DIR = process.platform === 'win32' 
  ? path.join(process.env.LOCALAPPDATA || '', 'crush')
  : path.join(os.homedir(), '.config', 'crush');

const CONFIG_FILE = path.join(CONFIG_DIR, 'crush.json');

// Default offline configuration
const OFFLINE_CONFIG = {
  "$schema": "https://charm.land/crush.json",
  "options": {
    "disable_provider_auto_update": true,
    "disable_metrics": true,
    "disable_default_providers": true,
    "auto_lsp": true
  }
};

// Provider templates
const PROVIDER_TEMPLATES = {
  'azure-openai': {
    name: 'Azure OpenAI',
    envVars: ['AZURE_OPENAI_API_ENDPOINT', 'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_VERSION'],
    config: (answers) => ({
      type: 'azure',
      base_url: answers.endpoint,
      api_key: '$AZURE_OPENAI_API_KEY',
      models: [{
        id: answers.deployment || 'gpt-4',
        name: answers.modelName || 'GPT-4 (Azure)',
        context_window: parseInt(answers.contextWindow) || 128000,
        default_max_tokens: parseInt(answers.maxTokens) || 4096,
        cost_per_1m_in: 0,
        cost_per_1m_out: 0,
        cost_per_1m_in_cached: 0,
        cost_per_1m_out_cached: 0,
        can_reason: false,
        supports_attachments: true,
        options: {}
      }]
    })
  },
  'azure-foundry': {
    name: 'Azure AI Foundry',
    envVars: ['AZURE_AI_FOUNDRY_ENDPOINT', 'AZURE_AI_FOUNDRY_API_KEY'],
    config: (answers) => ({
      type: 'openai-compat',
      base_url: answers.endpoint,
      api_key: '$AZURE_AI_FOUNDRY_API_KEY',
      models: [{
        id: answers.deployment || 'gpt-4',
        name: answers.modelName || 'GPT-4 (Azure AI Foundry)',
        context_window: parseInt(answers.contextWindow) || 128000,
        default_max_tokens: parseInt(answers.maxTokens) || 4096,
        cost_per_1m_in: 0,
        cost_per_1m_out: 0,
        cost_per_1m_in_cached: 0,
        cost_per_1m_out_cached: 0,
        can_reason: false,
        supports_attachments: true,
        options: {}
      }]
    })
  },
  'openai-compat': {
    name: 'OpenAI-Compatible API',
    envVars: ['CUSTOM_LLM_API_KEY'],
    config: (answers) => ({
      type: 'openai-compat',
      base_url: answers.endpoint,
      api_key: '$CUSTOM_LLM_API_KEY',
      models: [{
        id: answers.deployment || 'default',
        name: answers.modelName || 'Custom Model',
        context_window: parseInt(answers.contextWindow) || 128000,
        default_max_tokens: parseInt(answers.maxTokens) || 4096,
        cost_per_1m_in: 0,
        cost_per_1m_out: 0,
        cost_per_1m_in_cached: 0,
        cost_per_1m_out_cached: 0,
        can_reason: false,
        supports_attachments: true,
        options: {}
      }]
    })
  },
  'ollama': {
    name: 'Ollama (Local)',
    envVars: [],
    config: (answers) => ({
      name: 'Ollama',
      type: 'openai-compat',
      base_url: answers.endpoint || 'http://localhost:11434/v1/',
      models: [{
        id: answers.deployment || 'llama3:70b',
        name: answers.modelName || 'Llama 3 70B',
        context_window: parseInt(answers.contextWindow) || 128000,
        default_max_tokens: parseInt(answers.maxTokens) || 4096,
        cost_per_1m_in: 0,
        cost_per_1m_out: 0,
        cost_per_1m_in_cached: 0,
        cost_per_1m_out_cached: 0,
        can_reason: false,
        supports_attachments: false,
        options: {}
      }]
    })
  }
};

class SetupWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt, defaultValue = '') {
    return new Promise((resolve) => {
      const displayPrompt = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
      this.rl.question(displayPrompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async confirm(prompt, defaultYes = true) {
    const suffix = defaultYes ? '[Y/n]' : '[y/N]';
    const answer = await this.question(`${prompt} ${suffix}`);
    if (!answer) return defaultYes;
    return answer.toLowerCase().startsWith('y');
  }

  async select(prompt, options) {
    console.log(`\n${prompt}`);
    options.forEach((opt, i) => {
      console.log(`  ${i + 1}. ${opt.name || opt}`);
    });
    const answer = await this.question('Enter number');
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < options.length) {
      return options[index];
    }
    console.log('Invalid selection, using first option.');
    return options[0];
  }

  async run() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          Crush Offline/Enterprise Setup Wizard                ║
║                                                               ║
║  This wizard configures Crush for air-gapped environments    ║
║  with Azure AI Foundry or other internal LLM endpoints.       ║
╚═══════════════════════════════════════════════════════════════╝
`);

    // Check existing config
    let existingConfig = {};
    if (fs.existsSync(CONFIG_FILE)) {
      const overwrite = await this.confirm('Existing configuration found. Overwrite?', false);
      if (!overwrite) {
        try {
          existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        } catch (e) {
          console.log('Could not parse existing config, starting fresh.');
        }
      }
    }

    // Select provider type
    const providerKeys = Object.keys(PROVIDER_TEMPLATES);
    const providerOptions = providerKeys.map(k => ({ key: k, name: PROVIDER_TEMPLATES[k].name }));
    const selectedProvider = await this.select('Select your LLM provider:', providerOptions);
    const template = PROVIDER_TEMPLATES[selectedProvider.key];

    console.log(`\nConfiguring ${template.name}...\n`);

    // Gather provider details
    const answers = {};

    // Endpoint URL
    if (selectedProvider.key === 'ollama') {
      answers.endpoint = await this.question('Ollama endpoint URL', 'http://localhost:11434/v1/');
    } else {
      answers.endpoint = await this.question('API endpoint URL (e.g., https://your-resource.openai.azure.com/)');
      if (!answers.endpoint) {
        console.log('Endpoint is required. Exiting.');
        this.rl.close();
        process.exit(1);
      }
      // Ensure endpoint ends with /
      if (!answers.endpoint.endsWith('/')) {
        answers.endpoint += '/';
      }
    }

    // Model/Deployment details
    answers.deployment = await this.question('Model/Deployment ID', 'gpt-4');
    answers.modelName = await this.question('Display name for model', answers.deployment);
    answers.contextWindow = await this.question('Context window size', '128000');
    answers.maxTokens = await this.question('Max output tokens', '4096');

    // Build configuration
    const config = {
      ...OFFLINE_CONFIG,
      ...existingConfig,
      options: {
        ...OFFLINE_CONFIG.options,
        ...(existingConfig.options || {})
      },
      providers: {
        ...(existingConfig.providers || {}),
        [selectedProvider.key]: template.config(answers)
      }
    };

    // Show environment variables needed
    if (template.envVars.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Environment variables required:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      template.envVars.forEach(envVar => {
        console.log(`  ${envVar}=<your-api-key>`);
      });

      console.log('\nAdd these to your shell profile (~/.bashrc, ~/.zshrc) or set them before running Crush.');
      
      // Generate shell export commands
      console.log('\n# Copy these commands:');
      if (process.platform === 'win32') {
        template.envVars.forEach(envVar => {
          console.log(`$env:${envVar}="your-api-key-here"`);
        });
      } else {
        template.envVars.forEach(envVar => {
          console.log(`export ${envVar}="your-api-key-here"`);
        });
      }
    }

    // Ask about additional offline settings
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Additional offline settings:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const disableFetch = await this.confirm('Disable web fetch tool (recommended for air-gap)?', true);
    const disableSourcegraph = await this.confirm('Disable Sourcegraph tool?', true);

    if (disableFetch || disableSourcegraph) {
      config.options.disabled_tools = [];
      if (disableFetch) config.options.disabled_tools.push('fetch');
      if (disableSourcegraph) config.options.disabled_tools.push('sourcegraph');
    }

    // Save configuration
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Configuration preview:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(JSON.stringify(config, null, 2));

    const saveConfig = await this.confirm('\nSave this configuration?', true);

    if (saveConfig) {
      // Ensure config directory exists
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log(`\n✓ Configuration saved to: ${CONFIG_FILE}`);

      // Also offer to save project-local config
      const saveLocal = await this.confirm('Also save to current directory (crush.json)?', false);
      if (saveLocal) {
        fs.writeFileSync('crush.json', JSON.stringify(config, null, 2));
        console.log('✓ Configuration saved to: ./crush.json');
      }
    }

    // Generate .env file
    const generateEnv = await this.confirm('\nGenerate .env.example file with required variables?', true);
    if (generateEnv) {
      let envContent = '# Crush environment variables for offline/enterprise use\n\n';
      envContent += '# Disable telemetry and auto-updates\n';
      envContent += 'CRUSH_DISABLE_METRICS=1\n';
      envContent += 'CRUSH_DISABLE_PROVIDER_AUTO_UPDATE=1\n';
      envContent += 'DO_NOT_TRACK=1\n\n';
      
      if (template.envVars.length > 0) {
        envContent += `# ${template.name} credentials\n`;
        template.envVars.forEach(envVar => {
          envContent += `${envVar}=\n`;
        });
      }

      fs.writeFileSync('.env.example', envContent);
      console.log('✓ Generated .env.example');
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setup complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. Set the required environment variables
  2. Run: crush

For more configuration options, see:
  https://github.com/charmbracelet/crush#configuration
`);

    this.rl.close();
  }
}

// Quick setup mode - non-interactive
async function quickSetup(args) {
  const providerType = args[0] || 'azure-foundry';
  const endpoint = args[1];
  const deployment = args[2] || 'gpt-4';

  if (!endpoint) {
    console.error('Usage: crush-setup quick <provider-type> <endpoint> [deployment]');
    console.error('');
    console.error('Provider types: azure-openai, azure-foundry, openai-compat, ollama');
    console.error('');
    console.error('Example:');
    console.error('  crush-setup quick azure-foundry https://my-resource.openai.azure.com/ gpt-4');
    process.exit(1);
  }

  const template = PROVIDER_TEMPLATES[providerType];
  if (!template) {
    console.error(`Unknown provider type: ${providerType}`);
    console.error('Valid types: ' + Object.keys(PROVIDER_TEMPLATES).join(', '));
    process.exit(1);
  }

  const config = {
    ...OFFLINE_CONFIG,
    providers: {
      [providerType]: template.config({ endpoint, deployment, modelName: deployment })
    }
  };

  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`Configuration saved to: ${CONFIG_FILE}`);
  console.log('');
  console.log('Required environment variables:');
  template.envVars.forEach(v => console.log(`  ${v}`));
}

// Show current config
function showConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    console.log(`Configuration file: ${CONFIG_FILE}\n`);
    console.log(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } else {
    console.log('No configuration file found.');
    console.log(`Expected location: ${CONFIG_FILE}`);
  }
}

// Print env vars for shell
function printEnv() {
  const isWindows = process.platform === 'win32';
  
  console.log('# Crush offline environment variables');
  console.log('# Add these to your shell profile or run before starting Crush\n');
  
  if (isWindows) {
    console.log('# PowerShell:');
    console.log('$env:CRUSH_DISABLE_METRICS="1"');
    console.log('$env:CRUSH_DISABLE_PROVIDER_AUTO_UPDATE="1"');
    console.log('$env:DO_NOT_TRACK="1"');
    console.log('');
    console.log('# For Azure AI Foundry:');
    console.log('$env:AZURE_AI_FOUNDRY_API_KEY="your-key-here"');
  } else {
    console.log('# Bash/Zsh:');
    console.log('export CRUSH_DISABLE_METRICS=1');
    console.log('export CRUSH_DISABLE_PROVIDER_AUTO_UPDATE=1');
    console.log('export DO_NOT_TRACK=1');
    console.log('');
    console.log('# For Azure AI Foundry:');
    console.log('export AZURE_AI_FOUNDRY_API_KEY="your-key-here"');
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'quick':
      await quickSetup(args.slice(1));
      break;
    case 'show':
      showConfig();
      break;
    case 'env':
      printEnv();
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(`
Crush Offline Setup

Usage:
  crush-setup              Run interactive setup wizard
  crush-setup quick <type> <endpoint> [deployment]
                           Quick non-interactive setup
  crush-setup show         Show current configuration
  crush-setup env          Print environment variables for shell
  crush-setup help         Show this help

Provider types for quick setup:
  azure-openai    Azure OpenAI Service
  azure-foundry   Azure AI Foundry (recommended)
  openai-compat   Any OpenAI-compatible API
  ollama          Local Ollama instance

Examples:
  crush-setup quick azure-foundry https://my-ai.azure.com/ gpt-4
  crush-setup quick ollama http://localhost:11434/v1/ llama3:70b
`);
      break;
    default:
      const wizard = new SetupWizard();
      await wizard.run();
  }
}

main().catch(console.error);
