import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const hasHandled = useRef(false);

  useEffect(() => {
    if (hasHandled.current) return; // prevent multiple executions
    hasHandled.current = true;
    const handleAuthCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
        return;
      }

      if (token) {
        const success = await login(token);
        if (success) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        toast.error('No authentication token received.');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Completing sign in...
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
