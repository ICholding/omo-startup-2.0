/**
 * OpenClaw Direct Integration
 * Embedded OpenClaw client for omo-startup backend
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class OpenClawIntegration {
  constructor(config = {}) {
    this.config = {
      gatewayToken: config.gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN,
      gatewayPort: config.gatewayPort || 18789,
      dataDir: config.dataDir || path.join(process.cwd(), '.openclaw'),
      autoStart: config.autoStart !== false,
      channels: config.channels || ['whatsapp'],
      ...config
    };
    
    this.gatewayProcess = null;
    this.isRunning = false;
    this.messageHandlers = [];
  }

  /**
   * Initialize and optionally start OpenClaw gateway
   */
  async initialize() {
    console.log('[OpenClaw] Initializing integration...');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }
    
    // Check if OpenClaw is available
    const openclawPath = await this.findOpenClawPath();
    if (!openclawPath) {
      console.warn('[OpenClaw] OpenClaw not found. Installing...');
      await this.installOpenClaw();
    }
    
    if (this.config.autoStart) {
      await this.startGateway();
    }
    
    return this;
  }

  /**
   * Find OpenClaw installation path
   */
  async findOpenClawPath() {
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', 'openclaw'),
      path.join(process.cwd(), '..', 'openclaw'),
      path.join(process.cwd(), 'openclaw'),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'package.json'))) {
        return p;
      }
    }
    
    return null;
  }

  /**
   * Install OpenClaw via npm
   */
  async installOpenClaw() {
    return new Promise((resolve, reject) => {
      console.log('[OpenClaw] Installing from GitHub...');
      
      const install = spawn('npm', [
        'install',
        'github:ICholding/openclaw',
        '--save'
      ], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      install.on('close', (code) => {
        if (code === 0) {
          console.log('[OpenClaw] Installation complete');
          resolve();
        } else {
          reject(new Error(`Installation failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Start OpenClaw gateway process
   */
  async startGateway() {
    const openclawPath = await this.findOpenClawPath();
    if (!openclawPath) {
      throw new Error('OpenClaw not found after installation');
    }
    
    console.log('[OpenClaw] Starting gateway...');
    
    this.gatewayProcess = spawn('node', [
      'openclaw.mjs',
      'gateway',
      '--bind', '127.0.0.1',
      '--port', String(this.config.gatewayPort),
      '--allow-unconfigured'
    ], {
      cwd: openclawPath,
      env: {
        ...process.env,
        HOME: this.config.dataDir,
        NODE_ENV: 'production',
        OPENCLAW_GATEWAY_TOKEN: this.config.gatewayToken,
        OPENCLAW_PREFER_PNPM: '1'
      },
      detached: false
    });
    
    this.gatewayProcess.stdout.on('data', (data) => {
      console.log(`[OpenClaw Gateway] ${data.toString().trim()}`);
    });
    
    this.gatewayProcess.stderr.on('data', (data) => {
      console.error(`[OpenClaw Gateway Error] ${data.toString().trim()}`);
    });
    
    this.gatewayProcess.on('exit', (code) => {
      console.log(`[OpenClaw] Gateway exited with code ${code}`);
      this.isRunning = false;
    });
    
    // Wait for gateway to start
    await this.waitForGateway();
    this.isRunning = true;
    
    console.log(`[OpenClaw] Gateway running on port ${this.config.gatewayPort}`);
  }

  /**
   * Wait for gateway to be ready
   */
  async waitForGateway(timeout = 30000) {
    const axios = require('axios');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await axios.get(`http://127.0.0.1:${this.config.gatewayPort}/health`, {
          timeout: 1000
        });
        return;
      } catch (e) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    throw new Error('Gateway failed to start within timeout');
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsAppMessage(phoneNumber, message) {
    const axios = require('axios');
    
    try {
      const response = await axios.post(
        `http://127.0.0.1:${this.config.gatewayPort}/api/send`,
        {
          channel: 'whatsapp',
          to: phoneNumber,
          message: message
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.gatewayToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('[OpenClaw] Failed to send message:', error.message);
      throw error;
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
    
    // Start webhook listener if not already running
    if (!this.webhookServer) {
      this.startWebhookListener();
    }
  }

  /**
   * Start webhook listener for incoming messages
   */
  startWebhookListener() {
    const express = require('express');
    const app = express();
    app.use(express.json());
    
    app.post('/webhooks/openclaw', (req, res) => {
      const message = req.body;
      
      // Call all registered handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (e) {
          console.error('[OpenClaw] Handler error:', e);
        }
      });
      
      res.json({ status: 'ok' });
    });
    
    const port = process.env.OPENCLAW_WEBHOOK_PORT || 8081;
    this.webhookServer = app.listen(port, () => {
      console.log(`[OpenClaw] Webhook listener on port ${port}`);
    });
  }

  /**
   * Configure WhatsApp channel
   */
  async configureWhatsApp() {
    const axios = require('axios');
    
    try {
      // Enable WhatsApp channel
      await axios.post(
        `http://127.0.0.1:${this.config.gatewayPort}/api/channels/whatsapp/enable`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.config.gatewayToken}`
          }
        }
      );
      
      console.log('[OpenClaw] WhatsApp channel enabled');
      return true;
    } catch (error) {
      console.error('[OpenClaw] Failed to configure WhatsApp:', error.message);
      return false;
    }
  }

  /**
   * Get connection status
   */
  async getStatus() {
    const axios = require('axios');
    
    try {
      const response = await axios.get(
        `http://127.0.0.1:${this.config.gatewayPort}/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.gatewayToken}`
          },
          timeout: 5000
        }
      );
      
      return {
        connected: true,
        ...response.data
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Stop gateway
   */
  async stop() {
    if (this.gatewayProcess) {
      this.gatewayProcess.kill();
      this.gatewayProcess = null;
    }
    
    if (this.webhookServer) {
      this.webhookServer.close();
      this.webhookServer = null;
    }
    
    this.isRunning = false;
    console.log('[OpenClaw] Gateway stopped');
  }
}

module.exports = OpenClawIntegration;
