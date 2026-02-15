# Creating Custom Company Skins

This guide walks you through creating a custom splash page skin for your company.

## Quick Start

1. **Copy the default skin folder**
   ```bash
   cp -r src/custom-skins/default src/custom-skins/your-company-name
   ```

2. **Update the configuration** (`config.js`)
   - Change company name, tagline, and headline
   - Update primary color to match your brand
   - Customize features list
   - Update footer text

3. **Customize the splash page** (`SplashPage.jsx`)
   - Modify layout and styling
   - Add custom components
   - Adjust animations and transitions

4. **Add your assets**
   - Place your company logo in `assets/logo.png`
   - Add any additional images or icons

5. **Update environment variable**
   ```env
   VITE_CUSTOM_SKIN=your-company-name
   ```

6. **Register your skin** in `src/custom-skins/skinLoader.js`
   ```javascript
   export const getAvailableSkins = () => {
     return [
       'default',
       'your-company-name'  // Add your skin here
     ];
   };
   ```

## Configuration Options

### `config.js` Structure

```javascript
const skinConfig = {
  // Company Information
  companyName: 'Your Company Name',
  tagline: 'Your Tagline',
  
  // Splash Page Content
  headline: 'Main Headline',
  description: 'Detailed description of your service',
  
  // Call to Action
  ctaText: 'Get Started',
  
  // Branding
  primaryColor: '#3B82F6',  // Hex color code
  logoUrl: '/assets/images/your-logo.png',
  
  // Features (3 recommended)
  features: [
    {
      icon: '🚀',  // Emoji or icon
      title: 'Feature Title',
      description: 'Feature description'
    }
  ],
  
  // Footer
  footerText: '© 2026 Your Company. All rights reserved.',
  
  // Animation Settings
  animations: {
    enabled: true,
    duration: 300
  }
};
```

## Customizing the Splash Page Component

### Header with Centered Logo

The header section contains the centered agent logo profile:

```jsx
<header className="w-full py-8 px-4 bg-white shadow-sm">
  <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
    {/* Agent Logo Profile - Centered */}
    <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg mb-4">
      <AppImage
        src={logoUrl}
        alt="Agent Profile"
        className="w-full h-full object-cover"
      />
    </div>
    
    {/* Company Name */}
    <h1 className="text-2xl font-bold text-center">
      {companyName}
    </h1>
  </div>
</header>
```

### Styling Tips

1. **Colors**: Use Tailwind CSS classes or inline styles with your brand colors
2. **Typography**: Adjust font sizes and weights for your brand voice
3. **Spacing**: Modify padding and margins for your desired layout
4. **Shadows**: Add or remove shadows for depth
5. **Animations**: Use Framer Motion or CSS transitions for smooth effects

## Examples

### Professional Theme Examples

See `src/custom-skins/default/` for a complete example with:
- Clean, modern design
- Customizable color schemes
- Responsive layouts
- Professional messaging

### Healthcare Theme (Template)

```javascript
const skinConfig = {
  companyName: 'MediCare Health',
  tagline: 'Your Healthcare AI Assistant',
  headline: 'Compassionate Care, Powered by AI',
  primaryColor: '#10b981',  // Green
  features: [
    {
      icon: '🏥',
      title: 'Patient Support',
      description: 'Instant assistance with medical inquiries'
    },
    {
      icon: '📊',
      title: 'Health Tracking',
      description: 'Monitor and analyze health metrics'
    },
    {
      icon: '🔒',
      title: 'HIPAA Compliant',
      description: 'Secure and private health information'
    }
  ]
};
```

### Tech Startup Theme (Template)

```javascript
const skinConfig = {
  companyName: 'TechFlow AI',
  tagline: 'Automation for Modern Teams',
  headline: 'Build Faster, Ship Smarter',
  primaryColor: '#8b5cf6',  // Purple
  features: [
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Instant responses and automation'
    },
    {
      icon: '🤖',
      title: 'AI-Powered',
      description: 'Advanced machine learning capabilities'
    },
    {
      icon: '🔗',
      title: 'Integrations',
      description: 'Connect with your favorite tools'
    }
  ]
};
```

## Integration with Brand Config

The custom skin system integrates with the existing brand configuration:

- **Environment Variables**: Override skin config with `.env` variables
- **Backend API**: Fetch dynamic branding from `/api/config/brand`
- **Fallback**: Uses skin config if API unavailable

### Priority Order

1. Backend API branding (highest priority)
2. Environment variables
3. Skin configuration file
4. Default values (lowest priority)

## Testing Your Custom Skin

1. **Set environment variable**
   ```env
   VITE_CUSTOM_SKIN=your-company-name
   ```

2. **Start development server**
   ```bash
   npm start
   ```

3. **Navigate to root route** (`/`)
   - Should display your custom splash page
   - Logo should be centered in header
   - All customizations should be visible

4. **Test responsiveness**
   - Mobile devices
   - Tablets
   - Desktop screens

5. **Test navigation**
   - Click "Get Started" button
   - Should navigate to `/chat-interface`

## Deployment

### For Render.com

Add environment variable in Render dashboard:
```
VITE_CUSTOM_SKIN=your-company-name
```

### For Other Platforms

Set the environment variable in your deployment configuration:
- Vercel: Add to Environment Variables in project settings
- Netlify: Add to Build environment variables
- AWS: Add to Elastic Beanstalk environment properties
- Docker: Add to docker-compose.yml or Dockerfile ENV

## Troubleshooting

### Skin Not Loading

1. Check environment variable is set correctly
2. Verify folder name matches exactly (case-sensitive)
3. Ensure `SplashPage.jsx` and `config.js` exist in skin folder
4. Check browser console for error messages
5. Verify skin is registered in `skinLoader.js`

### Logo Not Displaying

1. Check logo path in config.js
2. Verify logo file exists in public/assets/images/
3. Check image format is supported (png, jpg, svg)
4. Verify image permissions and file size

### Styling Issues

1. Check Tailwind CSS classes are valid
2. Verify custom colors are in hex format
3. Test in different browsers
4. Clear browser cache and rebuild

## Best Practices

1. **Keep it Simple**: Don't overcomplicate the splash page
2. **Fast Loading**: Optimize images and minimize dependencies
3. **Responsive Design**: Test on all device sizes
4. **Accessibility**: Use proper alt text and ARIA labels
5. **Brand Consistency**: Match your company's visual identity
6. **Clear CTA**: Make the "Get Started" button prominent
7. **Professional Copy**: Use clear, concise messaging
8. **Test Thoroughly**: Verify all features work before deployment

## Support

For questions or issues:
1. Check existing examples in `src/custom-skins/`
2. Review this documentation
3. Check the main README.md for general setup
4. Contact your development team

---

**Happy customizing! 🎨**