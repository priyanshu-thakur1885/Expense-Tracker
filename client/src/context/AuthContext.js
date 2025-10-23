import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up axios defaults
  useEffect(() => {
    // Set base URL for API calls
    axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Verify token on app load
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      const demoUser = localStorage.getItem('demoUser');
      
      if (token === 'demo-token-123' && demoUser) {
        // Demo mode - don't verify with server
        const userData = JSON.parse(demoUser);
        // Ensure the user ID is in the correct format
        userData.id = '507f1f77bcf86cd799439011';
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: userData,
            token
          }
        });
        return;
      } else if (token && token !== 'demo-token-123') {
        try {
          dispatch({ type: 'AUTH_START' });
          // Inside verifyToken or login
const response = await axios.get('/api/user/profile'); // GET full profile
dispatch({
  type: 'AUTH_SUCCESS',
  payload: {
    user: response.data.user, // now includes createdAt
    token
  }
});

        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Invalid token' });
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: null });
      }
    };

    verifyToken();
  }, []);

  const login = async (token) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
        // Check if it's demo mode
        if (token === 'demo-token-123') {
          const demoUser = localStorage.getItem('demoUser');
          if (demoUser) {
            const userData = JSON.parse(demoUser);
            // Ensure the user ID is in the correct format
            userData.id = '507f1f77bcf86cd799439011';
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: userData,
                token
              }
            });
            toast.success('Welcome to Demo Mode!');
            return true;
          }
        }
      
      const response = await axios.post('/api/auth/verify', { token });
      
      localStorage.setItem('token', token);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.data.user,
          token
        }
      });
      
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Login failed' });
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
