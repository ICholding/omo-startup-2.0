/**
 * Enhanced Telegram Bot with Autonomous Agent
 * Removes all limitations - persistent memory, code execution, self-modification
 */

const express = require('express');
const TelegramAutonomousBridge = require('../../../agent/telegram-autonomous-bridge');

const router = express.Router();

// Initialize the autonomous bridge
const autonomousBridge = new TelegramAutonomousBridge();

// Initialize on startup
autonomousBridge.initialize().catch(console.error);

// Bot configuration
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// Access control (optional)
const ALLOWED_CHAT_IDS = process.env.TELEGRAM_ALLOWED_CHAT_IDS 
  ? process.env.TELEGRAM_ALLOWED_CHAT_IDS.split(',').map(id => id.trim())
  : [];

/**
 * Webhook handler for Telegram
 * POST /webhook/telegram/:secret
 */
router.post('/webhook/telegram/:secret?', async (req, res) => {
  // Validate secret if configured
  if (WEBHOOK_SECRET && req.params.secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Invalid webhook secret' });
  }

  const update = req.body;
  
  if (!update.message && !update.callback_query) {
    return res.sendStatus(200); // Acknowledge but ignore
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const userId = message?.from?.id;
  const username = message?.from?.username || message?.from?.first_name || 'user';
  const text = message?.text || '';

  // Check access control
  if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(String(chatId))) {
    await sendMessage(chatId, "⛔ Sorry, you're not authorized to use this bot.");
    return res.sendStatus(200);
  }

  try {
    // Handle commands
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const command = parts[0];
      const args = parts.slice(1);
      
      const response = await autonomousBridge.handleCommand(userId, command, args);
      await sendMessage(chatId, response.text, response.parse_mode);
      
      return res.sendStatus(200);
    }

    // Process message through autonomous bridge
    const response = await autonomousBridge.handleMessage(userId, text);
    await sendMessage(chatId, response.text, response.parse_mode);

    res.sendStatus(200);
  } catch (error) {
    console.error('[Telegram Autonomous] Error:', error);
    await sendMessage(chatId, `❌ Error: ${error.message}`);
    res.sendStatus(500);
  }
});

/**
 * Send message to Telegram chat
 */
async function sendMessage(chatId, text, parseMode = null) {
  if (!TOKEN) {
    console.error('[Telegram] No bot token configured');
    return;
  }

  try {
    const axios = require('axios');
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    
    const body = {
      chat_id: chatId,
      text: text.substring(0, 4096), // Telegram max message length
      parse_mode: parseMode
    };

    await axios.post(url, body);
  } catch (error) {
    console.error('[Telegram] Send message failed:', error.message);
  }
}

/**
 * Get bot info
 * GET /api/telegram/info
 */
router.get('/info', async (req, res) => {
  if (!TOKEN) {
    return res.status(503).json({ error: 'Telegram bot not configured' });
  }

  try {
    const axios = require('axios');
    const { data } = await axios.get(`https://api.telegram.org/bot${TOKEN}/getMe`);
    
    res.json({
      bot: data.result,
      autonomous: true,
      features: [
        'persistent_memory',
        'code_execution',
        'command_execution',
        'self_modification',
        'goal_management',
        'autonomous_tasks'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get agent status
 * GET /api/telegram/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await autonomousBridge.agent.getStatus();
    res.json({
      autonomous: true,
      initialized: autonomousBridge.initialized,
      ...status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Set webhook
 * POST /api/telegram/webhook
 */
router.post('/webhook', async (req, res) => {
  if (!TOKEN) {
    return res.status(503).json({ error: 'Telegram bot not configured' });
  }

  const { url } = req.body;
  
  try {
    const axios = require('axios');
    const webhookUrl = `${url}/webhook/telegram/${WEBHOOK_SECRET || ''}`;
    
    const { data } = await axios.post(
      `https://api.telegram.org/bot${TOKEN}/setWebhook`,
      { url: webhookUrl }
    );
    
    res.json({ success: data.ok, result: data.result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete webhook
 * DELETE /api/telegram/webhook
 */
router.delete('/webhook', async (req, res) => {
  if (!TOKEN) {
    return res.status(503).json({ error: 'Telegram bot not configured' });
  }

  try {
    const axios = require('axios');
    const { data } = await axios.post(
      `https://api.telegram.org/bot${TOKEN}/deleteWebhook`
    );
    
    res.json({ success: data.ok, result: data.result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send message via API
 * POST /api/telegram/send
 */
router.post('/send', async (req, res) => {
  const { chat_id, text, parse_mode } = req.body;
  
  if (!chat_id || !text) {
    return res.status(400).json({ error: 'chat_id and text required' });
  }

  try {
    await sendMessage(chat_id, text, parse_mode);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
