/**
 * WhatsApp Webhook Routes
 * Handles incoming messages from WhatsApp ClawBot
 */

const express = require('express');
const router = express.Router();

// Webhook secret from environment
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';

/**
 * Verify webhook signature
 */
const verifyWebhook = (req, res, next) => {
  const secret = req.headers['x-webhook-secret'];
  
  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

/**
 * POST /api/whatsapp/webhook
 * Receive messages from WhatsApp ClawBot
 */
router.post('/webhook', verifyWebhook, async (req, res) => {
  try {
    const { platform, externalId, phoneNumber, message, timestamp, metadata } = req.body;
    
    console.log(`[WhatsApp] ${phoneNumber}: ${message}`);
    
    // Store message in database
    const Message = req.app.get('models').Message;
    const User = req.app.get('models').User;
    
    // Find or create user
    let user = await User.findOne({ where: { phoneNumber } });
    
    if (!user) {
      user = await User.create({
        phoneNumber,
        platform: 'whatsapp',
        externalId,
        createdAt: new Date()
      });
    }
    
    // Store message
    const newMessage = await Message.create({
      userId: user.id,
      platform: 'whatsapp',
      phoneNumber,
      content: message,
      direction: 'incoming',
      timestamp: new Date(timestamp),
      metadata: metadata || {}
    });
    
    // Process with AI if needed
    let reply = null;
    if (shouldAutoReply(message)) {
      reply = await generateAIResponse(message, user);
      
      // Send reply back through WhatsApp
      await sendWhatsAppReply(phoneNumber, reply, req.app);
    }
    
    res.json({ 
      status: 'ok', 
      messageId: newMessage.id,
      reply: reply 
    });
    
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

/**
 * GET /api/whatsapp/messages/:phoneNumber
 * Get message history for a phone number
 */
router.get('/messages/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const Message = req.app.get('models').Message;
    
    const messages = await Message.findAll({
      where: { phoneNumber },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/send
 * Send message via WhatsApp
 */
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        error: 'phoneNumber and message are required' 
      });
    }
    
    // Store outgoing message
    const Message = req.app.get('models').Message;
    await Message.create({
      phoneNumber,
      content: message,
      platform: 'whatsapp',
      direction: 'outgoing',
      timestamp: new Date()
    });
    
    // Send via WhatsApp bridge
    const result = await sendWhatsAppReply(phoneNumber, message, req.app);
    
    res.json({ status: 'ok', result });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Determine if message should get auto-reply
 */
function shouldAutoReply(message) {
  const triggers = ['help', 'support', 'question', 'how', 'what', 'why'];
  const lowerMessage = message.toLowerCase();
  return triggers.some(trigger => lowerMessage.includes(trigger));
}

/**
 * Generate AI response
 */
async function generateAIResponse(message, user) {
  // Simple auto-replies for now
  const responses = {
    'help': 'How can I help you today? You can ask about:\n- Our services\n- Pricing\n- Support',
    'hello': `Hello! Welcome to our service. How can I assist you?`,
    'hi': `Hi there! 👋 How can I help you today?`
  };
  
  const lowerMessage = message.toLowerCase();
  
  for (const [key, response] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }
  
  return null;
}

/**
 * Send reply via WhatsApp bridge
 */
async function sendWhatsAppReply(phoneNumber, message, app) {
  const axios = require('axios');
  
  const bridgeUrl = process.env.OPENCLAW_BRIDGE_URL
    || process.env.WHATSAPP_BRIDGE_URL
    || 'http://openclaw-bridge:8081';
  
  try {
    const response = await axios.post(
      `${bridgeUrl}/api/send`,
      { phoneNumber, message },
      { timeout: 10000 }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to send WhatsApp reply:', error.message);
    throw error;
  }
}

module.exports = router;
