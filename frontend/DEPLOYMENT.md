# Deployment Guide - OMO-AI

## Overview

This application is configured for deployment on **Render** as a web service with a monorepo structure. The system supports multiple brand configurations and agent roles tailored to different industries.

## Architecture

### Monorepo Structure

```
omo-hub/
├── src/                    # React frontend source
├── dist/                   # Production build output
├── server.js               # Express backend server
├── render.yaml             # Render deployment config
├── package.json            # Monorepo dependencies
└── .env.example            # Environment variable template
```

### Technology Stack

- **Frontend**: React 18 + Vite
- **Backend**: Express.js
- **Deployment**: Render Web Service
- **Environment**: Node.js 18+

## Deployment Steps

### 1. Prepare Your Repository

```bash
# Clone or push your repository to GitHub
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

   **Basic Settings:**
   - **Name**: `omo-hub` (or your preferred name)
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Root Directory**: Leave empty (monorepo root)

   **Build & Deploy:**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### 3. Configure Environment Variables

In Render dashboard, add these environment variables:

#### Required Variables

```bash
NODE_ENV=production
PORT=10000  # Render assigns this automatically
```

#### Brand Configuration

```bash
# Agent Selection (choose one)
ACTIVE_AGENT_ID=chat-mode
# Options: chat-mode, cyber-security, healthcare, automation, github

CLIENT_NAME=Your Client Name
INDUSTRY=Your Industry
```

#### Feature Flags

```bash
# File Upload Feature
FEATURE_FILE_UPLOAD=true

# Paperclip Button Visibility
FEATURE_PAPERCLIP_VISIBLE=true

# Intake Questions Feature
FEATURE_INTAKE_QUESTIONS=true
```

#### Branding (Optional)

```bash
BRAND_PRIMARY_COLOR=#3B82F6
BRAND_LOGO_URL=https://your-logo-url.com/logo.png
BRAND_COMPANY_NAME=Your Company Name
```

#### AI Service Keys (Add your actual keys)

```bash
VITE_OPENAI_API_KEY=sk-...
VITE_GEMINI_API_KEY=...
VITE_ANTHROPIC_API_KEY=...
VITE_PERPLEXITY_API_KEY=...
```

#### Storage Configuration

```bash
VITE_BACKBLAZE_KEY_ID=...
VITE_BACKBLAZE_APPLICATION_KEY=...
VITE_BACKBLAZE_BUCKET_ID=...
VITE_BACKBLAZE_BUCKET_NAME=...
```


#### Frontend → Backend URL Wiring

If your frontend is hosted separately from the backend, set these variables on the frontend service:

```bash
VITE_API_URL=https://your-backend-service.onrender.com
# Optional legacy alias for CRA-style naming
REACT_APP_API_URL=https://your-backend-service.onrender.com
```

The frontend reads these values when building API request URLs.

On the backend service, allow your deployed frontend origin:

```bash
CORS_ALLOWED_ORIGINS=https://your-frontend-service.onrender.com
```

Use a comma-separated list when you need multiple origins (for example preview + production).

### 4. Deploy

Render will automatically:
1. Install dependencies
2. Build the React frontend
3. Start the Express server
4. Serve the application

## API Endpoints

### Health Check

```
GET /api/health
Response: { status: 'healthy', timestamp: '...', service: 'OMO-AI API' }
```

### Brand Configuration

```
GET /api/config/brand
Response: {
  activeAgentId: 'chat-mode',
  clientName: 'Your Company',
  industry: 'Technology',
  features: { fileUpload: true, paperclipVisible: true, ... },
  branding: { primaryColor: '#3B82F6', ... }
}
```

### Agent Configuration

```
GET /api/config/agent?id=chat-mode
Response: { agentId: 'chat-mode', timestamp: '...' }
```

### Chat Message (Placeholder)

```
POST /api/chat/message
Body: { message: 'Hello', agentId: 'chat-mode', context: {} }
Response: { response: '...', timestamp: '...' }
```

## Multi-Client Deployment Strategies

### Option 1: Environment Variables (Recommended)

Deploy one service, configure different clients via environment variables:

```bash
# Client A
ACTIVE_AGENT_ID=healthcare
CLIENT_NAME=City Hospital

# Client B
ACTIVE_AGENT_ID=automation
CLIENT_NAME=Tech Corp
```

### Option 2: Multiple Render Services

1. Deploy separate Render services for each client
2. Configure unique environment variables per service
3. Use custom domains for each client

### Option 3: Branch-Based Deployment

1. Create branches for each client: `client-healthcare`, `client-automation`
2. Deploy each branch as separate Render service
3. Maintain client-specific configurations in branches

## Monitoring & Logs

- **Logs**: Available in Render dashboard under "Logs" tab
- **Metrics**: Monitor CPU, memory, and request metrics
- **Health Check**: Automatic health checks via `/api/health`

## Troubleshooting

### Build Failures

- Check Node.js version (requires 18+)
- Verify all dependencies in package.json
- Review build logs in Render dashboard

### Runtime Errors

- Check environment variables are set correctly
- Review application logs
- Verify API keys are valid

### Performance Issues

- Consider upgrading Render plan
- Optimize bundle size
- Enable caching strategies

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Rotate keys regularly
3. **HTTPS**: Render provides automatic SSL
4. **CORS**: Configure appropriate CORS policies
5. **Rate Limiting**: Implement rate limiting for API endpoints

## Scaling

- **Horizontal Scaling**: Add more Render instances
- **Database**: Consider adding PostgreSQL or MongoDB
- **Caching**: Implement Redis for session management
- **CDN**: Use CDN for static assets

## Support

For deployment issues:
- Check Render documentation: https://render.com/docs
- Review application logs
- Contact support team