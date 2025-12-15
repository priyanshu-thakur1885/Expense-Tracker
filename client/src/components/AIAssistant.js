import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Sparkles, ThumbsUp, ThumbsDown, ShieldQuestion } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import aiService from '../services/aiService';
import toast from 'react-hot-toast';

const AIAssistant = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello ${user?.name || 'there'}! 👋 I'm your expense assistant.\nI can:\n• Add/update/delete expenses (tell me the details)\n• Show monthly summary / category comparisons\n• Explain spending spikes\n\nWhat would you like to do?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [isOpen, user?.name]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message
    const newUserMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Get AI response
      const result = await aiService.sendAIMessage({ message: userMessage });

      // Add AI response
      const newAIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toISOString(),
        interactionId: result.interactionId,
        patternId: result.patternId,
        intent: result.intent,
        confidence: result.confidence,
        clarification: result.clarification,
        feedback: 0,
      };

      setMessages(prev => [...prev, newAIMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      toast.error(error.message || 'Failed to get AI response');
      
      // Add error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFeedback = async (messageId, rating, interactionId, patternId) => {
    if (!interactionId) return;
    // optimistic update
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
    try {
      await aiService.sendFeedback({ interactionId, rating, patternId });
      toast.success('Feedback sent');
    } catch (error) {
      toast.error(error.message || 'Failed to send feedback');
      // rollback
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: 0 } : m));
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 z-[99999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white rounded-full p-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
                  <p className="text-xs text-blue-100">Powered by your expense data</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {message.role === 'assistant' && !message.isError && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium opacity-75">AI Assistant</span>
                        {message.clarification && (
                          <div className="flex items-center text-amber-600 text-xs space-x-1">
                            <ShieldQuestion className="w-3 h-3" />
                            <span>low confidence</span>
                          </div>
                        )}
                      </div>
                      {typeof message.confidence === 'number' && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                          conf {message.confidence.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                  {message.role === 'assistant' && !message.isError && message.interactionId && (
                    <div className="flex items-center space-x-2 mt-3">
                      <button
                        onClick={() => handleFeedback(message.id, 1, message.interactionId, message.patternId)}
                        className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${
                          message.feedback === 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                        }`}
                        aria-label="Thumbs up"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Helpful</span>
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, -1, message.interactionId, message.patternId)}
                        className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${
                          message.feedback === -1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                        }`}
                        aria-label="Thumbs down"
                      >
                        <ThumbsDown className="w-3 h-3" />
                        <span>Not helpful</span>
                      </button>
                    </div>
                  )}

                  <div className={`text-xs mt-2 opacity-75 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your expenses..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Press Enter to send • AI responses are based on your expense data
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIAssistant;

