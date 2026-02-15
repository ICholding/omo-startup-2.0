/**
 * Law Firm Custom Skin Configuration
 * 
 * Example configuration for a law firm client.
 * This demonstrates how to customize the splash page for specific industries.
 */

const skinConfig = {
  // Company Information
  companyName: 'Smith & Associates Law',
  tagline: 'Your Trusted Legal AI Assistant',
  
  // Splash Page Content
  headline: 'Expert Legal Guidance, Powered by AI',
  description: 'Get instant assistance with legal research, document review, case analysis, and client intake. Our AI assistant is trained specifically for legal professionals.',
  
  // Call to Action
  ctaText: 'Start Legal Consultation',
  
  // Branding (Professional law firm colors)
  primaryColor: '#d97706', // Amber/Gold
  logoUrl: '/assets/images/303418-1770429808972.png',
  
  // Features to Display
  features: [
    {
      icon: '⚖️',
      title: 'Legal Research',
      description: 'Quickly research case law, statutes, and legal precedents with AI assistance'
    },
    {
      icon: '📄',
      title: 'Document Review',
      description: 'Analyze contracts, briefs, and legal documents with precision'
    },
    {
      icon: '🔒',
      title: 'Confidential',
      description: 'Attorney-client privilege protected with enterprise security'
    }
  ],
  
  // Footer
  footerText: '© 2026 Smith & Associates Law. All communications are confidential and protected by attorney-client privilege.',
  
  // Animation Settings
  animations: {
    enabled: true,
    duration: 300
  }
};

export default skinConfig;