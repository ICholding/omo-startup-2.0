import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePageTransition, fadeVariants } from '../config/animations';

const DemoLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const pageVariants = usePageTransition(fadeVariants);

  const DEMO_PASSWORD = 'CodeVenom6!!!';

  const handleLogin = (e) => {
    e?.preventDefault();
    if (password === DEMO_PASSWORD) {
      navigate('/chat');
    } else {
      setError('Incorrect password');
      setTimeout(() => setError(''), 2000);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-black flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        {/* Container with gradient border effect */}
        <div className="bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 p-1 rounded-3xl shadow-2xl">
          <div className="bg-black rounded-3xl p-8">
            {/* LLM Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white tracking-widest">LLM</h1>
              <div className="flex justify-end gap-2 mt-2 px-4">
                <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-white text-lg mb-3">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e?.target?.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-transparent border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
                  autoFocus />
                
                {error &&
                <p className="text-red-500 text-sm mt-2">{error}</p>
                }
              </div>

              {/* Log In Button */}
              <button
                type="submit"
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 border border-gray-700">
                
                Log In
              </button>
            </form>

            {/* Welcome Text */}
            <div className="text-center mt-8">
              <p className="text-gray-400 text-sm font-mono">Welcome to OMO-AI</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

};

export default DemoLogin;