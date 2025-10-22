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
    if (hasHandled.current) return; // prevent multiple runs
    hasHandled.current = true;

    const handleAuthCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      console.log('🔁 AuthCallback triggered:', {
        tokenPresent: !!token,
        error,
        currentURL: window.location.href,
      });

      // If backend sent an error (auth_failed, no_user, etc.)
      if (error) {
        toast.error('Authentication failed. Please try again.');
        console.error('❌ Auth error:', error);
        navigate('/login');
        return;
      }

      // If token is present, try to log in
      if (token) {
        try {
          const success = await login(token);

          if (success) {
            toast.success('Signed in successfully!');
            navigate('/dashboard');
          } else {
            toast.error('Login failed. Please try again.');
            navigate('/login');
          }
        } catch (err) {
          console.error('❌ Auth callback login error:', err);
          toast.error('Something went wrong during login.');
          navigate('/login');
        }
      } else {
        // No token provided in URL
        toast.error('No authentication token received.');
        console.error('❌ No token received in callback URL.');
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
          Please wait while we finalize your login.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
