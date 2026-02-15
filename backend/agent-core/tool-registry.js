/**
 * HackerAI Tool Registry
 * Test - Hack - Learn - Secure
 */

const dns = require('dns').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Tool registry storing all available security tools
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  /**
   * Register a tool
   */
  register(name, tool) {
    this.tools.set(name, tool);
    console.log(`[ToolRegistry] Registered: ${name}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * List all available tools
   */
  listTools() {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      category: tool.category,
      risk: tool.risk
    }));
  }

  /**
   * Register default security tools
   */
  registerDefaultTools() {
    // Reconnaissance Tools
    this.register('dns_enum', {
      description: 'Enumerate DNS records',
      category: 'recon',
      risk: 'low',
      execute: async (params) => {
        const { domain, recordTypes = ['A', 'MX', 'NS'] } = params;
        const results = {};
        
        for (const type of recordTypes) {
          try {
            if (type === 'A') {
              results.A = await dns.resolve4(domain);
            } else if (type === 'MX') {
              results.MX = await dns.resolveMx(domain);
            } else if (type === 'NS') {
              results.NS = await dns.resolveNs(domain);
            }
          } catch (err) {
            results[type] = { error: err.message };
          }
        }
        
        return { domain, records: results };
      }
    });

    this.register('whois_lookup', {
      description: 'Lookup domain registration info',
      category: 'recon',
      risk: 'low',
      execute: async (params) => {
        const { domain } = params;
        try {
          const { stdout } = await execPromise(`whois ${domain}`, { timeout: 10000 });
          return { domain, data: stdout };
        } catch (err) {
          return { domain, error: err.message, partial: err.stdout };
        }
      }
    });

    // Scanning Tools
    this.register('port_scan', {
      description: 'Scan for open ports',
      category: 'scan',
      risk: 'medium',
      execute: async (params) => {
        const { target, ports = [80, 443, 22, 3306] } = params;
        const openPorts = [];
        
        for (const port of ports) {
          try {
            const { stdout } = await execPromise(
              `nc -zv -w 2 ${target} ${port} 2>&1 || true`,
              { timeout: 5000 }
            );
            
            if (stdout.includes('succeeded') || stdout.includes('open')) {
              openPorts.push({ port, state: 'open' });
            }
          } catch (err) {
            // Port likely closed
          }
        }
        
        return { target, openPorts, scanned: ports.length };
      }
    });

    this.register('service_enum', {
      description: 'Enumerate service versions',
      category: 'scan',
      risk: 'medium',
      execute: async (params) => {
        const { target, port } = params;
        
        try {
          const { stdout } = await execPromise(
            `nc -w 3 ${target} ${port} < /dev/null || true`,
            { timeout: 5000 }
          );
          
          return { target, port, banner: stdout || null };
        } catch (err) {
          return { target, port, error: err.message };
        }
      }
    });

    // Exploitation Tools (Safe testing only)
    this.register('check_headers', {
      description: 'Check HTTP security headers',
      category: 'exploit',
      risk: 'low',
      execute: async (params) => {
        const { url } = params;
        
        try {
          const { stdout } = await execPromise(
            `curl -sI "${url}"`,
            { timeout: 10000 }
          );
          
          const headers = stdout.split('\n').reduce((acc, line) => {
            const [key, ...value] = line.split(':');
            if (key && value.length) {
              acc[key.trim().toLowerCase()] = value.join(':').trim();
            }
            return acc;
          }, {});
          
          const securityHeaders = [
            'strict-transport-security',
            'content-security-policy',
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection'
          ];
          
          const missing = securityHeaders.filter(h => !headers[h]);
          
          return {
            url,
            headers,
            missingSecurityHeaders: missing,
            score: ((securityHeaders.length - missing.length) / securityHeaders.length) * 100
          };
        } catch (err) {
          return { url, error: err.message };
        }
      }
    });

    this.register('ssl_check', {
      description: 'Check SSL/TLS configuration',
      category: 'exploit',
      risk: 'low',
      execute: async (params) => {
        const { domain } = params;
        
        try {
          const { stdout } = await execPromise(
            `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -dates -subject`,
            { timeout: 10000 }
          );
          
          const lines = stdout.split('\n');
          const info = {};
          
          lines.forEach(line => {
            if (line.includes('notBefore=')) {
              info.validFrom = line.split('=')[1];
            } else if (line.includes('notAfter=')) {
              info.validUntil = line.split('=')[1];
            } else if (line.includes('subject=')) {
              info.subject = line.split('=')[1];
            }
          });
          
          return { domain, ssl: info };
        } catch (err) {
          return { domain, error: err.message };
        }
      }
    });

    // Analysis Tools
    this.register('analyze_findings', {
      description: 'Analyze and correlate findings',
      category: 'learn',
      risk: 'low',
      execute: async (params) => {
        const { findings } = params;
        
        const analysis = {
          totalFindings: findings.length,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          patterns: [],
          recommendations: []
        };
        
        findings.forEach(f => {
          const sev = f.severity || 'info';
          analysis.bySeverity[sev]++;
        });
        
        return analysis;
      }
    });

    // Remediation Tools
    this.register('generate_remediation', {
      description: 'Generate remediation steps',
      category: 'secure',
      risk: 'low',
      execute: async (params) => {
        const { findings } = params;
        
        const remediations = findings.map(f => ({
          findingId: f.id,
          steps: [
            `Review ${f.type} vulnerability`,
            'Apply vendor patch if available',
            'Implement compensating controls',
            'Verify fix with re-scan'
          ],
          priority: f.severity || 'medium'
        }));
        
        return { remediations, count: remediations.length };
      }
    });

    console.log(`[ToolRegistry] ${this.tools.size} tools registered`);
  }
}

// Singleton instance
const registry = new ToolRegistry();

module.exports = registry;
