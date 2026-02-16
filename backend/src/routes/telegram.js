/**
 * Telegram Bot Integration for OpenClaw
 * Fast webhook-based messaging with agent connection polling
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
// OpenClaw service URL (new name for clawbot)
const CLAWBOT_URL = process.env.OPENCLAW_API_URL || process.env.CLAWBOT_API_URL || process.env.MOLTBOT_URL || 'https://omo-startup-openclaw-hbdn.onrender.com';
const CLAWBOT_KEY = process.env.CLAWBOT_API_KEY || process.env.API_KEY;

// Agent connection state
let agentState = {
  connected: false,
  lastCheck: 0,
  status: 'unknown'
};

/**
 * Poll agent connection status
 */
async function pollAgentConnection() {
  try {
    const response = await axios.get(`${CLAWBOT_URL}/health`, {
      timeout: 5000
    });
    
    agentState.connected = response.data?.healthy || false;
    agentState.status = response.data?.status || 'unknown';
    agentState.lastCheck = Date.now();
    
    return agentState.connected;
  } catch (error) {
    agentState.connected = false;
    agentState.status = 'disconnected';
    agentState.lastCheck = Date.now();
    console.error('[Telegram] Agent polling failed:', error.message);
    return false;
  }
}

// Poll every 30 seconds
setInterval(pollAgentConnection, 30000);

// Initial poll
pollAgentConnection();
// Access control disabled - bot is open to all users
// To restrict access, set TELEGRAM_ALLOWED_CHAT_IDS in environment
const ALLOWED_CHAT_IDS = [];

/**
 * Call Clawbot API with user message
 */
async function callClawbot(userText, chatId, username = 'telegram_user') {
  if (!CLAWBOT_URL) {
    return `Clawbot not configured yet. You said: "${userText}"`;
  }

  try {
    const headers = {};
    if (CLAWBOT_KEY) {
      headers.Authorization = `Bearer ${CLAWBOT_KEY}`;
    }

    const chatEndpoint = CLAWBOT_URL.endsWith('/api/chat/message') ? CLAWBOT_URL : `${CLAWBOT_URL}/api/chat/message`;
    
    const res = await axios.post(
      chatEndpoint,
      {
        message: userText,
        sessionId: `telegram_${chatId}`,
        from: String(chatId),
        username,
        channel: 'telegram',
        timestamp: new Date().toISOString()
      },
      {
        headers,
        timeout: parseInt(process.env.CLAWBOT_TIMEOUT) || 300000
      }
    );

    // Extract response from various formats
    const data = res.data;
    if (typeof data === 'string') return data;
    if (data?.message) return data.message;
    if (data?.reply) return data.reply;
    if (data?.response) return data.response;
    if (data?.content) return data.content;
    if (data?.text) return data.text;
    
    console.warn('[Telegram] Unexpected clawbot response format:', data);
    return '⚠️ I hit a temporary response formatting issue. Please try again.';
  } catch (error) {
    console.error('[Telegram] Clawbot call failed:', error.message);
    return '⚠️ The AI service is temporarily unavailable. Please try again.';
  }
}

/**
 * Send message to Telegram chat
 */
async function sendTelegramMessage(chatId, text) {
  if (!TOKEN) {
    console.error('[Telegram] No bot token configured');
    return;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: text.slice(0, 4096), // Telegram max message length
        parse_mode: 'HTML'
      },
      { timeout: 30000 }
    );
  } catch (error) {
    console.error('[Telegram] Send message failed:', error.message);
    throw error;
  }
}

/**
 * Webhook handler for Telegram bot
 */
router.post('/webhook', async (req, res) => {
  try {
    // Optional secret check (recommended for security)
    if (SECRET && req.headers['x-telegram-bot-api-secret-token'] !== SECRET) {
      console.warn('[Telegram] Unauthorized webhook attempt');
      return res.sendStatus(401);
    }

    // ACK fast to Telegram
    res.sendStatus(200);

    const msg = req.body?.message;
    if (!msg?.chat?.id) {
      console.log('[Telegram] No valid message in webhook');
      return;
    }

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const username = msg.from?.username || msg.from?.first_name || 'user';

    // Access control (disabled by default - open to all)
    // To enable: Set TELEGRAM_ALLOWED_CHAT_IDS env var with comma-separated chat IDs
    if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(String(chatId))) {
      console.log(`[Telegram] Chat ${chatId} not in allowed list`);
      await sendTelegramMessage(chatId, 'This bot is private. Access denied.');
      return;
    }

    // Handle commands
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase();
      
      switch (command) {
        case '/start':
          await sendTelegramMessage(chatId, 
            `👋 Hello ${username}! I'm your Clawbot assistant.\n\n` +
            `Send me any message and I'll help you automate tasks, ` +
            `run commands, or answer questions.`
          );
          return;
          
        case '/help':
          await sendTelegramMessage(chatId,
            `🤖 <b>Clawbot Commands</b>\n\n` +
            `/start - Start the bot\n` +
            `/help - Show this help\n` +
            `/status - Check bot status\n\n` +
            `Just send a message to chat with Clawbot!`
          );
          return;
          
        case '/status':
          const status = CLAWBOT_URL ? '✅ Online' : '⚠️ Not configured';
          await sendTelegramMessage(chatId, 
            `<b>Status:</b> ${status}\n` +
            `<b>Provider:</b> ${process.env.AGENT_PROVIDER || 'clawbot'}\n` +
            `<b>Uptime:</b> ${process.uptime()}s`
          );
          return;
      }
    }

    // Ignore empty messages
    if (!text.trim()) {
      await sendTelegramMessage(chatId, 'Send a text message and I\'ll respond.');
      return;
    }

    console.log(`[Telegram] Message from ${username} (${chatId}): ${text.slice(0, 50)}...`);

    // Call Clawbot and send reply
    const reply = await callClawbot(text, chatId, username);
    await sendTelegramMessage(chatId, reply);

  } catch (error) {
    console.error('[Telegram] Webhook error:', error.message);
    // Don't send error to user on webhook failures to avoid loops
  }
});

/**
 * Health check endpoint
 */
router.get('/status', (req, res) => {
  res.json({
    enabled: !!TOKEN,
    configured: !!CLAWBOT_URL,
    agent: {
      connected: agentState.connected,
      status: agentState.status,
      lastCheck: agentState.lastCheck,
      url: CLAWBOT_URL
    },
    allowedChats: ALLOWED_CHAT_IDS.length
  });
});

/**
 * Set webhook manually (for one-time setup)
 */
router.post('/set-webhook', async (req, res) => {
  if (!TOKEN) {
    return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required in body' });
  }

  try {
    const result = await axios.post(
      `https://api.telegram.org/bot${TOKEN}/setWebhook`,
      {
        url,
        secret_token: SECRET,
        allowed_updates: ['message']
      }
    );

    res.json({
      success: result.data?.ok,
      result: result.data?.result,
      description: result.data?.description
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      response: error.response?.data
    });
  }
});

/**
 * Get webhook info
 */
router.get('/webhook-info', async (req, res) => {
  if (!TOKEN) {
    return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  try {
    const result = await axios.get(
      `https://api.telegram.org/bot${TOKEN}/getWebhookInfo`
    );
    res.json(result.data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      response: error.response?.data
    });
  }
});

/**
 * Delete webhook (for cleanup)
 */
router.post('/delete-webhook', async (req, res) => {
  if (!TOKEN) {
    return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  try {
    const result = await axios.post(
      `https://api.telegram.org/bot${TOKEN}/deleteWebhook`
    );
    res.json(result.data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      response: error.response?.data
    });
  }
});

module.exports = router;
