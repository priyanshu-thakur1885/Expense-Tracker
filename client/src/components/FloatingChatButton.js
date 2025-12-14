import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AIAssistant from './AIAssistant';

const FloatingChatButton = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show for admin users
  if (user?.isAdmin) {
    return null;
  }

  return (
    <>
      {/* Floating AI Assistant Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-[99999]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="AI Assistant"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-green-400 rounded-full w-3 h-3 animate-pulse"></span>
        </button>
      </motion.div>

      {/* AI Assistant Chat */}
      <AIAssistant isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default FloatingChatButton;
