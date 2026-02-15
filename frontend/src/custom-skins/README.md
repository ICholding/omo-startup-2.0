# Custom Skins Folder

This folder stores company-specific custom splash pages and branding configurations. Each company gets its own subfolder with customized splash page components and assets.

## Folder Structure

```
custom-skins/
├── README.md
├── default/
│   ├── SplashPage.jsx
│   ├── config.js
│   └── assets/
│       └── logo.png
├── company-name/
│   ├── SplashPage.jsx
│   ├── config.js
│   └── assets/
│       └── logo.png
└── ...
```

## Creating a New Custom Skin

1. Create a new folder with your company name (lowercase, hyphenated)
2. Copy the default skin structure
3. Customize the `SplashPage.jsx` component
4. Update `config.js` with company-specific settings
5. Add company logo to the `assets/` folder
6. Set the `VITE_CUSTOM_SKIN` environment variable to your folder name

## Configuration

Each skin folder contains:

- **SplashPage.jsx**: Main splash page component with centered agent logo in header
- **config.js**: Skin-specific configuration (colors, text, features)
- **assets/**: Folder for logos, images, and other static assets

## Usage

The app automatically loads the skin specified in the `VITE_CUSTOM_SKIN` environment variable. If not set, it defaults to the 'default' skin.

```env
VITE_CUSTOM_SKIN=company-name
```

## Splash Page Features

- Centered agent logo profile in header
- Customizable branding colors
- Company-specific messaging
- Smooth transitions to chat interface
- Responsive design for all devices