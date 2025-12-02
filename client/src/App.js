import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import FloatingChatButton from "./components/FloatingChatButton";  // ⭐ ADD THIS

// Pages (lazy)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const AddExpense = lazy(() => import('./pages/AddExpense'));
const EditExpense = lazy(() => import('./pages/EditExpense'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminBugReports = lazy(() => import('./pages/AdminBugReports'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

function App() {

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.error('Service Worker Error:', err));
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <Router>
              
              {/* ⭐ Floating Chat Button OUTSIDE Layout */}
              <FloatingChatButton />

              <Suspense fallback={
                <div className="flex items-center justify-center h-screen">
                  <LoadingSpinner size="xl" />
                </div>
              }>

                <Routes>

                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />

                  {/* Protected Routes */}
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >

                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="expenses" element={<Expenses />} />
                    <Route path="add-expense" element={<AddExpense />} />
                    <Route path="edit-expense/:id" element={<EditExpense />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="admin" element={<AdminDashboard />} />
                    <Route path="admin/bugreports" element={<AdminBugReports />} />

                  </Route>

                  {/* Catch ALL */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />

                </Routes>

              </Suspense>

              {/* Toaster */}
              <Toaster position="top-right" />

            </Router>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
