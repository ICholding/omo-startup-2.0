# HackerAI Cognitive Architect

**OMO-AI reprogrammed for asymmetric security outcomes.**

This is the HackerAI Agent Framework implementation - a cognitive architecture designed for penetration testing, vulnerability assessment, and security automation. It replaces the previous multi-agent delegation model with a singular, high-leverage agent operating through a strict six-part execution structure.

## AI Control Doctrine

This system operates under the **non-negotiable AI control doctrine** that defines the AI as a:

> **Cognitive Architect and Time-Leverage Strategist**

Its purpose is to reprogram cognition, engineer asymmetric outcomes, and collapse time through systems, leverage, and execution.

**Value equals solved problems and installed systems only.**

### Six-Part Execution Structure

All operations follow this strict cycle:

1. **THINK** - Strategic assessment, attack vector identification, risk analysis
2. **PLAN** - Execution strategy with clear constraints and resource optimization
3. **EXECUTE** - Tool deployment with leverage optimization and real-time adaptation
4. **LEARN** - Knowledge extraction, pattern recognition, and intelligence synthesis
5. **ADAPT** - Dynamic replanning based on findings and environmental changes
6. **SECURE** - Remediation implementation and hardening

## Test - Hack - Learn - Secure

### Operational Modes

| Mode | Purpose | Tools |
|------|---------|-------|
| **RECON** | Information gathering, attack surface mapping | DNS enum, subdomain scan, OSINT |
| **SCAN** | Active vulnerability discovery | Port scan, service enum, web scan |
| **EXPLOIT** | Proof-of-concept validation | SQLi, XSS, auth bypass testing |
| **POST_EXPLOIT** | Lateral movement assessment | Privesc check, persistence analysis |
| **LEARN** | Intelligence extraction | Findings analysis, risk scoring |
| **SECURE** | Remediation & hardening | Config fixes, monitoring setup |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              HackerAI Cognitive Architect                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  THINK   │→│  PLAN    │→│ EXECUTE  │→│  LEARN   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│       ↑                                            ↓       │
│       └────────────── ADAPT ←──────────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    Tool Registry                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Recon   │ │  Scan    │ │ Exploit  │ │   Post   │      │
│  │  Tools   │ │  Tools   │ │  Tools   │ │ Exploit  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Repository Structure

```
.
├── backend/                 # Express.js API + HackerAI Agent Core
│   ├── server.js           # API endpoints for agent execution
│   ├── agent-core/         # Cognitive architect implementation
│   │   ├── agent-orchestrator.js
│   │   └── tool-registry.js
│   └── package.json
│
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── config/backend/agentConfig.js  # HackerAI config
│   │   ├── hooks/useAgentLoader.js        # Agent loader hook
│   │   └── ...
│   └── package.json
│
└── README.md              # This file
```

## Quick Start

### Backend
```bash
cd backend
npm install
npm start
```

The backend exposes HackerAI API endpoints at:
- `POST /api/hackerai/execute` - Execute security task
- `GET /api/hackerai/status` - Agent status
- `GET /api/config/brand` - Brand configuration

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

Create `.env` in backend directory:

```env
# HackerAI Configuration
AGENT_ID=hackerai-cognitive-architect
AGENT_MODE=recon
LOG_LEVEL=info
LLM_MODEL=claude-4-opus
LLM_API_KEY=your-api-key-here

# Security Settings
REQUIRE_AUTHORIZATION=true
SAFE_EXPLOITATION=true
AUTHORIZED_TARGETS_ONLY=true

# Features
FEATURE_REALTIME_SCANNING=true
FEATURE_EXPLOIT_VALIDATION=true
FEATURE_REPORT_GENERATION=true

# Optional OpenRouter Assistant Mode (GPT via OpenRouter)
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_MAX_CONTEXT_MESSAGES=12
```

## API Usage

### Optional: OpenRouter assistant responses in chat

When `OPENROUTER_API_KEY` is set, chat responses are generated through OpenRouter (for example using GPT-4 class models). The backend still preserves the THINK/REASONING streaming flow and falls back to built-in responses if OpenRouter is unavailable.

### Execute Security Task

```bash
curl -X POST http://localhost:3001/api/hackerai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "description": "Port scan and vulnerability assessment",
      "target": "example.com",
      "mode": "scan"
    },
    "cognition": {
      "thinkingDepth": "deep",
      "leverageOptimization": true
    }
  }'
```

### Response

```json
{
  "taskId": "task-001",
  "mode": "scan",
  "executionState": "completed",
  "findings": [
    {
      "type": "open_port",
      "port": 443,
      "service": "https",
      "severity": "info"
    }
  ],
  "recommendations": [...],
  "executionTime": 45.2
}
```

## Deployment

### Render Deployment

This repo is configured for Render with:
- `omo-frontend` (Static Site) from `frontend/`
- `omo-backend-worker` (Worker) from `backend/`

Deploy using the root `render.yaml`.

## Security Considerations

⚠️ **CRITICAL**: This system is designed for authorized security testing only.

- All exploitation uses safe payloads (no actual damage)
- Authorized targets only (configurable whitelist)
- Complete audit logging
- Safe exploitation mode (read-only validation)

## Philosophy

### Reject Dilution
- No multi-agent delegation overhead
- No comfort-over-outcomes
- No discussion without execution

### Diagnose Leverage Failures
- What constraint blocks execution?
- Where is the bottleneck?
- How can we collapse time?

### Prioritize Control
- Outcomes over comfort
- Execution over discussion
- Systems over chaos

## License

MIT License

## Links

- Documentation: https://docs.hackerai.co
- Framework: https://github.com/hackerai/agent-framework
- Issues: https://github.com/ICholding/omo-startup/issues

---

**HackerAI** - *Cognitive Architect for Asymmetric Security Outcomes*
