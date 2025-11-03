const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const User = require('../models/User');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.adminSockets = new Set(); // Set of admin socket IDs
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'campusbuddy-secret-key-2024';
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Setup Socket.IO middleware for authentication
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Allow demo mode token without JWT verification
        if (token === 'demo-token-123') {
          const demoUser = {
            _id: '507f1f77bcf86cd799439011',
            name: 'Demo Student',
            email: 'demo@lpu.in',
            photo: 'https://via.placeholder.com/150/3b82f6/ffffff?text=DS',
            isActive: true
          };

          socket.userId = demoUser._id;
          socket.user = demoUser;
          socket.isAdmin = false;
          return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId).select('-__v');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        // Add admin role to user object
        user.isAdmin = decoded.isAdmin || user.email === 'fun2begin8988@gmail.com';
        
        socket.userId = user._id.toString();
        socket.user = user;
        socket.isAdmin = user.isAdmin;
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  // Setup event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.name} (${socket.user.email}) - Admin: ${socket.isAdmin}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      // Broadcast presence to all clients
      this.io.emit('user-online', { userId: socket.userId });
      
      if (socket.isAdmin) {
        this.adminSockets.add(socket.id);
        socket.join('admin-room');
        console.log('Admin joined admin room');
      }

      // Join user to their personal room
      socket.join(`user-${socket.userId}`);

      // Handle sending messages
      socket.on('send-message', async (data) => {
        try {
          const { recipientId, message, isEncrypted = true } = data;
          
          console.log('📨 Server received message:', {
            from: socket.user.name,
            to: recipientId,
            message: message.substring(0, 50) + '...',
            isEncrypted
          });
          
          if (!recipientId || !message) {
            console.log('❌ Missing recipientId or message');
            socket.emit('error', { message: 'Recipient ID and message are required' });
            return;
          }

          // Encrypt message if requested
          const encryptedMessage = isEncrypted ? this.encryptMessage(message) : message;
          
          const messageData = {
            id: Date.now().toString(),
            senderId: socket.userId,
            senderName: socket.user.name,
            senderEmail: socket.user.email,
            recipientId,
            message: encryptedMessage,
            isEncrypted,
            timestamp: new Date(),
            senderIsAdmin: socket.isAdmin
          };

          // Send to recipient
          if (recipientId === 'admin') {
            console.log('📤 Sending message to admin room');
            this.io.to('admin-room').emit('receive-message', messageData);
          } else {
            console.log('📤 Sending message to room:', `user-${recipientId}`);
            this.io.to(`user-${recipientId}`).emit('receive-message', messageData);
          }
          
          // Send confirmation to sender
          console.log('✅ Sending confirmation to sender');
          socket.emit('message-sent', { 
            success: true, 
            messageId: messageData.id,
            timestamp: messageData.timestamp
          });

          // If admin sent message, notify other admins
          if (socket.isAdmin) {
            this.io.to('admin-room').emit('admin-message-sent', {
              ...messageData,
              recipientName: await this.getUserName(recipientId)
            });
          }

          console.log(`Message sent from ${socket.user.name} to user ${recipientId}`);
        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data) => {
        const { recipientId, isTyping } = data;
        if (recipientId) {
          this.io.to(`user-${recipientId}`).emit('user-typing', {
            senderId: socket.userId,
            senderName: socket.user.name,
            isTyping
          });
        }
      });

      // Handle getting online users (available to all authenticated users)
      socket.on('get-online-users', () => {
        const onlineUsers = Array.from(this.connectedUsers.keys()).map(userId => ({
          userId,
          socketId: this.connectedUsers.get(userId),
          isOnline: true
        }));
        socket.emit('online-users', onlineUsers);
      });

      // Handle getting user info (admin only)
      socket.on('get-user-info', async (userId) => {
        if (socket.isAdmin) {
          try {
            const user = await User.findById(userId).select('name email photo');
            socket.emit('user-info', { userId, user });
          } catch (error) {
            socket.emit('error', { message: 'Failed to get user info' });
          }
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.name}`);
        this.connectedUsers.delete(socket.userId);
        this.adminSockets.delete(socket.id);
        // Broadcast presence update
        this.io.emit('user-offline', { userId: socket.userId });
        
        // Notify admins about user going offline
        if (socket.isAdmin) {
          this.io.to('admin-room').emit('admin-disconnected', {
            userId: socket.userId,
            userName: socket.user.name
          });
        } else {
          this.io.to('admin-room').emit('user-disconnected', {
            userId: socket.userId,
            userName: socket.user.name
          });
        }
      });
    });
  }

  // Encrypt message using AES encryption
  encryptMessage(message) {
    try {
      return CryptoJS.AES.encrypt(message, this.encryptionKey).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      return message; // Return original message if encryption fails
    }
  }

  // Decrypt message using AES decryption
  decryptMessage(encryptedMessage) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedMessage; // Return encrypted message if decryption fails
    }
  }

  // Get user name by ID
  async getUserName(userId) {
    try {
      const user = await User.findById(userId).select('name');
      return user ? user.name : 'Unknown User';
    } catch (error) {
      console.error('Get user name error:', error);
      return 'Unknown User';
    }
  }

  // Send message to specific user (admin method)
  sendMessageToUser(userId, message, isEncrypted = true) {
    const encryptedMessage = isEncrypted ? this.encryptMessage(message) : message;
    
    this.io.to(`user-${userId}`).emit('admin-message', {
      message: encryptedMessage,
      isEncrypted,
      timestamp: new Date()
    });
  }

  // Broadcast to all users (admin method)
  broadcastToAllUsers(message, isEncrypted = true) {
    const encryptedMessage = isEncrypted ? this.encryptMessage(message) : message;
    
    this.io.emit('admin-broadcast', {
      message: encryptedMessage,
      isEncrypted,
      timestamp: new Date()
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get online admins count
  getOnlineAdminsCount() {
    return this.adminSockets.size;
  }
}

module.exports = SocketService;
