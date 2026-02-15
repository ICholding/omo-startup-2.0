/**
 * Default Skin Configuration
 * 
 * This configuration defines the default splash page appearance and content.
 * Copy this file to create custom skins for different companies.
 */

const skinConfig = {
  // Company Information
  companyName: 'OMO-AI',
  tagline: 'Your Multi-Agent AI Platform',
  
  // Splash Page Content
  headline: 'Welcome to Your AI Assistant',
  description: 'Connect with specialized AI agents tailored to your industry. Get expert assistance for legal, cybersecurity, healthcare, automation, and more.',
  
  // Call to Action
  ctaText: 'Get Started',
  
  // Branding
  primaryColor: '#3B82F6',
  logoUrl: '/assets/images/303418-1770429808972.png',
  
  // Features to Display
  features: [
    {
      icon: '/assets/images/303418-1770429808972.png',
      title: 'Specialized Agents',
      description: 'Choose from multiple AI agents trained for specific industries and tasks'
    },
    {
      icon: '⚡',
      title: 'Instant Responses',
      description: 'Get immediate, intelligent responses to your questions and requests'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your conversations are protected with enterprise-grade security'
    }
  ],
  
  // Footer
  footerText: '© 2026 OMO-AI. All rights reserved.',
  
  // Animation Settings
  animations: {
    enabled: true,
    duration: 300
  }
};

export default skinConfig;