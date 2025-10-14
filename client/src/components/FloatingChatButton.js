import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

// Helper function to get current user ID from token
const getCurrentUserId = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

const FloatingChatButton = () => {
  const { messages, isConnected } = useSocket();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Check for unread messages
  useEffect(() => {
    const lastReadTime = parseInt(localStorage.getItem('lastMessageRead') || '0');
    const currentUserId = getCurrentUserId();
    const unreadCount = messages.filter(msg => 
      msg.senderId !== currentUserId && 
      new Date(msg.timestamp).getTime() > lastReadTime
    ).length;
    setHasUnreadMessages(unreadCount > 0);
  }, [messages]);

  // Don't show for admin users
  if (user?.isAdmin) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-colors duration-200"
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnreadMessages && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {messages.filter(msg => 
                msg.senderId !== getCurrentUserId() && 
                new Date(msg.timestamp).getTime() > parseInt(localStorage.getItem('lastMessageRead') || '0')
              ).length}
            </span>
          )}
        </button>
      </motion.div>

      {/* Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl w-full max-w-md h-96 flex flex-col"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-medium text-gray-900">Contact Admin</h3>
                    {isConnected && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Online
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 p-4">
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-500" />
                  <p className="text-sm">Chat with admin</p>
                  <p className="text-xs mt-1">Click the floating button to start a conversation</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChatButton;
