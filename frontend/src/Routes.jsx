import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import ChatInterface from './pages/chat-interface';
import DemoLogin from './pages/DemoLogin';

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <RouterRoutes location={location} key={location?.pathname}>
        {/* Define your route here */}
        <Route path="/" element={<DemoLogin />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/chat-interface" element={<ChatInterface />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
    </AnimatePresence>
  );
};

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <AnimatedRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
