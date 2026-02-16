#!/usr/bin/env node
/**
 * Install OpenClaw into backend
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing OpenClaw integration...\n');

// Read current package.json
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Add OpenClaw dependency
console.log('Adding OpenClaw dependency...');
pkg.dependencies['openclaw'] = 'github:ICholding/openclaw';
pkg.dependencies['axios'] = '^1.6.0';

// Add scripts
pkg.scripts['messaging:start'] = 'node scripts/start-messaging.js';
pkg.scripts['whatsapp:setup'] = 'node scripts/setup-whatsapp.js';

// Write updated package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('✓ package.json updated\n');

// Create start messaging script
const startScript = `#!/usr/bin/env node
const MessagingService = require('../lib/messaging-service');

const app = {
  get: (key) => {
    // Mock app.get for standalone usage
    if (key === 'models') {
      return {
        Message: {
          findAll: async () => [],
          create: async (data) => ({ id: 'msg-1', ...data })
        },
        User: {
          findOne: async () => null,
          create: async (data) => ({ id: 'user-1', ...data })
        }
      };
    }
    if (key === 'agentRuntime') {
      return {
        execute: async ({ message }) => ({
          response: \`Received: \${message}\`
        })
      };
    }
    return null;
  }
};

async function main() {
  const messaging = new MessagingService(app);
  
  try {
    await messaging.initialize();
    console.log('Messaging service started!');
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\\nShutting down...');
      await messaging.openclaw.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

main();
`;

fs.writeFileSync(
  path.join(__dirname, 'start-messaging.js'),
  startScript
);

// Create WhatsApp setup script
const setupScript = `#!/usr/bin/env node
/**
 * Setup WhatsApp for OpenClaw
 * Run this after OpenClaw is installed
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Setting up WhatsApp...');
console.log('Scan the QR code with your WhatsApp app\\n');

const openclawPath = path.join(__dirname, '..', 'node_modules', 'openclaw');

const setup = spawn('node', [
  'openclaw.mjs',
  'channels',
  'login'
], {
  cwd: openclawPath,
  env: {
    ...process.env,
    HOME: process.env.OPENCLAW_DATA_DIR || './.openclaw'
  },
  stdio: 'inherit'
});

setup.on('exit', (code) => {
  if (code === 0) {
    console.log('\\n✓ WhatsApp setup complete!');
  } else {
    console.error('\\n✗ Setup failed');
  }
});
`;

fs.writeFileSync(
  path.join(__dirname, 'setup-whatsapp.js'),
  setupScript
);

console.log('✓ Helper scripts created:');
console.log('  - scripts/start-messaging.js');
console.log('  - scripts/setup-whatsapp.js\n');

console.log('Next steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run whatsapp:setup');
console.log('3. Run: npm run messaging:start');
console.log('');
console.log('Or integrate into server.js with:');
console.log('  const MessagingService = require(\"./lib/messaging-service\");');
console.log('  const messaging = new MessagingService(app);');
console.log('  await messaging.initialize();');
