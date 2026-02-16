#!/usr/bin/env node
/**
 * OMO Diagnostic Agent
 * Scans codebase for exact conflicts, bugs, and issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DiagnosticAgent {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.info = [];
  }

  log(type, message, details = {}) {
    const entry = { type, message, details, timestamp: new Date().toISOString() };
    if (type === 'error') this.issues.push(entry);
    else if (type === 'warning') this.warnings.push(entry);
    else this.info.push(entry);
    
    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${type.toUpperCase()}] ${message}`);
    if (details.file) console.log(`   File: ${details.file}`);
    if (details.line) console.log(`   Line: ${details.line}`);
    if (details.suggestion) console.log(`   Suggestion: ${details.suggestion}`);
    console.log('');
  }

  // Check for workflow file conflicts
  checkWorkflowConflicts() {
    console.log('\n🔍 Scanning GitHub Actions Workflows...\n');
    
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      this.log('error', 'Workflows directory not found', { file: workflowsDir });
      return;
    }

    const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    
    this.log('info', `Found ${files.length} workflow files`, { files });

    // Check for Dockerfile references
    files.forEach(file => {
      const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      
      // Check for Dockerfile.full usage (known issue)
      if (content.includes('Dockerfile.full')) {
        this.log('error', `Workflow uses broken Dockerfile.full`, {
          file: `.github/workflows/${file}`,
          issue: 'Dockerfile.full has assets build error due to .dockerignore excluding assets/',
          suggestion: 'Change to Dockerfile (simpler, working version)',
          fix: 'Replace "file: ./Dockerfile.full" with "file: ./Dockerfile"'
        });
      }

      // Check for secrets in if conditions (GitHub Actions limitation)
      if (content.includes('if:') && content.match(/secrets\.[A-Z_]+/)) {
        this.log('error', `Workflow has invalid secrets reference in 'if' condition`, {
          file: `.github/workflows/${file}`,
          issue: 'GitHub Actions does not allow secrets.XXX in if expressions',
          suggestion: 'Use env variables instead: env: { SECRET: ${{ secrets.XXX }} }, if: env.SECRET != \'\''
        });
      }

      // Check for missing context
      if (content.includes('context: ./') && content.includes('repository:')) {
        const hasCheckout = content.includes('actions/checkout');
        if (!hasCheckout) {
          this.log('warning', `Workflow may be missing checkout step for external repo`, {
            file: `.github/workflows/${file}`
          });
        }
      }
    });
  }

  // Check for Docker build issues
  checkDockerIssues() {
    console.log('\n🔍 Scanning Docker Configuration...\n');
    
    // Check for .dockerignore issues
    const dockerignorePath = path.join(process.cwd(), '.dockerignore');
    if (fs.existsSync(dockerignorePath)) {
      const content = fs.readFileSync(dockerignorePath, 'utf8');
      
      if (content.includes('assets/')) {
        this.log('warning', `.dockerignore excludes assets/ directory`, {
          file: '.dockerignore',
          issue: 'This causes Dockerfile.full builds to fail',
          suggestion: 'Remove "assets/" from .dockerignore if using Dockerfile.full'
        });
      }
    }

    // Check for Dockerfile conflicts
    const dockerfiles = ['Dockerfile', 'Dockerfile.full', 'Dockerfile.whatsapp'];
    const existing = dockerfiles.filter(f => fs.existsSync(f));
    
    if (existing.length > 1) {
      this.log('info', `Multiple Dockerfiles found: ${existing.join(', ')}`, {
        suggestion: 'Ensure workflows use the correct Dockerfile'
      });
    }
  }

  // Check for backend integration issues
  checkBackendIntegration() {
    console.log('\n🔍 Scanning Backend Integration...\n');
    
    const serverPath = path.join(process.cwd(), 'backend', 'server.js');
    if (fs.existsSync(serverPath)) {
      const content = fs.readFileSync(serverPath, 'utf8');
      
      // Check if WhatsApp routes are imported
      if (!content.includes('whatsapp')) {
        this.log('warning', `WhatsApp routes not found in server.js`, {
          file: 'backend/server.js',
          suggestion: 'Add: const whatsappRoutes = require(\'./src/routes/whatsapp\'); app.use(\'/api/whatsapp\', whatsappRoutes);'
        });
      } else {
        this.log('info', 'WhatsApp routes detected in server.js');
      }

      // Check for required middleware
      if (!content.includes('express.json()')) {
        this.log('error', `Missing express.json() middleware`, {
          file: 'backend/server.js',
          issue: 'Webhook endpoints will not parse JSON body'
        });
      }
    }

    // Check for required environment variables
    const envExample = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(envExample)) {
      const content = fs.readFileSync(envExample, 'utf8');
      
      const required = ['WEBHOOK_SECRET', 'WHATSAPP_BRIDGE_URL', 'OPENCLAW_GATEWAY_URL'];
      const missing = required.filter(v => !content.includes(v));
      
      if (missing.length > 0) {
        this.log('warning', `Missing recommended env vars in .env.example`, {
          missing,
          suggestion: `Add: ${missing.join(', ')}`
        });
      }
    }
  }

  // Check for database migration conflicts
  checkDatabaseMigrations() {
    console.log('\n🔍 Scanning Database Migrations...\n');
    
    const migrationsDir = path.join(process.cwd(), 'backend', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
      
      files.forEach(file => {
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // Check for common migration issues
        if (content.includes('addColumn') && !content.includes('removeColumn')) {
          this.log('warning', `Migration adds column but may not have down migration`, {
            file: `backend/migrations/${file}`,
            suggestion: 'Ensure down() method removes the column'
          });
        }
      });
      
      this.log('info', `Found ${files.length} migration files`);
    }
  }

  // Check for file conflicts
  checkFileConflicts() {
    console.log('\n🔍 Scanning for File Conflicts...\n');
    
    // Check for duplicate workflow names
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    if (fs.existsSync(workflowsDir)) {
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
      const names = new Set();
      
      files.forEach(file => {
        const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
        const match = content.match(/name:\s*(.+)/);
        if (match) {
          const name = match[1].trim();
          if (names.has(name)) {
            this.log('error', `Duplicate workflow name: "${name}"`, {
              file: `.github/workflows/${file}`,
              issue: 'GitHub Actions requires unique workflow names'
            });
          }
          names.add(name);
        }
      });
    }
  }

  // Check git status for conflicts
  checkGitStatus() {
    console.log('\n🔍 Checking Git Status...\n');
    
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (status.includes('UU')) {
        this.log('error', 'Unresolved merge conflicts detected', {
          files: status.split('\n').filter(l => l.startsWith('UU')).map(l => l.slice(3))
        });
      }
      
      if (status.includes('AA')) {
        this.log('error', 'Both sides added same file (conflict)', {
          files: status.split('\n').filter(l => l.startsWith('AA')).map(l => l.slice(3))
        });
      }
      
      const uncommitted = status.split('\n').filter(l => l.trim()).length;
      if (uncommitted > 0) {
        this.log('info', `${uncommitted} uncommitted changes`, {
          suggestion: 'Run: git add -A && git commit -m "your message"'
        });
      }
    } catch (e) {
      this.log('warning', 'Could not check git status', { error: e.message });
    }
  }

  // Run npm audit
  checkNpmSecurity() {
    console.log('\n🔍 Checking NPM Security...\n');
    
    const backendDir = path.join(process.cwd(), 'backend');
    if (fs.existsSync(path.join(backendDir, 'package.json'))) {
      try {
        const audit = execSync('npm audit --json', { 
          cwd: backendDir, 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        const result = JSON.parse(audit);
        const vulnerabilities = result.metadata?.vulnerabilities || {};
        const total = vulnerabilities.total || 0;
        
        if (total > 0) {
          this.log('warning', `Found ${total} npm vulnerabilities`, {
            details: vulnerabilities,
            fix: 'Run: npm audit fix'
          });
        } else {
          this.log('info', 'No npm vulnerabilities found');
        }
      } catch (e) {
        // npm audit returns non-zero exit code if vulnerabilities found
        if (e.stdout) {
          try {
            const result = JSON.parse(e.stdout);
            const vulns = result.metadata?.vulnerabilities;
            if (vulns && vulns.total > 0) {
              this.log('error', `Found ${vulns.total} npm vulnerabilities`, {
                critical: vulns.critical || 0,
                high: vulns.high || 0,
                moderate: vulns.moderate || 0,
                low: vulns.low || 0,
                fix: 'Run: npm audit fix'
              });
            }
          } catch {}
        }
      }
    }
  }

  // Generate report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n❌ ERRORS: ${this.issues.length}`);
    console.log(`⚠️ WARNINGS: ${this.warnings.length}`);
    console.log(`ℹ️ INFO: ${this.info.length}`);
    
    if (this.issues.length > 0) {
      console.log('\n' + '-'.repeat(60));
      console.log('🔴 CRITICAL ISSUES (Must Fix):');
      console.log('-'.repeat(60));
      this.issues.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.message}`);
        if (issue.details.file) console.log(`   Location: ${issue.details.file}`);
        if (issue.details.issue) console.log(`   Problem: ${issue.details.issue}`);
        if (issue.details.suggestion) console.log(`   Fix: ${issue.details.suggestion}`);
        if (issue.details.fix) console.log(`   Command: ${issue.details.fix}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n' + '-'.repeat(60));
      console.log('🟡 WARNINGS (Should Fix):');
      console.log('-'.repeat(60));
      this.warnings.forEach((warn, i) => {
        console.log(`\n${i + 1}. ${warn.message}`);
        if (warn.details.suggestion) console.log(`   Suggestion: ${warn.details.suggestion}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Save JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.issues.length,
        warnings: this.warnings.length,
        info: this.info.length
      },
      issues: this.issues,
      warnings: this.warnings,
      info: this.info
    };
    
    fs.writeFileSync('diagnostic-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Full report saved to: diagnostic-report.json');
    
    return this.issues.length === 0;
  }

  // Run all checks
  run() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     OMO STARTUP DIAGNOSTIC AGENT                         ║');
    console.log('║     Exact Conflict & Bug Scanner                         ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    
    this.checkWorkflowConflicts();
    this.checkDockerIssues();
    this.checkBackendIntegration();
    this.checkDatabaseMigrations();
    this.checkFileConflicts();
    this.checkGitStatus();
    this.checkNpmSecurity();
    
    const success = this.generateReport();
    
    process.exit(success ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new DiagnosticAgent();
  agent.run();
}

module.exports = DiagnosticAgent;
