#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');

function getTrackedBackendJsFiles() {
  const output = execSync('git ls-files "backend/**/*.js" "backend/*.js"', {
    cwd: projectRoot,
    encoding: 'utf8'
  });

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.includes('/node_modules/'));
}

const diffMarkerPattern = /^(diff --git |@@ |\+\+\+ |--- )/m;
const conflictPattern = /^(<<<<<<<|=======|>>>>>>>)/m;

let hasError = false;
const filesToCheck = getTrackedBackendJsFiles();

if (filesToCheck.length === 0) {
  console.error('✗ No backend JavaScript files found to validate.');
  process.exit(1);
}

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
