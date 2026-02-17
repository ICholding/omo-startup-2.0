#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');

const sourceRoots = ['backend'];
const ignoredPathFragments = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.git${path.sep}`
];

const diffMarkerPattern = /^(diff --git |@@ |\+\+\+ |--- )/m;
const conflictPattern = /^(<<<<<<<|=======|>>>>>>>)/m;

function collectSourceFiles(startDir) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);

    if (ignoredPathFragments.some((fragment) => fullPath.includes(fragment))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (!entry.isFile() || !fullPath.endsWith('.js')) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const filesToCheck = sourceRoots
  .map((root) => path.join(projectRoot, root))
  .filter((rootPath) => fs.existsSync(rootPath))
  .flatMap((rootPath) => collectSourceFiles(rootPath));

let hasError = false;

for (const fullPath of filesToCheck) {
  const relFile = path.relative(projectRoot, fullPath);

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
