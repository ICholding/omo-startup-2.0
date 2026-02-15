import React from 'react';
import { useNavigate } from 'react-router-dom';

const SplashPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center max-w-xl p-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">OMO</h1>
        <p className="text-slate-600 mb-8">Secure execution with Moltbot-backed runtime.</p>
        <button
          onClick={() => navigate('/chat')}
          className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Open Chat
        </button>
      </div>
    </div>
  );
};

export default SplashPage;
