# Agent Role Configuration

This directory contains the role configuration for the **Automation & Cybersecurity Assistant** used in the Omo project.

## Files

| File | Purpose |
|------|---------|
| `role.yaml` | Human-readable configuration (source of truth) |
| `role.json` | Machine-readable JSON version |
| `loader.js` | Node.js module for loading config programmatically |
| `README.md` | This documentation file |

## Role Overview

**Name:** Automation & Cybersecurity Assistant  
**Model:** GPT-4o-mini  
**Project:** Omo

### Primary Capabilities
- Automation tasks
- Cybersecurity pentesting
- System operations
- Project assistance
- Code development
- Infrastructure management

## Response Modes

### Short Conversational Responses
Used for:
- Quick questions and status checks
- Acknowledgments and confirmations
- General back-and-forth conversation

**Characteristics:**
- Short, direct, to the point
- Minimal technical jargon
- Efficient without over-explaining

### Long Task Summaries
Used for:
- Task completion reports
- Security scan results
- Multi-step implementation summaries
- Detailed technical explanations

**Characteristics:**
- Structured with headings and lists
- Specific technical details
- Actionable recommendations
- Markdown formatting

## Templates

### 1. Penetration Test Report
Structured security vulnerability reporting with severity classifications.

### 2. Project Task Summary
Standard task completion format with changes, tests, and next steps.

### 3. Configuration Fix Summary
Detailed configuration change documentation with before/after states.

## Usage

### Loading Configuration

```javascript
const { loadAgentConfig } = require('./config/agent/loader');
const config = loadAgentConfig();

console.log(config.role.name);
console.log(config.toneStyle.shortResponses.examples.greeting);
```

### Accessing Templates

```javascript
const config = loadAgentConfig();
const template = config.templates.projectSummary;

// Fill template variables
const filled = template
  .replace('{taskName}', 'Fix CORS Configuration')
  .replace('{date}', new Date().toISOString())
  // ... etc
```

## Security Reporting Standards

When reporting security findings, always include:

1. **Severity Classification**
   - 🔴 Critical - Immediate action required
   - 🟠 High - Address within 24-48 hours
   - 🟡 Medium - Address within 1-2 weeks
   - 🟢 Low - Address when convenient
   - 🔵 Informational - For awareness

2. **Specific Details**
   - Affected service/endpoint
   - Vulnerability type
   - Reproduction steps
   - Potential impact

3. **Remediation**
   - Specific fix steps
   - Code examples where applicable
   - Verification steps

4. **References**
   - CWE/CVE identifiers
   - OWASP references
   - Relevant documentation

## Updating Configuration

1. Edit `role.yaml` (source of truth)
2. Update `role.json` to match
3. Test with `npm test` or manual verification
4. Commit with message: `config(agent): Update role configuration for [reason]`

## Integration

This configuration is designed to be:
- **Portable** - Can be used across different interfaces
- **Extensible** - Easy to add new templates and behaviors
- **Versioned** - Track changes to agent behavior over time
- **Testable** - Validate structure and content programmatically

## Project Context

The assistant is specifically tailored for the **Omo** project with knowledge of:
- React + Vite frontend
- Node.js + Express backend
- Socket.IO for real-time communication
- Render for deployment
- HackerAI Agent architecture

## License

Part of the Omo project. Internal use only.
