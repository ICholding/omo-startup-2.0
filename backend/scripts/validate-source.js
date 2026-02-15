#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');

const filesToCheck = [
  'backend/server.js',
  'backend/lib/runtime.js',
  'backend/lib/adapters/moltbot-adapter.js',
  'backend/lib/adapters/custom-agent-adapter.js',
  'backend/lib/agent-contract.js'
];

const diffMarkerPattern = /^(diff --git |@@ |\+\+\+ |--- )/m;
const conflictPattern = /^(<<<<<<<|=======|>>>>>>>)/m;

let hasError = false;

for (const relFile of filesToCheck) {
  const fullPath = path.join(projectRoot, relFile);

  try {
    const source = fs.readFileSync(fullPath, 'utf8');

    if (diffMarkerPattern.test(source) || conflictPattern.test(source)) {
      console.error(`✗ ${relFile} - Validation failed: patch/conflict markers found`);
      hasError = true;
      continue;
    }

    execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
    console.log(`✓ ${relFile} - OK`);
  } catch (error) {
    console.error(`✗ ${relFile} - Error: ${error.message}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log('\nSource validation passed (no patch/conflict markers, syntax OK).');
