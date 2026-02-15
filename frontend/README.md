# OMO-AI - Multi-Agent Chat Platform

## Overview

OMO-AI is a configurable multi-agent chat platform designed for deployment across different industries. The system supports specialized AI agents tailored to specific business needs including cybersecurity, healthcare, business automation, and software development.

## Features

- **Multi-Agent System**: 5 specialized agent roles (Chat Mode, Cyber Security, Healthcare, Automation, GitHub)
- **Brand Configuration**: Customize agent selection, features, and branding per client deployment
- **Feature Flags**: Control file uploads, paperclip visibility, and intake questions per brand
- **Monorepo Architecture**: Integrated frontend (React) and backend (Express) for production deployment
- **Render Deployment**: Pre-configured for one-click deployment on Render web services
- **File Upload Support**: Drag-and-drop file attachments with image previews
- **Structured Intake**: Guided conversation flows for industry-specific data collection
- **Projects Management**: Organize sessions into project folders with cloud storage integration
- **Session Management**: Create, rename, split, delete, and archive chat sessions
- **Custom Memory**: Agent memory storage with editable text and save functionality

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Deployment**: Render Web Service
- **File Handling**: react-dropzone
- **Styling**: Tailwind CSS with custom configurations
- **Storage**: Backblaze B2 cloud storage integration

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd omo-hub

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

### Development

```bash
# Run frontend only (development mode)
npm start

# Run full stack (frontend + backend)
npm run dev:fullstack

# Run backend only
npm run dev:backend
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm run start:prod
```

## Project Structure

```
omo-hub/
├── src/
│   ├── agents/
│   │   └── roles/              # Agent role definitions
│   │       ├── index.js        # Agent registry
│   │       ├── chatMode.js
│   │       ├── cyberSecurityAgent.js
│   │       ├── healthcareAgent.js
│   │       ├── automationAgent.js
│   │       └── githubAgent.js
│   ├── components/
│   │   └── ui/                 # Reusable UI components
│   │       ├── MessageInput.jsx
│   │       ├── ChatHeader.jsx
│   │       └── ...
│   ├── config/
│   │   ├── backend/
│   │   │   ├── agentConfig.js  # Agent configuration
│   │   │   ├── README.md
│   │   │   └── examples/       # Configuration examples
│   │   └── brandConfig.js      # Brand feature flags
│   ├── pages/
│   │   └── chat-interface/     # Main chat interface
│   │       └── components/
│   │           ├── OmoAiSidebar.jsx
│   │           ├── ProjectsView.jsx
│   │           ├── SettingsDrawer.jsx
│   │           └── ...
│   └── ...
├── server.js                   # Express backend server
├── render.yaml                 # Render deployment config
├── DEPLOYMENT.md               # Deployment guide
├── package.json                # Dependencies and scripts
└── .env.example                # Environment variable template
```

## Configuration

### Agent Selection

Edit `.env` to set the active agent:

```bash
ACTIVE_AGENT_ID=chat-mode
CLIENT_NAME=Your Company
INDUSTRY=Technology
```

**Available Agents:**
- `chat-mode` - General purpose assistant
- `cyber-security` - Security assessments
- `healthcare` - Patient intake
- `automation` - Business process automation
- `github` - Repository management and DevOps

### Feature Flags

Control features per brand:

```bash
# Show/hide paperclip button
FEATURE_PAPERCLIP_VISIBLE=true

# Enable/disable file uploads
FEATURE_FILE_UPLOAD=true

# Enable/disable intake questions
FEATURE_INTAKE_QUESTIONS=true
```

### Branding

Customize appearance:

```bash
BRAND_PRIMARY_COLOR=#4F46E5
BRAND_LOGO_URL=https://your-logo.com/logo.png
BRAND_COMPANY_NAME=Your Company Name
```

### Cloud Storage

Configure Backblaze B2 for project storage:

```bash
VITE_BACKBLAZE_KEY_ID=your-key-id
VITE_BACKBLAZE_APPLICATION_KEY=your-app-key
VITE_BACKBLAZE_BUCKET_ID=your-bucket-id
VITE_BACKBLAZE_BUCKET_NAME=your-bucket-name
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Brand Configuration
```
GET /api/config/brand
```

### Agent Configuration
```
GET /api/config/agent?id=chat-mode
```

### Chat Message (Placeholder)
```
POST /api/chat/message
Body: { message: 'Hello', agentId: 'chat-mode', context: {} }
Response: { response: '...', timestamp: '...' }
```

## Backend Configuration

The backend configuration is located in `src/config/backend/agentConfig.js`. This file controls:

- Active agent selection
- Client/industry branding
- Feature flags
- Agent-specific behavior

See `src/config/backend/README.md` for detailed configuration instructions.

## Custom Skins

Create custom splash pages and themes:

2. Add `SplashPage.jsx` and `config.js`
3. Set `VITE_CUSTOM_SKIN=your-skin-name` in `.env`


## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions including:

- Render deployment setup
- Environment variable configuration
- Multi-client deployment strategies
- Monitoring and troubleshooting

### Quick Deploy to Render

1. Push code to GitHub
2. Connect repository in Render
3. Configure environment variables
4. Deploy!

## Configuration Examples

### Healthcare Configuration

```bash
ACTIVE_AGENT_ID=healthcare
CLIENT_NAME=City Hospital
INDUSTRY=Healthcare
FEATURE_INTAKE_QUESTIONS=true
```

### Automation Configuration

```bash
ACTIVE_AGENT_ID=automation
CLIENT_NAME=Tech Corp
INDUSTRY=Technology
FEATURE_FILE_UPLOAD=true
```

## Multi-Client Deployment

### Option 1: Environment Variables

Deploy once, configure per client via environment variables.

### Option 2: Multiple Services

Create separate Render services for each client:

1. Deploy service for Client A with their config
2. Deploy service for Client B with their config
3. Use custom domains for each

### Option 3: Branch-Based

Create client-specific branches:

- `main` - Base codebase
- `client-healthcare` - Healthcare customizations
- `client-automation` - Automation customizations

Deploy each branch as separate Render service.

## Development Workflow

### Adding New Agent

1. Create agent file in `src/agents/roles/yourAgent.js`
2. Define agent configuration (id, name, description, icon, etc.)
3. Add to `src/agents/roles/index.js`
4. Update README and documentation

### Adding New Feature

1. Add feature flag to `.env`
2. Update `src/config/brandConfig.js`
3. Implement feature with conditional rendering
4. Document in README

## Troubleshooting

### Build Issues

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf dist && npm run build`

### Runtime Issues

- Check browser console for errors
- Verify environment variables are set
- Check API endpoint responses

### Deployment Issues

- Verify Node.js version (18+)
- Check Render logs
- Ensure all environment variables are configured

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check documentation in `/docs`
- Review configuration examples
- Contact support team
