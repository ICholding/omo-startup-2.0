# OpenClaw Integration with omo-startup-2.0

This guide explains how to integrate OpenClaw (AI messaging gateway) with omo-startup-2.0.

## Overview

**OpenClaw** is a multi-channel AI gateway that connects messaging platforms (WhatsApp, Telegram, Discord, Slack) to AI agents. When integrated with omo-startup-2.0, it enables:

- 📱 **WhatsApp Business Automation**
- ✈️ **Telegram Bot Integration**  
- 🎮 **Discord Community Management**
- 💼 **Slack Workspace AI Assistant**
- 🔗 **Bridge between messaging and your application**

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        omo-startup-2.0                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   Backend    │  │  Database    │          │
│  │   (Next.js)  │  │   (API)      │  │  (Postgres)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────┬──────────────────────────────────────────────────────┘
           │
           │ HTTP/WebSocket
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OpenClaw Gateway                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  WhatsApp  │ │  Telegram  │ │   Discord  │ │   Slack    │   │
│  │  (Baileys) │ │  (grammy)  │ │  (Bolt.js) │ │  (Bolt.js) │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AI Agent Core (Pi Framework)               │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐          │   │
│  │  │   OpenAI   │ │ Anthropic  │ │   Google   │          │   │
│  │  │    GPT     │ │   Claude   │ │   Gemini   │          │   │
│  │  └────────────┘ └────────────┘ └────────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Configure Environment

```bash
# Copy the example environment file
cp .env.openclaw.example .env.openclaw

# Generate a secure token
export OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
echo "OPENCLAW_GATEWAY_TOKEN=$OPENCLAW_GATEWAY_TOKEN" >> .env.openclaw

# Edit the file and add your API keys
nano .env.openclaw
```

### 2. Start Services

```bash
# Start omo-startup-2.0 with OpenClaw
docker-compose -f docker-compose.yml -f docker-compose.openclaw.yml --env-file .env.openclaw up -d
```

### 3. Setup WhatsApp (QR Code)

```bash
# Run the CLI to scan QR code
docker-compose -f docker-compose.openclaw.yml run --rm openclaw-cli channels login
```

### 4. Setup Telegram (Optional)

```bash
# Get bot token from @BotFather, then:
docker-compose -f docker-compose.openclaw.yml run --rm openclaw-cli channels add \
  --channel telegram \
  --token YOUR_BOT_TOKEN
```

### 5. Setup Discord (Optional)

```bash
# Create bot at https://discord.com/developers/applications, then:
docker-compose -f docker-compose.openclaw.yml run --rm openclaw-cli channels add \
  --channel discord \
  --token YOUR_BOT_TOKEN
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENCLAW_GATEWAY_TOKEN` | Authentication token | Yes |
| `OPENCLAW_IMAGE` | Docker image to use | No (default: GHCR latest) |
| `OPENAI_API_KEY` | OpenAI API key | Recommended |
| `ANTHROPIC_API_KEY` | Claude API key | Optional |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Optional |
| `DISCORD_BOT_TOKEN` | Discord bot token | Optional |
| `SLACK_BOT_TOKEN` | Slack bot token | Optional |

### Services

| Service | Port | Description |
|---------|------|-------------|
| OpenClaw Gateway | 18789 | Main WebSocket/API server |
| OpenClaw Bridge | 18790 | Bridge service for webhooks |
| OpenClaw Canvas | 18793 | UI generation service |
| Webhook Bridge | 8081 | Integration with omo-startup backend |

## GitHub Actions

### Build OpenClaw Image

Trigger manually via GitHub Actions:

```bash
# Go to: https://github.com/ICholding/omo-startup-2.0/actions
# Select "Build and Publish OpenClaw"
# Click "Run workflow"
```

Or trigger via API:

```bash
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/ICholding/omo-startup-2.0/actions/workflows/openclaw-build.yml/dispatches \
  -d '{"ref":"main","inputs":{"version":"2026.2.15","push_image":"true"}}'
```

### Deploy Full Stack

```bash
# Trigger deployment
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/ICholding/omo-startup-2.0/actions/workflows/openclaw-deploy.yml/dispatches \
  -d '{"ref":"main","inputs":{"environment":"production","configure_channels":"true"}}'
```

## Usage Examples

### Send Message via API

```bash
# Send WhatsApp message
curl -X POST http://localhost:18789/api/send \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "to": "+1234567890",
    "message": "Hello from omo-startup!"
  }'
```

### Receive Webhook in omo-startup

```javascript
// In your omo-startup backend
app.post('/webhooks/openclaw', (req, res) => {
  const { channel, from, message, timestamp } = req.body;
  
  // Process incoming message
  console.log(`Received from ${channel}: ${message}`);
  
  // Store in database
  await db.messages.create({
    channel,
    sender: from,
    content: message,
    receivedAt: timestamp
  });
  
  res.json({ status: 'ok' });
});
```

### AI Agent Integration

```javascript
// Use OpenClaw's AI capabilities
const response = await fetch('http://openclaw-gateway:18789/api/agent', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Generate a response for customer inquiry',
    context: conversationHistory,
    model: 'gpt-4'
  })
});
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.openclaw.yml logs openclaw-gateway

# Verify token is set
echo $OPENCLAW_GATEWAY_TOKEN

# Check port availability
netstat -tlnp | grep 18789
```

### WhatsApp QR Code Not Showing

```bash
# Run CLI interactively
docker-compose -f docker-compose.openclaw.yml run --rm openclaw-cli channels login

# Or check logs for QR
docker-compose -f docker-compose.openclaw.yml logs -f openclaw-gateway | grep QR
```

### Cannot Connect to Gateway

```bash
# Test from inside container
docker-compose -f docker-compose.openclaw.yml exec openclaw-gateway \
  curl -f http://localhost:18789/health

# Check network
docker network ls
docker network inspect omo-network
```

## Security Considerations

1. **Token Security**: Never commit `OPENCLAW_GATEWAY_TOKEN` to git. Use GitHub Secrets.

2. **Network Isolation**: OpenClaw gateway binds to `lan` by default. For production, use reverse proxy.

3. **API Keys**: Store AI provider keys in GitHub Secrets, not in repository files.

4. **Webhook Security**: Verify webhook signatures when receiving messages from OpenClaw.

## Advanced Configuration

### Enable Vector Database

```bash
# Start with vector DB for memory
docker-compose -f docker-compose.openclaw.yml --profile vectordb up -d
```

### Enable Redis Cache

```bash
# Start with Redis caching
docker-compose -f docker-compose.openclaw.yml --profile redis up -d
```

### Custom Skills

Mount custom skills directory:

```yaml
volumes:
  - ./custom-skills:/app/skills/custom:ro
```

## Resources

- **OpenClaw Repository**: https://github.com/ICholding/openclaw
- **Original Repository**: https://github.com/openclaw/openclaw
- **Documentation**: https://openclaw.ai/docs
- **GitHub Actions**: https://github.com/ICholding/omo-startup-2.0/actions

## Support

For issues with OpenClaw integration:
1. Check logs: `docker-compose logs openclaw-gateway`
2. Review documentation: https://openclaw.ai/docs
3. Open issue: https://github.com/ICholding/omo-startup-2.0/issues
