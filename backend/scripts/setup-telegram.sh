#!/bin/bash
# Telegram Bot Webhook Setup Script
# Usage: ./setup-telegram.sh <your-render-url>

set -e

RENDER_URL=${1:-$RENDER_EXTERNAL_URL}

if [ -z "$RENDER_URL" ]; then
    echo "❌ Error: Please provide your Render URL"
    echo "Usage: ./setup-telegram.sh https://your-app.onrender.com"
    exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN not set"
    echo "Please set it: export TELEGRAM_BOT_TOKEN=your_token"
    exit 1
fi

echo "🤖 Setting up Telegram webhook..."
echo "📍 Webhook URL: ${RENDER_URL}/api/telegram/webhook"
echo ""

# Set webhook
echo "🔗 Registering webhook with Telegram..."
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"${RENDER_URL}/api/telegram/webhook\",
        \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\",
        \"allowed_updates\": [\"message\"]
    }"

echo ""
echo ""

# Verify webhook
echo "✅ Verifying webhook..."
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq .

echo ""
echo "🎉 Done! Your Telegram bot is now connected."
echo ""
echo "💡 Test it:"
echo "   1. Open your bot in Telegram"
echo "   2. Send /start"
echo "   3. Send any message to chat with Clawbot"
echo ""
echo "📊 Check status:"
echo "   curl ${RENDER_URL}/api/telegram/status"
