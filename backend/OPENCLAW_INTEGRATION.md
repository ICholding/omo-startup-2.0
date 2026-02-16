# OpenClaw Direct Integration

OpenClaw is now embedded directly into the backend for seamless WhatsApp integration.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐
│   omo-backend   │────▶│   OpenClaw (embedded)│
│   (Express)     │     │   - Gateway server   │
│                 │◀────│   - WhatsApp bot     │
└─────────────────┘     └──────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌──────────────────────┐
│  PostgreSQL     │     │  WhatsApp Users      │
│  (Messages)     │     │  (Phone Numbers)     │
└─────────────────┘     └──────────────────────┘
```

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will automatically install OpenClaw from GitHub as specified in package.json.

### 2. Environment Variables

Add to your `.env` file:

```bash
# Enable messaging service
ENABLE_MESSAGING=true

# OpenClaw Configuration
OPENCLAW_GATEWAY_TOKEN=your-secure-token-here
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_DATA_DIR=./.openclaw

# Optional: Auto-reply with AI
AUTO_REPLY_ENABLED=true
```

Generate a secure token:
```bash
openssl rand -hex 32
```

### 3. Setup WhatsApp

```bash
npm run whatsapp:setup
```

This will display a QR code. Scan it with your WhatsApp app.

### 4. Start Server

```bash
npm start
```

The messaging service will automatically initialize with the server.

## API Endpoints

### Send WhatsApp Message
```bash
POST /api/messaging/send
Content-Type: application/json

{
  "channel": "whatsapp",
  "to": "+1234567890",
  "message": "Hello from omo-startup!"
}
```

### Check Messaging Status
```bash
GET /api/messaging/status
```

Response:
```json
{
  "enabled": true,
  "initialized": true,
  "openclaw": {
    "connected": true,
    "status": "ok"
  }
}
```

### Webhook for Incoming Messages
```bash
POST /api/whatsapp/webhook
X-Webhook-Secret: your-secret

{
  "platform": "whatsapp",
  "phoneNumber": "+1234567890",
  "message": "Hello!",
  "timestamp": "2026-02-16T10:00:00Z"
}
```

## Database Schema

### Messages Table
- `id` - UUID
- `userId` - Reference to Users
- `phoneNumber` - WhatsApp number
- `platform` - 'whatsapp'
- `content` - Message text
- `direction` - 'incoming' or 'outgoing'
- `timestamp` - When sent
- `metadata` - Extra data

### Users Table (Updated)
- `phoneNumber` - WhatsApp number
- `platform` - 'whatsapp'
- `externalId` - WhatsApp ID
- `source` - 'whatsapp'

## Usage Examples

### Send Message from Code
```javascript
const messaging = app.get('messagingService');

await messaging.sendMessage('whatsapp', '+1234567890', 'Hello!');
```

### Handle Incoming Messages
```javascript
// Automatically handled by messaging service
// Stores to DB and optionally replies with AI
```

### Get Conversation History
```javascript
const messages = await messaging.getConversationHistory('+1234567890', 20);
```

## Troubleshooting

### "Messaging service not initialized"
- Check that `ENABLE_MESSAGING=true` is set
- Check OpenClaw is installed: `ls node_modules/openclaw`

### WhatsApp not connecting
- Run setup again: `npm run whatsapp:setup`
- Check OpenClaw logs in `.openclaw/logs/`

### Port already in use
- Change `OPENCLAW_GATEWAY_PORT` to another port
- Or kill existing process: `lsof -ti:18789 | xargs kill`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run install:openclaw` | Install OpenClaw package |
| `npm run whatsapp:setup` | Setup WhatsApp QR code |
| `npm run messaging:start` | Start messaging standalone |

## Integration with AI Agent

When `AUTO_REPLY_ENABLED=true`, incoming WhatsApp messages are automatically processed by your AI agent and replied to.

The AI receives:
- Message content
- Conversation history
- User context

Configure AI behavior in `lib/messaging-service.js` in the `processAIReply` method.
