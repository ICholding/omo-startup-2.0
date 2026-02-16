/**
 * Unified Messaging Service
 * Integrates OpenClaw directly for WhatsApp and other channels
 */

const OpenClawIntegration = require('./openclaw-integration');

class MessagingService {
  constructor(app) {
    this.app = app;
    this.openclaw = null;
    this.isInitialized = false;
  }

  /**
   * Initialize messaging service with OpenClaw
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('[MessagingService] Initializing...');
    
    // Initialize OpenClaw
    this.openclaw = new OpenClawIntegration({
      gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN,
      gatewayPort: process.env.OPENCLAW_GATEWAY_PORT || 18789,
      dataDir: process.env.OPENCLAW_DATA_DIR || './.openclaw',
      autoStart: true
    });
    
    await this.openclaw.initialize();
    
    // Register message handler
    this.openclaw.onMessage((message) => {
      this.handleIncomingMessage(message);
    });
    
    this.isInitialized = true;
    console.log('[MessagingService] Ready');
  }

  /**
   * Handle incoming message from any channel
   */
  async handleIncomingMessage(message) {
    const { channel, from, message: content, timestamp, metadata } = message;
    
    console.log(`[MessagingService] [${channel}] ${from}: ${content}`);
    
    try {
      // Store in database
      const Message = this.app.get('models').Message;
      const User = this.app.get('models').User;
      
      // Find or create user
      let user = await User.findOne({ 
        where: { 
          phoneNumber: from,
          platform: channel 
        } 
      });
      
      if (!user) {
        user = await User.create({
          phoneNumber: from,
          platform: channel,
          externalId: from,
          source: 'whatsapp'
        });
      }
      
      // Store message
      await Message.create({
        userId: user.id,
        platform: channel,
        phoneNumber: from,
        content: content,
        direction: 'incoming',
        timestamp: new Date(timestamp),
        metadata: metadata || {}
      });
      
      // Process with AI if auto-reply is enabled
      if (process.env.AUTO_REPLY_ENABLED === 'true') {
        await this.processAIReply(user, content, channel, from);
      }
      
    } catch (error) {
      console.error('[MessagingService] Error handling message:', error);
    }
  }

  /**
   * Process AI reply
   */
  async processAIReply(user, message, channel, from) {
    try {
      // Use your existing AI runtime
      const runtime = this.app.get('agentRuntime');
      
      const result = await runtime.execute({
        message: message,
        sessionId: `whatsapp-${from}`,
        context: await this.getConversationHistory(from)
      });
      
      // Send reply back
      if (result && result.response) {
        await this.sendMessage(channel, from, result.response);
      }
    } catch (error) {
      console.error('[MessagingService] AI reply error:', error);
    }
  }

  /**
   * Send message to any channel
   */
  async sendMessage(channel, to, message) {
    if (!this.isInitialized) {
      throw new Error('MessagingService not initialized');
    }
    
    switch (channel) {
      case 'whatsapp':
        return await this.openclaw.sendWhatsAppMessage(to, message);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(phoneNumber, limit = 10) {
    const Message = this.app.get('models').Message;
    
    const messages = await Message.findAll({
      where: { phoneNumber },
      order: [['createdAt', 'DESC']],
      limit: limit
    });
    
    return messages.reverse().map(m => ({
      role: m.direction === 'incoming' ? 'user' : 'assistant',
      content: m.content
    }));
  }

  /**
   * Get service status
   */
  async getStatus() {
    if (!this.openclaw) {
      return { initialized: false };
    }
    
    const openclawStatus = await this.openclaw.getStatus();
    
    return {
      initialized: this.isInitialized,
      openclaw: openclawStatus
    };
  }
}

module.exports = MessagingService;
