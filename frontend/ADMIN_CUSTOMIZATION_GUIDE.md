# Admin Customization & Render Deployment Guide

## Overview

This application is now fully configured for **admin-driven customization** with complete **Render deployment** support. Admins can customize the chat interface, theme colors, layout, and UI components through an intuitive dashboard.

## 🚀 Quick Start

### 1. Deploy to Render

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add admin customization features"
   git push origin main
   ```

2. **Create Render Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml` configuration

3. **Configure Environment Variables** (in Render Dashboard)
   ```bash
   # Admin Access (REQUIRED)
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-secure-password
   
   # Customization Storage
   CUSTOMIZATION_STORAGE=backblaze  # or 'local' for testing
   
   # Optional: Backblaze for persistent storage
   VITE_BACKBLAZE_KEY_ID=your-key-id
   VITE_BACKBLAZE_APPLICATION_KEY=your-app-key
   VITE_BACKBLAZE_BUCKET_ID=your-bucket-id
   VITE_BACKBLAZE_BUCKET_NAME=your-bucket-name
   ```

4. **Deploy**
   - Click **"Create Web Service"**
   - Render will automatically build and deploy
   - Your app will be live at: `https://your-app.onrender.com`

### 2. Access Admin Dashboard

1. Navigate to: `https://your-app.onrender.com/platform-dashboard`
2. Click **Settings** icon in top right
3. Select **"Platform Dashboard"**
4. Use the admin credentials you configured

## 🎨 Admin Customization Features

### Chat Interface Settings

Customize chat appearance and behavior:

- **Appearance**
  - Theme (Light/Dark/Auto)
  - Primary color picker
  - Chat bubble style (Rounded/Square/Minimal)
  - Font size (Small/Medium/Large)

- **Behavior**
  - Auto-scroll
  - Show timestamps
  - Typing indicator
  - Sound notifications

- **Features**
  - File upload toggle
  - Voice input toggle
  - Markdown support
  - Max message length

- **Live Preview**
  - Real-time preview of chat appearance
  - See changes before saving

- **Import/Export**
  - Export configuration as JSON
  - Import configuration from file
  - Share settings across deployments

### UI Customization Panel

Advanced theme and layout customization:

- **Theme Colors**
  - Primary, Secondary, Accent colors
  - Background and Text colors
  - Interactive color picker
  - Hex code input

- **Layout Settings**
  - Sidebar position (Left/Right)
  - Header style (Fixed/Static/Sticky)
  - Max width configuration
  - Border radius customization

- **Typography**
  - Font family selection
  - Heading and body sizes
  - Line height adjustment

- **JSON Editor**
  - Direct JSON configuration editing
  - Real-time validation
  - Copy/paste support

## 📦 Installed Dependencies

New packages for admin customization:

```json
{
  "react-color": "^2.19.3",        // Color picker component
  "react-json-view": "^1.21.3",    // JSON configuration viewer
  "file-saver": "^2.0.5",          // Export configuration files
  "js-yaml": "^4.1.1"              // YAML support for configs
}
```

## 🔐 Security

### Admin Authentication

All admin endpoints require Basic Authentication:

```javascript
// Example: Accessing admin API
const authHeader = 'Basic ' + btoa('username:password');

fetch('/api/admin/customization', {
  headers: { 'Authorization': authHeader }
});
```

### Environment Variables

**Never commit these to Git:**
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `VITE_BACKBLAZE_APPLICATION_KEY`
- API keys for OpenAI, Gemini, etc.

## 🛠️ API Endpoints

### Admin Customization

```bash
# Get current customization settings
GET /api/admin/customization
Authorization: Basic <base64-credentials>

# Save customization settings
POST /api/admin/customization
Authorization: Basic <base64-credentials>
Content-Type: application/json

# Export configuration
GET /api/admin/customization/export
Authorization: Basic <base64-credentials>

# Import configuration
POST /api/admin/customization/import
Authorization: Basic <base64-credentials>
Content-Type: application/json
```

### Brand Configuration (Public)

```bash
# Get brand configuration
GET /api/config/brand

# Health check
GET /api/health
```

## 📁 Configuration Files

### Local Storage

Customization settings are stored in:
```
customization-config.json
```

Example structure:
```json
{
  "theme": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#8B5CF6",
    "accentColor": "#10B981"
  },
  "chat": {
    "bubbleStyle": "rounded",
    "fontSize": "medium",
    "showTimestamps": true
  },
  "layout": {
    "sidebarPosition": "left",
    "maxWidth": "1200px"
  }
}
```

## 🔄 Workflow

### Typical Admin Workflow

1. **Login to Platform Dashboard**
   - Navigate to `/platform-dashboard`
   - Authenticate with admin credentials

2. **Customize Chat Interface**
   - Go to "Chat Settings" tab
   - Adjust appearance, behavior, features
   - Use live preview to see changes
   - Click "Save Changes"

3. **Customize Theme & Layout**
   - Go to "UI Customization" tab
   - Select colors using color picker
   - Adjust layout settings
   - Modify typography
   - Save configuration

4. **Export Configuration** (Optional)
   - Click "Export" button
   - Save JSON file locally
   - Use for backup or sharing

5. **Import Configuration** (Optional)
   - Click "Import" button
   - Select JSON configuration file
   - Review changes
   - Save to apply

## 🌐 Multi-Deployment Strategy

### Option 1: Separate Render Services

1. Deploy same codebase multiple times
2. Configure different admin credentials per service
3. Each deployment has independent customization

### Option 2: Shared Configuration

1. Deploy once
2. Use Backblaze for centralized storage
3. Multiple admins can manage same configuration

### Option 3: Branch-Based Deployment

1. Create branches: `client-a`, `client-b`
2. Deploy each branch separately
3. Maintain client-specific customizations in branches

## 🐛 Troubleshooting

### Admin Login Not Working

- Verify `ADMIN_ENABLED=true` in environment variables
- Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set
- Ensure credentials are correct (case-sensitive)

### Configuration Not Saving

- Check admin authentication is working
- Verify write permissions on server
- Check browser console for errors
- Ensure JSON is valid if using JSON editor

### Colors Not Applying

- Clear browser cache
- Check if configuration was saved successfully
- Verify color values are valid hex codes
- Refresh the page after saving

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [React Color Picker](https://casesandberg.github.io/react-color/)
- [Backblaze B2 Setup](https://www.backblaze.com/b2/docs/)

## 🎯 Next Steps

1. **Deploy to Render** using the steps above
2. **Set admin credentials** in Render environment variables
3. **Access Platform Dashboard** and customize your app
4. **Export configuration** for backup
5. **Share with team** or deploy to multiple environments

---

**Need Help?** Check the main `DEPLOYMENT.md` for general deployment information.