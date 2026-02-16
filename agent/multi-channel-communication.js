/**
 * Multi-Channel Communication System
 * Supports Telegram, Slack, Email, and Webhooks
 * 
 * Features:
 * - Natural Language Processing for context-aware responses
 * - Real-time notifications
 * - Message queuing and retry logic
 * - Channel-specific formatting
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const VisualFeedback = require('./visual-feedback');

/**
 * Base Channel Interface
 */
class BaseChannel extends EventEmitter {
  constructor(name, config = {}) {
    super();
    this.name = name;
    this.config = config;
    this.connected = false;
    this.messageQueue = [];
  }

  async connect() {
    throw new Error('Must implement connect()');
  }

  async send(message, recipient) {
    throw new Error('Must implement send()');
  }

  async disconnect() {
    this.connected = false;
  }

  queueMessage(message, recipient) {
    this.messageQueue.push({
      id: crypto.randomBytes(8).toString('hex'),
      message,
      recipient,
      timestamp: Date.now(),
      attempts: 0
    });
  }

  async processQueue() {
    while (this.messageQueue.length > 0) {
      const item = this.messageQueue[0];
      
      try {
        await this.send(item.message, item.recipient);
        this.messageQueue.shift();
        this.emit('message:sent', item);
      } catch (error) {
        item.attempts++;
        
        if (item.attempts >= 3) {
          this.emit('message:failed', { item, error });
          this.messageQueue.shift();
        } else {
          // Retry after delay
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }
}

/**
 * Telegram Channel
 */
class TelegramChannel extends BaseChannel {
  constructor(config = {}) {
    super('telegram', config);
    this.bot = null;
    this.token = config.token || process.env.TELEGRAM_BOT_TOKEN;
  }

  async connect() {
    if (!this.token) {
      throw new Error('Telegram bot token not configured');
    }

    try {
      const TelegramBot = require('node-telegram-bot-api');
      this.bot = new TelegramBot(this.token, { polling: true });
      
      this.bot.on('message', (msg) => {
        this.emit('message:received', {
          channel: 'telegram',
          userId: msg.from.id,
          username: msg.from.username,
          text: msg.text,
          chatId: msg.chat.id,
          timestamp: Date.now()
        });
      });

      this.connected = true;
      console.log(VisualFeedback.success('Telegram channel connected'));
      
    } catch (error) {
      console.error(VisualFeedback.error('Failed to connect Telegram', error.message));
      throw error;
    }
  }

  async send(message, recipient) {
    if (!this.bot) return;

    const chatId = recipient.chatId || recipient;
    
    try {
      if (message.parse_mode === 'Markdown') {
        await this.bot.sendMessage(chatId, message.text, { parse_mode: 'Markdown' });
      } else if (message.parse_mode === 'HTML') {
        await this.bot.sendMessage(chatId, message.text, { parse_mode: 'HTML' });
      } else {
        await this.bot.sendMessage(chatId, message.text);
      }

      this.emit('message:sent', { channel: 'telegram', recipient, message });
      
    } catch (error) {
      this.emit('message:error', { channel: 'telegram', recipient, error });
      throw error;
    }
  }

  async sendFile(chatId, filePath, caption = '') {
    if (!this.bot) return;
    await this.bot.sendDocument(chatId, filePath, { caption });
  }
}

/**
 * Slack Channel
 */
class SlackChannel extends BaseChannel {
  constructor(config = {}) {
    super('slack', config);
    this.client = null;
    this.token = config.token || process.env.SLACK_BOT_TOKEN;
    this.signingSecret = config.signingSecret || process.env.SLACK_SIGNING_SECRET;
  }

  async connect() {
    if (!this.token) {
      console.log(VisualFeedback.warning('Slack token not configured'));
      return;
    }

    try {
      const { WebClient } = require('@slack/web-api');
      this.client = new WebClient(this.token);
      
      // Test connection
      const auth = await this.client.auth.test();
      console.log(VisualFeedback.success(`Slack connected as ${auth.user}`));
      
      this.connected = true;
      
    } catch (error) {
      console.error(VisualFeedback.error('Failed to connect Slack', error.message));
    }
  }

  async send(message, recipient) {
    if (!this.client) return;

    try {
      const channel = recipient.channel || recipient;
      
      await this.client.chat.postMessage({
        channel,
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments
      });

      this.emit('message:sent', { channel: 'slack', recipient, message });
      
    } catch (error) {
      this.emit('message:error', { channel: 'slack', recipient, error });
      throw error;
    }
  }

  async sendToThread(message, channel, threadTs) {
    if (!this.client) return;
    
    await this.client.chat.postMessage({
      channel,
      text: message,
      thread_ts: threadTs
    });
  }
}

/**
 * Email Channel
 */
class EmailChannel extends BaseChannel {
  constructor(config = {}) {
    super('email', config);
    this.transporter = null;
    this.config = {
      host: config.host || process.env.SMTP_HOST,
      port: config.port || process.env.SMTP_PORT || 587,
      secure: config.secure || false,
      auth: {
        user: config.user || process.env.SMTP_USER,
        pass: config.pass || process.env.SMTP_PASS
      }
    };
  }

  async connect() {
    if (!this.config.host) {
      console.log(VisualFeedback.warning('SMTP not configured'));
      return;
    }

    try {
      const nodemailer = require('nodemailer');
      this.transporter = nodemailer.createTransporter(this.config);
      
      // Verify connection
      await this.transporter.verify();
      console.log(VisualFeedback.success('Email channel connected'));
      
      this.connected = true;
      
    } catch (error) {
      console.error(VisualFeedback.error('Failed to connect Email', error.message));
    }
  }

  async send(message, recipient) {
    if (!this.transporter) return;

    try {
      const info = await this.transporter.sendMail({
        from: this.config.auth.user,
        to: recipient.email || recipient,
        subject: message.subject || 'ClawbotAgent Notification',
        text: message.text,
        html: message.html,
        attachments: message.attachments
      });

      this.emit('message:sent', { channel: 'email', recipient, messageId: info.messageId });
      
    } catch (error) {
      this.emit('message:error', { channel: 'email', recipient, error });
      throw error;
    }
  }
}

/**
 * Webhook Channel
 */
class WebhookChannel extends BaseChannel {
  constructor(config = {}) {
    super('webhook', config);
    this.webhooks = new Map();
  }

  async connect() {
    // Webhooks don't need persistent connection
    this.connected = true;
    console.log(VisualFeedback.success('Webhook channel ready'));
  }

  registerWebhook(name, url, options = {}) {
    this.webhooks.set(name, { url, options, registered: Date.now() });
    console.log(VisualFeedback.info(`Registered webhook: ${name}`));
  }

  async send(message, recipient) {
    const webhook = this.webhooks.get(recipient);
    if (!webhook) {
      throw new Error(`Webhook ${recipient} not found`);
    }

    try {
      const fetch = require('node-fetch');
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.options.headers
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      this.emit('message:sent', { channel: 'webhook', recipient, message });
      
    } catch (error) {
      this.emit('message:error', { channel: 'webhook', recipient, error });
      throw error;
    }
  }
}

/**
 * Natural Language Processing for Context-Aware Responses
 */
class NLPProcessor {
  constructor() {
    this.intents = new Map();
    this.contextMemory = new Map();
    this.initializeIntents();
  }

  initializeIntents() {
    // Define common intents
    this.intents.set('greeting', {
      patterns: ['hello', 'hi', 'hey', 'greetings'],
      responses: ['Hello! How can I assist you today?', 'Hi there! What can I do for you?']
    });

    this.intents.set('status', {
      patterns: ['status', 'how are you', 'what is your status'],
      responses: ['I am operational and ready to assist.', 'All systems are running smoothly.']
    });

    this.intents.set('help', {
      patterns: ['help', 'assist', 'support', 'what can you do'],
      responses: ['I can help with: task management, code execution, file operations, GitHub integration, and more.']
    });

    this.intents.set('deploy', {
      patterns: ['deploy', 'release', 'push to production', 'ship'],
      action: 'deploy'
    });

    this.intents.set('backup', {
      patterns: ['backup', 'save', 'archive'],
      action: 'backup'
    });

    this.intents.set('status_check', {
      patterns: ['check status', 'monitor', 'health check'],
      action: 'status_check'
    });
  }

  async process(message, context = {}) {
    const lowerMessage = message.toLowerCase();
    
    // Match intent
    let matchedIntent = null;
    let confidence = 0;

    for (const [name, intent] of this.intents) {
      for (const pattern of intent.patterns) {
        if (lowerMessage.includes(pattern)) {
          matchedIntent = { name, ...intent };
          confidence = Math.max(confidence, pattern.length / lowerMessage.length);
        }
      }
    }

    // Extract entities
    const entities = this.extractEntities(message);

    // Update context
    if (context.userId) {
      this.updateContext(context.userId, { message, intent: matchedIntent, entities });
    }

    return {
      intent: matchedIntent,
      confidence,
      entities,
      context: context.userId ? this.getContext(context.userId) : null
    };
  }

  extractEntities(message) {
    const entities = {};

    // Extract URLs
    const urlMatches = message.match(/https?:\/\/[^\s]+/g);
    if (urlMatches) entities.urls = urlMatches;

    // Extract file paths
    const pathMatches = message.match(/[\w\-\/]+\.[\w]+/g);
    if (pathMatches) entities.files = pathMatches;

    // Extract code blocks
    const codeMatches = message.match(/```[\s\S]*?```/g);
    if (codeMatches) entities.codeBlocks = codeMatches;

    // Extract mentioned users
    const userMatches = message.match(/@(\w+)/g);
    if (userMatches) entities.mentions = userMatches;

    // Extract dates/times
    const dateMatches = message.match(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/g);
    if (dateMatches) entities.dates = dateMatches;

    return entities;
  }

  updateContext(userId, data) {
    if (!this.contextMemory.has(userId)) {
      this.contextMemory.set(userId, { history: [], entities: {} });
    }

    const context = this.contextMemory.get(userId);
    context.history.push({ ...data, timestamp: Date.now() });
    context.lastActive = Date.now();

    // Merge entities
    if (data.entities) {
      Object.assign(context.entities, data.entities);
    }

    // Keep only last 20 interactions
    if (context.history.length > 20) {
      context.history = context.history.slice(-20);
    }
  }

  getContext(userId) {
    return this.contextMemory.get(userId);
  }

  generateResponse(analysis) {
    if (!analysis.intent) {
      return "I'm not sure I understand. Could you please rephrase that?";
    }

    const intent = analysis.intent;

    if (intent.responses) {
      // Return random response
      return intent.responses[Math.floor(Math.random() * intent.responses.length)];
    }

    if (intent.action) {
      return `I'll help you with ${intent.action}. Processing now...`;
    }

    return "I've noted your request.";
  }
}

/**
 * Multi-Channel Manager
 */
class MultiChannelManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.channels = new Map();
    this.nlp = new NLPProcessor();
    this.config = config;
  }

  async initialize() {
    console.log(VisualFeedback.info('Initializing Multi-Channel Manager...', 'communication'));

    // Initialize Telegram
    if (this.config.telegram !== false) {
      const telegram = new TelegramChannel(this.config.telegram);
      await telegram.connect();
      this.registerChannel('telegram', telegram);
    }

    // Initialize Slack
    if (this.config.slack !== false) {
      const slack = new SlackChannel(this.config.slack);
      await slack.connect();
      this.registerChannel('slack', slack);
    }

    // Initialize Email
    if (this.config.email !== false) {
      const email = new EmailChannel(this.config.email);
      await email.connect();
      this.registerChannel('email', email);
    }

    // Initialize Webhook
    const webhook = new WebhookChannel();
    await webhook.connect();
    this.registerChannel('webhook', webhook);

    console.log(VisualFeedback.success(`Multi-Channel Manager ready (${this.channels.size} channels)`));
  }

  registerChannel(name, channel) {
    this.channels.set(name, channel);
    
    // Forward events
    channel.on('message:received', (data) => {
      this.emit('message:received', { channel: name, ...data });
    });

    channel.on('message:sent', (data) => {
      this.emit('message:sent', { channel: name, ...data });
    });

    channel.on('message:error', (data) => {
      this.emit('message:error', { channel: name, ...data });
    });
  }

  async send(channelName, message, recipient) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    // Process with NLP for context-aware formatting
    if (typeof message === 'string') {
      const analysis = await this.nlp.process(message);
      message = { text: message, parse_mode: 'Markdown' };
    }

    return await channel.send(message, recipient);
  }

  async broadcast(message, channels = null) {
    const targetChannels = channels || Array.from(this.channels.keys());
    const results = [];

    for (const channelName of targetChannels) {
      try {
        const result = await this.send(channelName, message, 'default');
        results.push({ channel: channelName, success: true, result });
      } catch (error) {
        results.push({ channel: channelName, success: false, error: error.message });
      }
    }

    return results;
  }

  async processIncoming(message, channel, context = {}) {
    // Process with NLP
    const analysis = await this.nlp.process(message, context);

    // Generate response
    const response = this.nlp.generateResponse(analysis);

    return {
      analysis,
      response,
      channel,
      context
    };
  }

  getChannel(name) {
    return this.channels.get(name);
  }

  getStatus() {
    const status = {};
    for (const [name, channel] of this.channels) {
      status[name] = {
        connected: channel.connected,
        queueSize: channel.messageQueue.length
      };
    }
    return status;
  }

  async shutdown() {
    for (const [name, channel] of this.channels) {
      await channel.disconnect();
    }
  }
}

module.exports = MultiChannelManager;
module.exports.TelegramChannel = TelegramChannel;
module.exports.SlackChannel = SlackChannel;
module.exports.EmailChannel = EmailChannel;
module.exports.WebhookChannel = WebhookChannel;
module.exports.NLPProcessor = NLPProcessor;
