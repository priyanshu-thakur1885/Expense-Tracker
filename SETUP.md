# 🚀 Expense Tracker Setup Guide

This guide will help you set up the Expense Tracker application on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)
- **Code Editor** (VS Code recommended) - [Download here](https://code.visualstudio.com/)

## 🔧 Step-by-Step Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone <your-repository-url>
cd expense-tracker

# Verify the project structure
ls -la
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install-all

# This will install:
# - Root dependencies (concurrently for running both servers)
# - Server dependencies (Express, MongoDB, etc.)
# - Client dependencies (React, Tailwind, etc.)
```

### 3. Set Up MongoDB

#### Option A: Local MongoDB
```bash
# Start MongoDB service
# On Windows:
net start MongoDB

# On macOS (with Homebrew):
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update the `MONGODB_URI` in your `.env` file

### 4. Configure Google OAuth

#### Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback`
5. Copy your Client ID and Client Secret

### 5. Environment Configuration

#### Create Server Environment File
```bash
# Navigate to server directory
cd server

# Create .env file
touch .env  # On Windows: type nul > .env
```

#### Add Environment Variables
Open `server/.env` and add the following:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/expense-tracker
# For MongoDB Atlas, use:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expense-tracker

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT & Session Secrets (generate strong random strings)
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_SECRET=your_super_secret_session_key_here

# Client URL
CLIENT_URL=http://localhost:3000
```

#### Generate Secret Keys
```bash
# Generate random strings for secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6. Start the Application

#### Development Mode (Recommended)
```bash
# From the root directory
npm run dev

# This will start both server and client concurrently
# Server: http://localhost:5000
# Client: http://localhost:3000
```

#### Manual Start (Alternative)
```bash
# Terminal 1 - Start Backend Server
cd server
npm run dev

# Terminal 2 - Start Frontend Client
cd client
npm start
```

### 7. Verify Installation

1. **Backend Health Check**: Visit http://localhost:5000/api/health
   - Should return: `{"status":"OK","message":"Expense Tracker API is running"}`

2. **Frontend Application**: Visit http://localhost:3000
   - Should show the login page with Google OAuth button

3. **Google OAuth**: Click "Continue with Google"
   - Should redirect to Google login
   - After login, should redirect back to dashboard

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running
```bash
# Check MongoDB status
# On Windows:
sc query MongoDB

# On macOS:
brew services list | grep mongodb

# On Linux:
sudo systemctl status mongod
```

#### 2. Google OAuth Error
```
Error: redirect_uri_mismatch
```
**Solution**: 
- Check your Google OAuth redirect URI
- Ensure it matches exactly: `http://localhost:5000/api/auth/google/callback`
- Make sure the domain is added to authorized origins

#### 3. Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution**: 
- Kill the process using the port
```bash
# Find process using port 5000
lsof -ti:5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### 4. Module Not Found Errors
```
Error: Cannot find module 'express'
```
**Solution**: Reinstall dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
cd server && rm -rf node_modules package-lock.json
cd ../client && rm -rf node_modules package-lock.json
cd ..

# Reinstall
npm run install-all
```

#### 5. CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**: 
- Check `CLIENT_URL` in server `.env` file
- Ensure it matches your frontend URL exactly
- Restart the server after changing environment variables

### Environment Variables Checklist

Make sure all these variables are set in `server/.env`:

- ✅ `NODE_ENV=development`
- ✅ `PORT=5000`
- ✅ `MONGODB_URI` (local or Atlas)
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `JWT_SECRET` (strong random string)
- ✅ `SESSION_SECRET` (strong random string)
- ✅ `CLIENT_URL=http://localhost:3000`

## 🧪 Testing the Application

### 1. User Registration/Login
- Click "Continue with Google"
- Complete Google OAuth flow
- Should redirect to dashboard

### 2. Add First Expense
- Click "Add Expense" button
- Fill in the form:
  - Item: "Chicken Biryani"
  - Amount: "120"
  - Category: "Lunch"
  - Food Court: "Central Food Court"
- Click "Save Expense"

### 3. View Dashboard
- Should show budget status
- Should display recent expenses
- Should show spending statistics

### 4. Test Analytics
- Navigate to Analytics page
- Should show charts and insights
- Should display spending patterns

## 📱 Mobile Testing

The application is fully responsive. Test on mobile devices:

1. **Chrome DevTools**: 
   - Press F12
   - Click device toggle icon
   - Select mobile device

2. **Real Device**:
   - Connect to same network
   - Access `http://your-ip:3000`
   - Test touch interactions

## 🚀 Production Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set build settings:
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/build`
4. Deploy

### Backend (Render/Heroku)
1. Connect GitHub repository
2. Set environment variables
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`

### Database (MongoDB Atlas)
1. Create production cluster
2. Update `MONGODB_URI` in production environment
3. Configure network access
4. Set up database users

## 📞 Getting Help

If you encounter issues:

1. **Check the logs**: Look at terminal output for error messages
2. **Verify environment variables**: Ensure all required variables are set
3. **Check network connectivity**: Ensure MongoDB and Google OAuth are accessible
4. **Review the documentation**: Check README.md for detailed information
5. **Create an issue**: Report bugs or ask questions in the repository

## 🎉 Success!

If everything is working correctly, you should see:

- ✅ Backend server running on port 5000
- ✅ Frontend application running on port 3000
- ✅ Google OAuth login working
- ✅ Dashboard displaying correctly
- ✅ Ability to add/view expenses
- ✅ Analytics charts rendering
- ✅ Responsive design on mobile

**Congratulations! You've successfully set up Expense Tracker! 🎊**

---

**Need help?** Check the [README.md](README.md) for more detailed information about features and usage.
