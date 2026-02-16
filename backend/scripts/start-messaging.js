#!/usr/bin/env node
/**
 * Start Messaging Service Standalone
 * For testing OpenClaw integration without full server
 */

const MessagingService = require('../lib/messaging-service');

const mockApp = {
  get: (key) => {
    if (key === 'models') {
      return {
        Message: {
          findAll: async () => [],
          create: async (data) => ({ id: 'msg-' + Date.now(), ...data })
        },
        User: {
          findOne: async () => null,
          create: async (data) => ({ id: 'user-' + Date.now(), ...data })
        }
      };
    }
    if (key === 'agentRuntime') {
      return {
        execute: async ({ message }) => ({
          response: `AI Response to: "${message}"`
        })
      };
    }
    return null;
  },
  set: () => {}
};

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     WhatsApp Messaging Service (OpenClaw)                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  
  const messaging = new MessagingService(mockApp);
  
  try {
    await messaging.initialize();
    console.log('✓ Service started successfully!');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down...');
      if (messaging.openclaw) {
        await messaging.openclaw.stop();
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('✗ Failed to start:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
