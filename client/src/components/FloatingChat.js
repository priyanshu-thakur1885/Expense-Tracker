import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Lock, Unlock, User, Shield } from 'lucide-react';
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

const FloatingChat = () => {
  const { socket, isConnected, messages, sendMessage, sendTyping } = useSocket();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const messagesEndRef = React.useRef(null);
  const typingTimeoutRef = React.useRef(null);

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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle typing
  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTyping('admin', true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping('admin', false);
    }, 1000);
  };

  // Send message to admin
  const handleSendMessage = () => {
    if (!message.trim()) return;

    const success = sendMessage('admin', message.trim(), false);
    if (success) {
      setMessage('');
      setIsTyping(false);
      sendTyping('admin', false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mark messages as read when chat opens
  const handleOpenChat = () => {
    setIsOpen(true);
    const currentTime = Date.now();
    localStorage.setItem('lastMessageRead', currentTime.toString());
    setHasUnreadMessages(false);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

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
          onClick={handleOpenChat}
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
              <div className="flex-1 flex flex-col">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-500" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start a conversation with admin</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-80">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {messages.map((msg, index) => {
                        const showDate = index === 0 || 
                          new Date(msg.timestamp).toDateString() !== 
                          new Date(messages[index - 1].timestamp).toDateString();
                        
                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="text-center text-xs text-gray-500 py-2">
                                {formatDate(msg.timestamp)}
                              </div>
                            )}
                            <div className={`flex ${msg.senderId === getCurrentUserId() ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-xs p-3 rounded-lg ${
                                  msg.senderId === getCurrentUserId()
                                    ? 'bg-green-600 text-white'
                                    : msg.senderId === 'admin'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-red-100 text-red-900'
                                }`}
                              >
                                {msg.senderId !== getCurrentUserId() && (
                                  <div className="flex items-center space-x-1 mb-1">
                                    <User className="w-3 h-3" />
                                    <span className={`text-xs font-medium ${
                                      msg.senderId === 'admin' ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {msg.senderName || 'Admin'}
                                    </span>
                                  </div>
                                )}
                                <p className={`text-sm ${
                                  msg.senderId === getCurrentUserId() 
                                    ? 'text-white' 
                                    : msg.senderId === 'admin'
                                    ? 'text-white'
                                    : 'text-gray-900'
                                }`}>{msg.message}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className={`text-xs opacity-75 ${
                                    msg.senderId === getCurrentUserId() 
                                      ? 'text-white' 
                                      : msg.senderId === 'admin'
                                      ? 'text-white'
                                      : 'text-gray-600'
                                  }`}>
                                    {formatTime(msg.timestamp)}
                                  </span>
                                  {msg.isEncrypted && (
                                    <Shield className="w-3 h-3 opacity-75" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-3 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={message}
                          onChange={handleTyping}
                          onKeyPress={handleKeyPress}
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!message.trim()}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setIsEncrypted(!isEncrypted)}
                            className={`p-1 rounded ${
                              isEncrypted 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                            title={isEncrypted ? 'Encrypted' : 'Unencrypted'}
                          >
                            {isEncrypted ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                          <span className="text-xs text-gray-500">
                            {isEncrypted ? 'Encrypted' : 'Unencrypted'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Press Enter to send
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChat;
