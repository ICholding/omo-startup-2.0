import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppImage from '../../components/AppImage';
import Button from '../../components/ui/Button';
import { getBranding } from '../../config/brandConfig';
import skinConfig from './config';

const SplashPage = () => {
  const navigate = useNavigate();
  const [branding, setBranding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const brandData = await getBranding();
        setBranding(brandData);
      } catch (error) {
        console.error('Failed to load branding:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBranding();
  }, []);

  const handleGetStarted = () => {
    navigate('/chat-interface');
  };

  const primaryColor = branding?.primaryColor || skinConfig?.primaryColor;
  const logoUrl = branding?.logoUrl || skinConfig?.logoUrl;
  const companyName = branding?.companyName || skinConfig?.companyName;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header with Centered Agent Logo Profile */}
      <header className="w-full py-10 px-4 bg-slate-950 shadow-xl border-b border-amber-900/30">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
          {/* Agent Logo Profile - Centered */}
          <div 
            className="w-28 h-28 rounded-full overflow-hidden shadow-2xl mb-5 ring-4 ring-amber-600/40 bg-slate-800"
          >
            <AppImage
              src={logoUrl || '/assets/images/303418-1770429808972.png'}
              alt={`${companyName} Legal Assistant`}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Company Name */}
          <h1 
            className="text-3xl font-bold text-center tracking-wide"
            style={{ color: primaryColor }}
          >
            {companyName}
          </h1>
          <p className="text-amber-200/80 text-center mt-2 text-lg">
            {skinConfig?.tagline}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-3xl w-full text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-amber-100 mb-6 leading-tight">
            {skinConfig?.headline}
          </h2>
          
          <p className="text-xl text-slate-300 mb-10 leading-relaxed">
            {skinConfig?.description}
          </p>

          {/* Features List */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {skinConfig?.features?.map((feature, index) => (
              <div 
                key={index}
                className="p-6 bg-slate-800/50 rounded-lg shadow-xl border border-amber-900/20 hover:border-amber-600/40 transition-all hover:shadow-2xl backdrop-blur-sm"
              >
                <div 
                  className="text-4xl mb-3"
                >
                  {feature?.icon}
                </div>
                <h3 className="font-semibold text-amber-100 mb-2 text-lg">
                  {feature?.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature?.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleGetStarted}
            className="px-10 py-4 text-lg font-semibold rounded-lg shadow-2xl hover:shadow-amber-600/20 transition-all transform hover:scale-105 border-2"
            style={{ 
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              color: '#0f172a'
            }}
          >
            {skinConfig?.ctaText}
          </Button>

          {/* Trust Badge */}
          <div className="mt-12 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Confidential & Attorney-Client Privileged</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 bg-slate-950 border-t border-amber-900/30">
        <div className="max-w-4xl mx-auto text-center text-slate-400 text-sm">
          {skinConfig?.footerText}
        </div>
      </footer>
    </div>
  );
};

export default SplashPage;