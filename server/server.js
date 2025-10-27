import express from 'express';
  const mongoose = require('mongoose');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const rateLimit = require('express-rate-limit');
  const session = require('express-session');
  const passport = require('passport');
  const { createServer } = require('http');
  const { Server } = require('socket.io');
  require('dotenv').config();

  // Import routes
  const authRoutes = require('./routes/auth');
  const expenseRoutes = require('./routes/expenses');
  const budgetRoutes = require('./routes/budget');
  const userRoutes = require('./routes/user');
  const adminRoutes = require('./routes/admin');
  const bugReportRoutes = require('./routes/bugReport');

  // Import passport configuration
  require('./config/passport');

  // Import Socket.IO service
  const SocketService = require('./services/socketService');

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  const PORT = process.env.PORT || 5000;

  // Security middleware
  app.use(helmet());

  // Rate limiting (disabled for development)
  if (process.env.NODE_ENV === 'production') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
  }

  // CORS configuration
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(morgan('combined'));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // MongoDB connection
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      // Log the current database name to verify connection
      console.log('Connected to database:', mongoose.connection.name);
      // List all collections
      mongoose.connection.db.listCollections().toArray().then(collections => {
        console.log('Available collections:', collections.map(c => c.name));
      });
    })
    .catch(err => console.error('MongoDB connection error:', err));
// Ensure uploads folder exists
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static('uploads'));
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/budget', budgetRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
app.use('/api/bugreport', bugReportRoutes); // ✅ corrected
  // AI routes removed

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'Expense Tracker API is running',
      timestamp: new Date().toISOString()
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
      message: 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  // Initialize Socket.IO service
  const socketService = new SocketService(io);

  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.IO server initialized`);
  });
