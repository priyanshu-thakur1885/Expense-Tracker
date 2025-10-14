# 💰 Expense Tracker - Smart Expense Management

A comprehensive expense tracking web application designed for students to monitor and control their daily expenses with intelligent insights and budget management.

## 🌟 Features

### 🔐 Authentication
- **Google OAuth 2.0** - Secure login with Google accounts
- **JWT Token Management** - Secure session handling
- **Protected Routes** - User-specific data access

### 💰 Expense Tracking
- **Add Expenses** - Track food items, amounts, categories, and food courts
- **Edit & Delete** - Full CRUD operations for expense management
- **Smart Categories** - Breakfast, Lunch, Dinner, Snacks, Beverages, Other
- **Location Integration** - Track expenses by location
- **Tags & Descriptions** - Additional metadata for better organization

### 📊 Budget Management
- **Monthly Budget Limits** - Set and track spending limits
- **Real-time Monitoring** - Live budget status with visual indicators
- **Daily Targets** - Automatic calculation of daily spending goals
- **Smart Alerts** - Notifications at 50%, 80%, and 100% budget usage

### 📈 Analytics & Insights
- **Interactive Charts** - Pie charts, bar charts, and line graphs
- **Spending Patterns** - Category-wise and food court-wise analysis
- **Trend Analysis** - Daily, weekly, and monthly spending trends
- **Smart Recommendations** - AI-powered savings suggestions
- **Budget Status** - Visual progress indicators with color coding

### 🎨 Modern UI/UX
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Dark/Light Mode** - Theme switching with system preference detection
- **Smooth Animations** - Framer Motion for delightful interactions
- **Toast Notifications** - Real-time feedback for user actions
- **Loading States** - Proper loading indicators throughout the app

### 🔔 Notifications & Motivation
- **Budget Alerts** - Smart notifications for budget milestones
- **Savings Tips** - Dynamic recommendations based on spending patterns
- **Achievement System** - Motivational messages for good spending habits
- **Weekly Summaries** - Automated progress reports

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with Hooks and Context API
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library for smooth transitions
- **Recharts** - Data visualization and charting
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests
- **React Hot Toast** - Toast notifications
- **Lucide React** - Beautiful icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens for session management
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger

### Development Tools
- **Nodemon** - Development server auto-restart
- **Concurrently** - Run multiple commands simultaneously
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Google OAuth credentials

### 1. Clone the Repository
```bash
git clone <repository-url>
cd expense-tracker
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (root, server, and client)
npm run install-all
```

### 3. Environment Setup

#### Server Environment
Create a `.env` file in the `server` directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
CLIENT_URL=http://localhost:3000
```

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)

### 4. Database Setup
Make sure MongoDB is running:
```bash
# Start MongoDB (if installed locally)
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env file
```

### 5. Run the Application
```bash
# Development mode (runs both server and client)
npm run dev

# Or run separately:
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm start
```

### 6. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## 📁 Project Structure

```
expense-tracker/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context providers
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Node.js backend
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── server.js           # Main server file
│   └── package.json
├── package.json            # Root package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout user

### Expenses
- `GET /api/expenses` - Get user expenses (with pagination and filters)
- `POST /api/expenses` - Create new expense
- `GET /api/expenses/:id` - Get specific expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/stats/summary` - Get expense statistics

### Budget
- `GET /api/budget` - Get user budget
- `POST /api/budget` - Create/update budget
- `PUT /api/budget` - Update budget settings
- `POST /api/budget/reset` - Reset budget for new month
- `GET /api/budget/insights` - Get budget insights and recommendations

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/preferences` - Update user preferences
- `GET /api/user/dashboard` - Get dashboard data
- `DELETE /api/user/account` - Delete user account

## 🎯 Key Features Explained

### Smart Budget Management
- **Automatic Daily Targets**: Calculates daily spending limits based on remaining budget and days left in month
- **Visual Progress Indicators**: Color-coded progress bars (Green: Safe, Orange: Warning, Red: Danger)
- **Real-time Updates**: Budget status updates immediately when expenses are added/modified

### Intelligent Analytics
- **Category Analysis**: Understand spending patterns across different meal types
- **Food Court Comparison**: Identify which food courts are most/least expensive
- **Trend Visualization**: Track spending patterns over time with interactive charts
- **Smart Recommendations**: AI-powered suggestions for saving money

### User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode**: Eye-friendly dark theme with system preference detection
- **Smooth Animations**: Delightful micro-interactions using Framer Motion
- **Toast Notifications**: Real-time feedback for all user actions

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Helmet.js**: Security headers and protection against common vulnerabilities
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Server-side validation for all inputs
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Environment Variables**: Sensitive data stored in environment variables

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `cd client && npm run build`
3. Set output directory: `client/build`
4. Add environment variables if needed

### Backend (Render/Heroku)
1. Connect your GitHub repository
2. Set build command: `cd server && npm install`
3. Set start command: `cd server && npm start`
4. Add environment variables in dashboard

### Database (MongoDB Atlas)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LPU Community** - For inspiration and feedback
- **React Team** - For the amazing React framework
- **Tailwind CSS** - For the utility-first CSS framework
- **MongoDB** - For the flexible database solution
- **Google** - For OAuth authentication services

## 📞 Support

For support, email support@expensetracker.com or join our Discord community.

---

**Made with ❤️ for Students**
