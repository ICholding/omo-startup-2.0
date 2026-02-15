import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


import Button from '../../components/ui/Button';
import { getBranding } from '../../config/brandConfig';
import skinConfig from './config';

const SplashPage = () => {
  const navigate = useNavigate();
  const [branding, setBranding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState(null);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Header with Centered Agent Logo Profile */}
      <header className="w-full py-8 px-4 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
          {/* Agent Logo Profile - Centered */}
          <div className="relative">
            <div 
              className="w-24 h-24 rounded-full overflow-hidden shadow-lg mb-4 ring-4 ring-gray-400 ring-opacity-50 bg-black flex items-center justify-center"
            >
              <Terminal className="w-12 h-12 text-white" />
            </div>
          </div>
          
          {/* Company Name */}
          <h1 
            className="text-2xl font-bold text-center text-black"
          >
            {companyName}
          </h1>
          <p className="text-gray-600 text-center mt-2">
            {skinConfig?.tagline}
          </p>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {skinConfig?.headline}
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {skinConfig?.description}
          </p>

          {/* Features List */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {skinConfig?.features?.map((feature, index) => (
              <div 
                key={index}
                className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div 
                  className="text-3xl mb-3 flex justify-center"
                  style={{ color: primaryColor }}
                >
                  {feature?.icon?.startsWith('/') ? (
                    <img 
                      src={feature?.icon} 
                      alt={`${feature?.title} icon`}
                      className="w-16 h-16 rounded-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    feature?.icon
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {feature?.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature?.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleGetStarted}
            className="px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            style={{ 
              backgroundColor: primaryColor,
              color: 'white'
            }}
          >
            {skinConfig?.ctaText}
          </Button>
        </div>
      </main>
      {/* Footer */}
      <footer className="w-full py-6 px-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center text-gray-600 text-sm">
          {skinConfig?.footerText}
        </div>
      </footer>
    </div>
  );
};

export default SplashPage;