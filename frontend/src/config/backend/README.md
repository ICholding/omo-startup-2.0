# Backend Configuration Guide

## Overview

This directory contains configuration for the single-assistant frontend experience. The configuration system controls one runtime assistant profile, branding, and feature flags per deployment.

## Configuration Files

### `agentConfig.js`

Main configuration file that exports:

- `HACKERAI_CONFIG` - Base single-assistant configuration object
- `getConfiguredAgent()` - Returns the current assistant configuration (with brand overrides)
- `getCurrentMode()` - Returns the current operational mode
- `setAgentMode(modeId)` - Updates the active mode when valid
- `getAvailableTools()` - Returns tools available for the active mode

## Runtime Identity

The frontend is designed for one assistant identity:

- `omo-cognitive-architect`

## Environment Variables

Key environment variables used by backend/brand configuration:

```bash
CLIENT_NAME=Your Company
INDUSTRY=Your Industry
FEATURE_FILE_UPLOAD=true
FEATURE_PAPERCLIP_VISIBLE=true
FEATURE_INTAKE_QUESTIONS=true
```

## Usage

### In Frontend

```javascript
import { getConfiguredAgent, getCurrentMode } from '../config/backend/agentConfig';

const agent = await getConfiguredAgent();
const mode = getCurrentMode();
```

## Best Practices

- Keep all behavior in a single assistant profile
- Use environment variables for deployment-specific settings
- Document configuration changes alongside code updates
- Test mode switching and fallback behavior before deployment
