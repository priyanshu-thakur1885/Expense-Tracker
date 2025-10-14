import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Users, 
  X, 
  Shield, 
  Lock,
  Unlock,
  User,
  Clock,
  CheckCircle,
  Mail
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

// Helper function to get current user ID from token (same as SocketContext)
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

const UserMessaging = ({ users }) => {
  const { socket, isConnected, messages, sendMessage, sendTyping, getOnlineUsers, onlineUsers } = useSocket();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [userInfo, setUserInfo] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get online users when component mounts
  useEffect(() => {
    if (isConnected && user?.isAdmin) {
      getOnlineUsers();
    }
  }, [isConnected, user?.isAdmin]);

  // Handle typing
  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (selectedUser) {
      if (!isTyping) {
        setIsTyping(true);
        sendTyping(selectedUser.id, true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTyping(selectedUser.id, false);
      }, 1000);
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (!message.trim() || !selectedUser) {
      console.log('❌ Cannot send message - Message:', message.trim(), 'Selected User:', selectedUser);
      return;
    }

    console.log('📤 Sending message:', {
      message: message.trim(),
      recipientId: selectedUser.id,
      isEncrypted,
      currentUser: user?._id
    });

    const success = sendMessage(selectedUser.id, message.trim(), false); // Temporarily disable encryption
    if (success) {
      console.log('✅ Message sent successfully');
      setMessage('');
      setIsTyping(false);
      if (selectedUser) {
        sendTyping(selectedUser.id, false);
      }
    } else {
      console.log('❌ Failed to send message');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get user info
  const getUserInfo = (userId) => {
    if (!socket || !isConnected) return;
    socket.emit('get-user-info', userId);
  };

  // Select user
  const handleSelectUser = (user) => {
    console.log('👤 Selecting user:', user);
    setSelectedUser(user);
    getUserInfo(user.id); // Use user.id instead of user.userId
    setIsOpen(true);
  };

  // Get messages for selected user
  const getUserMessages = () => {
    if (!selectedUser) return [];
    const currentUserId = getCurrentUserId();
    console.log('🔍 Getting messages for user:', selectedUser.id);
    console.log('📨 All messages:', messages);
    console.log('👤 Current user ID (from token):', currentUserId);
    console.log('👤 Current user ID (from auth):', user?._id);
    console.log('👤 Current user object:', user);
    
    const filteredMessages = messages.filter(msg => {
      console.log('🔍 Checking message:', {
        msgSenderId: msg.senderId,
        msgRecipientId: msg.recipientId,
        selectedUserId: selectedUser.id,
        currentUserIdFromToken: currentUserId,
        currentUserIdFromAuth: user?._id,
        isTemporary: msg.isTemporary
      });
      
      // Messages from selected user to admin
      const fromSelectedUser = msg.senderId === selectedUser.id && 
        (msg.recipientId === currentUserId || msg.recipientId === 'admin' || msg.recipientId === undefined);
      
      // Messages from admin to selected user (use token-based ID)
      const fromAdmin = msg.senderId === currentUserId && msg.recipientId === selectedUser.id;
      
      // Temporary messages (sent by current user)
      const isTemporaryFromAdmin = msg.isTemporary && msg.senderId === currentUserId;
      
      const shouldInclude = fromSelectedUser || fromAdmin || isTemporaryFromAdmin;
      
      if (shouldInclude) {
        console.log('✅ Including message:', msg.message);
      } else {
        console.log('❌ Excluding message:', msg.message);
      }
      
      return shouldInclude;
    });
    
    console.log('✅ Filtered messages:', filteredMessages);
    return filteredMessages;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-medium text-gray-900">Direct Messaging</h3>
            {isConnected && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Online
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="p-6">
        {!isOpen ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Click the message icon to start chatting with users</p>
          </div>
        ) : (
          <div className="flex h-96">
            {/* User List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Users ({users.length})
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {users.map((user) => {
                  const isOnline = onlineUsers.some(online => online.userId === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full p-3 text-left hover:bg-gray-100 transition-colors ${
                        selectedUser?.id === user.id ? 'bg-red-100' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {isOnline ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b border-red-200 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">
                          {selectedUser.name}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${onlineUsers.some(online => online.userId === selectedUser.id) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
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
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {getUserMessages().map((msg) => {
                      const currentUserId = getCurrentUserId();
                      const isFromCurrentUser = msg.senderId === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs p-2 rounded-lg ${
                              isFromCurrentUser
                                ? 'bg-green-600 text-white'
                                : 'bg-red-100 text-red-900'
                            }`}
                          >
                            <p className={`text-sm ${isFromCurrentUser ? 'text-white' : 'text-red-900'}`}>{msg.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-xs opacity-75 ${isFromCurrentUser ? 'text-white' : 'text-red-700'}`}>
                                {formatTime(msg.timestamp)}
                              </span>
                              {msg.isEncrypted && (
                                <Shield className="w-3 h-3 opacity-75" />
                              )}
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
                      <span className="text-xs text-red-600">
                        {isEncrypted ? 'End-to-end encrypted' : 'Unencrypted message'}
                      </span>
                      <span className="text-xs text-red-600">
                        Press Enter to send
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a user to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMessaging;