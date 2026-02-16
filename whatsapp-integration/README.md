# WhatsApp ClawBot Integration

Native WhatsApp integration for omo-startup-2.0 using OpenClaw as the gateway.

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  User WhatsApp  │────▶│  OpenClaw Gateway   │────▶│  WhatsApp       │
│  (Phone App)    │◀────│  (WhatsApp Bot)     │◀────│  Bridge Service │
└─────────────────┘     └─────────────────────┘     └────────┬────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │  omo-startup    │
                                                    │  Backend API    │
                                                    └─────────────────┘
```

## Quick Start

### 1. Deploy to Render

Option A: Use Render Blueprint (Recommended)
```bash
# Deploy via Render dashboard using render-whatsapp.yaml
```

Option B: Manual Deploy
1. Create Web Service on Render
2. Connect to `ICholding/openclaw`
3. Use `Dockerfile` (not Dockerfile.full)
4. Set environment variables (see below)

### 2. Configure Environment Variables

#### OpenClaw Service:
```bash
OPENCLAW_GATEWAY_TOKEN=your-secure-token
OPENCLAW_GATEWAY_BIND=0.0.0.0
WHATSAPP_ENABLED=true
TELEGRAM_ENABLED=false
OPENAI_API_KEY=sk-...
```

#### Bridge Service:
```bash
OPENCLAW_GATEWAY_URL=https://your-openclaw-service.onrender.com
OPENCLAW_GATEWAY_TOKEN=same-as-above
OMO_BACKEND_URL=https://omo-startup-backend.onrender.com
WEBHOOK_SECRET=shared-secret-for-webhooks
```

### 3. Setup WhatsApp (QR Code)

```bash
# Connect to OpenClaw service and scan QR
docker-compose -f docker-compose.whatsapp.yml run --rm openclaw-cli channels login

# Or if running on Render, use Render CLI
render ssh --service omo-whatsapp-clawbot
node openclaw.mjs channels login
```

### 4. Test Integration

```bash
# Send test message via API
curl -X POST https://your-bridge-service.onrender.com/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Hello from omo-startup!"
  }'
```

## API Endpoints

### Bridge Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhooks/openclaw` | POST | Receive WhatsApp messages from OpenClaw |
| `/api/send` | POST | Send WhatsApp message |
| `/api/status` | GET | Get connection status |

### Send Message (Backend → WhatsApp)

```javascript
// From your omo-startup backend
const response = await fetch('https://bridge-service/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+1234567890',
    message: 'Your order is ready!'
  })
});
```

### Receive Message (WhatsApp → Backend)

Your backend receives:
```json
{
  "platform": "whatsapp",
  "externalId": "+1234567890",
  "phoneNumber": "+1234567890",
  "message": "Hello!",
  "timestamp": "2026-02-16T10:30:00Z",
  "metadata": {}
}
```

## GitHub Actions

Use the workflow: **"WhatsApp ClawBot - Build & Deploy"**

Set these secrets:
- `RENDER_API_KEY`
- `RENDER_WHATSAPP_SERVICE_ID`
- `RENDER_BACKEND_SERVICE_ID`
- `RENDER_FRONTEND_SERVICE_ID`

## Local Development

```bash
# Start WhatsApp ClawBot
docker-compose -f docker-compose.whatsapp.yml up -d

# Setup WhatsApp (scan QR)
docker-compose -f docker-compose.whatsapp.yml run --rm openclaw-cli channels login

# Test bridge
curl http://localhost:8081/health
```

## Troubleshooting

### WhatsApp Not Connecting
- Check logs: `docker-compose logs -f openclaw-gateway`
- Ensure QR code was scanned
- Verify WhatsApp Business account is active

### Bridge Not Receiving Messages
- Check bridge health: `curl http://localhost:8081/health`
- Verify OpenClaw webhook URL is configured
- Check OpenClaw logs for webhook delivery errors

### Backend Not Receiving Webhooks
- Verify `WEBHOOK_SECRET` matches
- Check backend is accessible from bridge
- Review backend logs for incoming requests

## Features

- ✅ Two-way WhatsApp messaging
- ✅ AI-powered responses (via OpenClaw agents)
- ✅ Media message support (images, documents)
- ✅ Group chat support
- ✅ Message status tracking (delivered, read)
- ✅ Webhook retries on failure

## Security

- All communications use HTTPS
- Webhook signatures verified
- Token-based authentication
- No message content stored in bridge (stateless)
