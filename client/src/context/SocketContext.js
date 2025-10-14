import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  const encryptionKey = 'campusbuddy-secret-key-2024'; // Should match server key

  // Message persistence functions
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

  const saveMessagesToStorage = (messagesToSave) => {
    const userId = getCurrentUserId();
    if (userId) {
      localStorage.setItem(`chat_messages_${userId}`, JSON.stringify(messagesToSave));
      console.log('💾 Saved messages to localStorage:', messagesToSave.length);
    }
  };

  const loadMessagesFromStorage = () => {
    const userId = getCurrentUserId();
    if (userId) {
      const savedMessages = localStorage.getItem(`chat_messages_${userId}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          console.log('📂 Loaded messages from localStorage:', parsedMessages.length);
          return parsedMessages;
        } catch (error) {
          console.error('Error parsing saved messages:', error);
        }
      }
    }
    return [];
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Load saved messages from localStorage
    const savedMessages = loadMessagesFromStorage();
    setMessages(savedMessages);

    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      console.log('🔗 Server URL:', process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚨 Socket connection error:', error);
      console.error('🔗 Attempted URL:', process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
      setIsConnected(false);
    });

    // Message events
    newSocket.on('receive-message', (messageData) => {
      console.log('📨 Received message:', messageData);
      console.log('🎯 Message recipient ID:', messageData.recipientId);
      
      const newMessage = {
        ...messageData,
        message: messageData.isEncrypted ? decryptMessage(messageData.message) : messageData.message
      };
      
      // If message is not encrypted, use it as is
      if (!messageData.isEncrypted) {
        newMessage.message = messageData.message;
        console.log('📝 Using unencrypted message:', newMessage.message);
      }
      
      console.log('🔍 Message processing:', {
        originalMessage: messageData.message,
        isEncrypted: messageData.isEncrypted,
        finalMessage: newMessage.message
      });
      
      setMessages(prev => {
        console.log('📝 Adding message to state:', newMessage);
        console.log('📊 Previous messages count:', prev.length);
        
        // Check if this is a message we sent (to replace temporary message)
        const currentUserId = getCurrentUserId();
        if (newMessage.senderId === currentUserId) {
          // Replace temporary message with confirmed one
          const updatedMessages = prev.map(msg => 
            msg.isTemporary && msg.senderId === currentUserId && msg.message === newMessage.message
              ? { ...newMessage, isTemporary: false }
              : msg
          );
          
          // If no temporary message found, just add the new message
          if (!updatedMessages.some(msg => msg.id === newMessage.id)) {
            updatedMessages.push({ ...newMessage, isTemporary: false });
          }
          
          saveMessagesToStorage(updatedMessages);
          return updatedMessages;
        } else {
          // Regular message from another user
          const updatedMessages = [...prev, { ...newMessage, isTemporary: false }];
          saveMessagesToStorage(updatedMessages);
          return updatedMessages;
        }
      });
    });

    newSocket.on('admin-message', (messageData) => {
      console.log('Received admin message:', messageData);
      setMessages(prev => {
        const updatedMessages = [...prev, {
          id: Date.now().toString(),
          senderId: 'admin',
          senderName: 'Admin',
          message: messageData.isEncrypted ? decryptMessage(messageData.message) : messageData.message,
          timestamp: messageData.timestamp,
          senderIsAdmin: true
        }];
        saveMessagesToStorage(updatedMessages);
        return updatedMessages;
      });
    });

    newSocket.on('admin-broadcast', (messageData) => {
      console.log('Received admin broadcast:', messageData);
      setMessages(prev => {
        const updatedMessages = [...prev, {
          id: Date.now().toString(),
          senderId: 'admin',
          senderName: 'Admin',
          message: messageData.isEncrypted ? decryptMessage(messageData.message) : messageData.message,
          timestamp: messageData.timestamp,
          senderIsAdmin: true,
          isBroadcast: true
        }];
        saveMessagesToStorage(updatedMessages);
        return updatedMessages;
      });
    });

    // Typing events
    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.senderId]: data.isTyping ? data.senderName : null
      }));
    });

    // Online users events (admin only)
    newSocket.on('online-users', (users) => {
      console.log('👥 Online users received:', users);
      setOnlineUsers(users);
    });

    newSocket.on('user-info', (data) => {
      console.log('User info received:', data);
    });

    // Admin events
    newSocket.on('admin-message-sent', (data) => {
      console.log('Admin message sent:', data);
    });

    newSocket.on('user-disconnected', (data) => {
      console.log('User disconnected:', data);
      setOnlineUsers(prev => prev.filter(user => user.userId !== data.userId));
    });

    newSocket.on('admin-disconnected', (data) => {
      console.log('Admin disconnected:', data);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Encryption/Decryption functions
  const encryptMessage = (message) => {
    try {
      return CryptoJS.AES.encrypt(message, encryptionKey).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      return message;
    }
  };

  const decryptMessage = (encryptedMessage) => {
    try {
      console.log('🔓 Decrypting message:', encryptedMessage);
      console.log('🔑 Using key:', encryptionKey);
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      console.log('✅ Decrypted message:', decrypted);
      
      // If decryption failed and returned empty string, return original
      if (!decrypted || decrypted.trim() === '') {
        console.log('⚠️ Decryption returned empty, returning original');
        return encryptedMessage;
      }
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      console.log('🔓 Returning original encrypted message');
      return encryptedMessage;
    }
  };

  // Socket methods
  const sendMessage = (recipientId, message, isEncrypted = true) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return false;
    }

    const encryptedMessage = isEncrypted ? encryptMessage(message) : message;
    
    // Add message to local state immediately for instant UI feedback
    const tempMessage = {
      id: Date.now().toString(),
      senderId: getCurrentUserId(),
      senderName: 'You', // Will be updated when received back from server
      recipientId,
      message: message, // Show original message, not encrypted
      isEncrypted,
      timestamp: new Date(),
      isTemporary: true // Mark as temporary until confirmed by server
    };
    
    console.log('📝 Adding message to local state immediately:', tempMessage);
    setMessages(prev => {
      const updatedMessages = [...prev, tempMessage];
      saveMessagesToStorage(updatedMessages);
      return updatedMessages;
    });
    
    socket.emit('send-message', {
      recipientId,
      message: encryptedMessage,
      isEncrypted
    });

    return true;
  };

  const sendTyping = (recipientId, isTyping) => {
    if (!socket || !isConnected) return;
    
    socket.emit('typing', {
      recipientId,
      isTyping
    });
  };

  const getOnlineUsers = () => {
    if (!socket || !isConnected) {
      console.log('❌ Cannot get online users - Socket:', !!socket, 'Connected:', isConnected);
      return;
    }
    console.log('📡 Requesting online users...');
    socket.emit('get-online-users');
  };

  const getUserInfo = (userId) => {
    if (!socket || !isConnected) return;
    socket.emit('get-user-info', userId);
  };

  const clearMessages = () => {
    setMessages([]);
    const userId = getCurrentUserId();
    if (userId) {
      localStorage.removeItem(`chat_messages_${userId}`);
      console.log('🗑️ Cleared messages from localStorage');
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    messages,
    typingUsers,
    sendMessage,
    sendTyping,
    getOnlineUsers,
    getUserInfo,
    clearMessages,
    encryptMessage,
    decryptMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
