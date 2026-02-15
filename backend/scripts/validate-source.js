#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Resolve paths relative to project root (where this script is: backend/scripts/)
const projectRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.resolve(__dirname, '..');

const filesToCheck = [
  'backend/socket-handler.js',
  'backend/server.js',
  'backend/agent-core/agent-orchestrator.js'
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
  } catch (err) {
    console.error(`✗ ${relFile} - Error: ${err.message}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log('\nSource validation passed (no patch/conflict markers, syntax OK).');
