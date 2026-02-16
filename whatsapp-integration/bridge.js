#!/usr/bin/env node
/**
 * WhatsApp ClawBot Bridge
 * Connects OpenClaw WhatsApp gateway to omo-startup backend
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 8081,
  OPENCLAW_GATEWAY_URL: process.env.OPENCLAW_GATEWAY_URL,
  OPENCLAW_GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN,
  OMO_BACKEND_URL: process.env.OMO_BACKEND_URL,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
};

// Validate config
if (!CONFIG.OPENCLAW_GATEWAY_URL) {
  console.error('ERROR: OPENCLAW_GATEWAY_URL is required');
  process.exit(1);
}

if (!CONFIG.OMO_BACKEND_URL) {
  console.error('ERROR: OMO_BACKEND_URL is required');
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'whatsapp-clawbot-bridge',
    timestamp: new Date().toISOString()
  });
});

// Webhook from OpenClaw (incoming WhatsApp messages)
app.post('/webhooks/openclaw', async (req, res) => {
  try {
    const { channel, from, message, timestamp, metadata } = req.body;
    
    console.log(`[${channel}] Message from ${from}: ${message}`);
    
    // Forward to omo-startup backend
    const backendResponse = await axios.post(
      `${CONFIG.OMO_BACKEND_URL}/api/whatsapp/webhook`,
      {
        platform: channel,
        externalId: from,
        phoneNumber: from,
        message: message,
        timestamp: timestamp,
        metadata: metadata || {}
      },
      {
        headers: {
          'X-Webhook-Secret': CONFIG.WEBHOOK_SECRET,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    // If backend wants to reply immediately
    if (backendResponse.data && backendResponse.data.reply) {
      await sendWhatsAppMessage(from, backendResponse.data.reply);
    }
    
    res.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Send message via OpenClaw
async function sendWhatsAppMessage(to, message) {
  try {
    const response = await axios.post(
      `${CONFIG.OPENCLAW_GATEWAY_URL}/api/send`,
      {
        channel: 'whatsapp',
        to: to,
        message: message
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.OPENCLAW_GATEWAY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log(`Message sent to ${to}: ${response.data.messageId || 'success'}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to send message to ${to}:`, error.message);
    throw error;
  }
}

// API endpoint for backend to send messages
app.post('/api/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        error: 'phoneNumber and message are required' 
      });
    }
    
    const result = await sendWhatsAppMessage(phoneNumber, message);
    res.json({ status: 'ok', result });
  } catch (error) {
    console.error('Error sending message:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Get OpenClaw connection status
app.get('/api/status', async (req, res) => {
  try {
    const response = await axios.get(
      `${CONFIG.OPENCLAW_GATEWAY_URL}/health`,
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.OPENCLAW_GATEWAY_TOKEN}`
        },
        timeout: 5000
      }
    );
    
    res.json({
      bridge: 'ok',
      openclaw: response.data,
      connected: true
    });
  } catch (error) {
    res.json({
      bridge: 'ok',
      openclaw: null,
      connected: false,
      error: error.message
    });
  }
});

// Start server
app.listen(CONFIG.PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        WhatsApp ClawBot Bridge Service                 ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Port:        ${CONFIG.PORT}`);
  console.log(`║  OpenClaw:    ${CONFIG.OPENCLAW_GATEWAY_URL}`);
  console.log(`║  Backend:     ${CONFIG.OMO_BACKEND_URL}`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Ready to bridge WhatsApp messages!');
});
