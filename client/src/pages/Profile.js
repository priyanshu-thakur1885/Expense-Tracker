import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Calendar, 
  Settings, 
  Save, 
  Edit3,
  Camera,
  Bell,
  Moon,
  Sun,
  DollarSign,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import notificationService from '../services/notificationService';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import UpgradeModal from '../components/UpgradeModal';
import { useFeatureAccess, hasFeatureAccess } from '../utils/featureGating';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { subscription, checkAccessWithRefresh, refreshSubscription } = useFeatureAccess();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [requiredPlanForFeature, setRequiredPlanForFeature] = useState('premium');
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
  const [wallpaperPreview, setWallpaperPreview] = useState(user?.wallpaper || '');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    monthlyLimit: 4000,
    currency: 'INR',
    notifications: true,
    theme: theme
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      const response = await axios.get('/api/budget');
      if (response.data && response.data.budget) {
        setBudget(response.data.budget);
        setFormData(prev => ({
          ...prev,
          monthlyLimit: response.data.budget.monthlyLimit || 4000
        }));
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
      // Set default budget values if API fails
      setBudget({
        currentSpent: 0,
        remainingBudget: 4000,
        spendingPercentage: 0,
        monthlyLimit: 4000
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await axios.put('/api/user/profile', {
        name: formData.name,
        preferences: {
          currency: formData.currency,
          notifications: formData.notifications,
          theme: formData.theme
        }
      });
      
      updateUser({
        ...user,
        name: formData.name,
        preferences: {
          ...user.preferences,
          currency: formData.currency,
          notifications: formData.notifications,
          theme: formData.theme
        }
      });
      
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    setLoading(true);
    try {
      await axios.post('/api/budget', {
        monthlyLimit: parseFloat(formData.monthlyLimit),
        currency: formData.currency
      });
      
      await fetchBudget();
      
      // Check budget status after update
      await notificationService.checkBudgetNow();
      
      toast.success('Budget updated successfully!');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    } finally {
      setLoading(false);
    }
  };

  const API_BASE = process.env.REACT_APP_API_URL || '';

  const handleExport = async () => {
    // Check if user has access to export (Premium feature) - refresh subscription first
    const hasAccess = await checkAccessWithRefresh('exportExcel');
    if (!hasAccess) {
      setRequiredPlanForFeature('premium');
      setShowUpgradeModal(true);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/user/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_export_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export started — downloading file');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setFormData(prev => ({
      ...prev,
      theme: theme === 'light' ? 'dark' : 'light'
    }));
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await axios.put('/api/user/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      updateUser({
        ...user,
        photo: response.data.user.photo
      });

      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Process image with HD quality preservation
  const processHDImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to maintain quality
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate dimensions (max 3840x2160 for 4K, but preserve aspect ratio)
          const maxWidth = 3840;
          const maxHeight = 2160;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          
          // Use high-quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with high quality
          const mimeType = file.type || 'image/jpeg';
          const quality = mimeType === 'image/png' ? 1.0 : 0.95; // PNG doesn't use quality
          const base64 = canvas.toDataURL(mimeType, quality);
          
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleWallpaperChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if user has Pro plan
    const hasAccess = await checkAccessWithRefresh('customWallpaper');
    if (!hasAccess) {
      setRequiredPlanForFeature('pro');
      setShowUpgradeModal(true);
      event.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (10MB limit for HD wallpapers)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploadingWallpaper(true);
    try {
      // Process image with HD quality preservation
      const processedImageDataUrl = await processHDImage(file);
      
      // Convert data URL to blob for upload (preserves quality)
      const response = await fetch(processedImageDataUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('wallpaper', blob, file.name || 'wallpaper.jpg');

      const uploadResponse = await axios.put('/api/user/wallpaper', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (uploadResponse.data.success) {
        // Update user with full user object from server to ensure we have all data
        // Use a small delay to ensure state updates don't cause race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
        updateUser(uploadResponse.data.user);
        setWallpaperPreview(uploadResponse.data.user.wallpaper);
        toast.success('Wallpaper updated successfully! 🎨');
      }
    } catch (error) {
      console.error('Error updating wallpaper:', error);
      if (error.response?.status === 403) {
        toast.error('Customized wallpaper is only available for Pro plan users');
        setRequiredPlanForFeature('pro');
        setShowUpgradeModal(true);
      } else {
        toast.error('Failed to update wallpaper');
      }
    } finally {
      setUploadingWallpaper(false);
      event.target.value = '';
    }
  };

  const handleRemoveWallpaper = async () => {
    const hasAccess = await checkAccessWithRefresh('customWallpaper');
    if (!hasAccess) {
      setRequiredPlanForFeature('pro');
      setShowUpgradeModal(true);
      return;
    }

    setUploadingWallpaper(true);
    try {
      const response = await axios.delete('/api/user/wallpaper');
      if (response.data.success && response.data.user) {
        updateUser(response.data.user);
      } else {
        // Fallback if user object not returned
        updateUser({
          ...user,
          wallpaper: ''
        });
      }
      setWallpaperPreview('');
      toast.success('Wallpaper removed successfully');
    } catch (error) {
      console.error('Error removing wallpaper:', error);
      toast.error('Failed to remove wallpaper');
    } finally {
      setUploadingWallpaper(false);
    }
  };

  useEffect(() => {
    if (user?.wallpaper) {
      setWallpaperPreview(user.wallpaper);
    }
  }, [user?.wallpaper]);

  // Listen for subscription updates from UpgradeModal
  useEffect(() => {
    const handleSubscriptionUpdate = async () => {
      await refreshSubscription();
    };
    
    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
    };
  }, [refreshSubscription]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center space-x-4">
          <div className="relative">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                className="w-20 h-20 rounded-full border-4 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/20">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className={`absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploadingPhoto ? (
                <LoadingSpinner size="xs" />
              ) : (
                <Camera className="w-3 h-3 text-gray-600" />
              )}
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-primary-100">Student</p>
            <p className="text-primary-200 text-sm">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profile Information
            </h2>
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label block mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!editing}
                className="input w-full"
              />
            </div>

            <div>
              <label className="label block mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="input w-full pl-10 bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="label block mb-2">Member Since</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  disabled
                  className="input w-full pl-10 bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>

            {editing && (
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Budget Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 mb-6">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label block mb-2">Monthly Budget Limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="monthlyLimit"
                  value={formData.monthlyLimit}
                  onChange={handleInputChange}
                  min="100"
                  max="50000"
                  className="input w-full pl-8"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Set your monthly food expense limit
              </p>
            </div>

            <div>
              <label className="label block mb-2">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            {budget && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300">Current Spent:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{(budget.currentSpent || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300">Remaining:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{(budget.remainingBudget || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (budget.spendingPercentage || 0) < 50 ? 'bg-success-500' :
                      (budget.spendingPercentage || 0) < 80 ? 'bg-warning-500' :
                      (budget.spendingPercentage || 0) < 100 ? 'bg-danger-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(budget.spendingPercentage || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {(budget.spendingPercentage || 0).toFixed(1)}% of budget used
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSaveBudget}
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Budget</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>
        </div>

        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-warning-500" />
              ) : (
                <Moon className="w-5 h-5 text-blue-500" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {theme === 'light' ? 'Light mode' : 'Dark mode'}
                </p>
              </div>
            </div>
            <button
              onClick={handleThemeToggle}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 transition-colors duration-200"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-primary-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Get notified about budget alerts and tips
                </p>
              </div>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, notifications: !prev.notifications }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                formData.notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  formData.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Customized Wallpaper (Pro Feature) */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                    <span>Customized Wallpaper</span>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">Pro</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Personalize your dashboard with HD wallpapers
                  </p>
                </div>
              </div>
            </div>

            {wallpaperPreview ? (
              <div className="relative mt-3 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                <img 
                  src={wallpaperPreview} 
                  alt="Wallpaper preview" 
                  className="w-full h-32 object-cover"
                  style={{ imageRendering: 'high-quality' }}
                />
                <button
                  onClick={handleRemoveWallpaper}
                  disabled={uploadingWallpaper}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
                  title="Remove wallpaper"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="mt-3 flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  {uploadingWallpaper ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload HD wallpaper
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Max 10MB • Recommended: 1920x1080 or higher
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWallpaperChange}
                  className="hidden"
                  disabled={uploadingWallpaper}
                />
              </label>
            )}
          </div>
        </div>
      </motion.div>

      {/* Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Actions
        </h2>
        
        <div className="space-y-3">
          <button onClick={handleExport} className="w-full text-left p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-900/30 transition-colors duration-200">
            <p className="font-medium text-warning-800 dark:text-warning-300">Export Data</p>
            <p className="text-sm text-warning-600 dark:text-warning-400">
              Download your expense data as CSV
            </p>
          </button>
          
          <button onClick={() => setShowDeleteModal(true)} className="w-full text-left p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors duration-200">
            <p className="font-medium text-danger-800 dark:text-danger-300">Delete Account</p>
            <p className="text-sm text-danger-600 dark:text-danger-400">
              Permanently delete your account and all data
            </p>
          </button>
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Confirm Account Deletion</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Type your full name (<span className="font-medium">{user?.name}</span>) to permanently delete your account.</p>
                <input type="text" value={deleteName} onChange={(e) => setDeleteName(e.target.value)} className="input w-full mb-4" placeholder="Enter your full name" />
                <div className="flex justify-end space-x-2">
                  <button onClick={() => { setShowDeleteModal(false); setDeleteName(''); }} className="btn btn-secondary">Cancel</button>
                  <button onClick={async () => {
                    if (deleteName.trim() !== user?.name) {
                      toast.error('Name does not match');
                      return;
                    }
                    setLoading(true);
                    try {
                      const resp = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/user/account`, {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ confirmName: deleteName.trim() })
                      });
                      if (resp.ok) {
                        toast.success('Account deleted');
                        // Remove local session and redirect
                        localStorage.removeItem('token');
                        window.location.href = '/';
                      } else {
                        const txt = await resp.text();
                        toast.error(txt || 'Failed to delete account');
                      }
                    } catch (err) {
                      console.error('Delete account error:', err);
                      toast.error('Failed to delete account');
                    } finally {
                      setLoading(false);
                    }
                  }} className="btn btn-danger">Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        requiredPlan={requiredPlanForFeature}
        onPaymentSuccess={async () => {
          // Refresh subscription in feature gating hook
          await refreshSubscription();
          // Small delay to ensure backend has processed
          setTimeout(() => {
            toast.success('Your subscription has been updated! You can now use Pro features.');
          }, 500);
        }}
      />
    </div>
  );
};

export default Profile;
