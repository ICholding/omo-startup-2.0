import React, { useState, useEffect } from 'react';
import { loadSplashPage } from '../custom-skins/skinLoader';

const SplashPage = () => {
  const [SkinComponent, setSkinComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSkin = async () => {
      try {
        const component = await loadSplashPage();
        setSkinComponent(() => component);
      } catch (err) {
        console.error('Failed to load splash page skin:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSkin();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !SkinComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center max-w-md p-8">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-4">
            Unable to load the splash page. Please check your configuration.
          </p>
          <button
            onClick={() => window.location?.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <SkinComponent />;
};

export default SplashPage;