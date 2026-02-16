#!/usr/bin/env node
/**
 * Setup WhatsApp for OpenClaw
 * Run this to scan QR code and connect WhatsApp
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     WhatsApp Setup for OpenClaw                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
console.log('This will start the WhatsApp QR code scanner.');
console.log('Please scan the QR code with your WhatsApp app.');
console.log('');

// Find OpenClaw path
const possiblePaths = [
  path.join(__dirname, '..', 'node_modules', 'openclaw'),
  path.join(__dirname, '..', '..', 'openclaw'),
  path.join(__dirname, '..', 'openclaw'),
];

let openclawPath = null;
for (const p of possiblePaths) {
  try {
    const fs = require('fs');
    if (fs.existsSync(path.join(p, 'openclaw.mjs'))) {
      openclawPath = p;
      break;
    }
  } catch (e) {}
}

if (!openclawPath) {
  console.error('❌ OpenClaw not found!');
  console.log('');
  console.log('Please install OpenClaw first:');
  console.log('  npm run install:openclaw');
  console.log('');
  process.exit(1);
}

console.log(`Found OpenClaw at: ${openclawPath}`);
console.log('');

// Run OpenClaw channel login
const setup = spawn('node', [
  'openclaw.mjs',
  'channels',
  'login'
], {
  cwd: openclawPath,
  env: {
    ...process.env,
    HOME: process.env.OPENCLAW_DATA_DIR || path.join(__dirname, '..', '.openclaw'),
    OPENCLAW_GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN
  },
  stdio: 'inherit'
});

setup.on('exit', (code) => {
  console.log('');
  if (code === 0) {
    console.log('✅ WhatsApp setup complete!');
    console.log('');
    console.log('You can now start the messaging service:');
    console.log('  npm run messaging:start');
  } else {
    console.error('❌ Setup failed with code:', code);
  }
  console.log('');
});
