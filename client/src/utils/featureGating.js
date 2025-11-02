import React, { useState, useEffect } from 'react';
import { getSubscription } from '../services/paymentService';

// Plan hierarchy: basic < premium < pro
const PLAN_LEVELS = {
  basic: 1,
  premium: 2,
  pro: 3
};

// Feature requirements mapping
export const FEATURE_REQUIREMENTS = {
  voiceInput: 'premium',
  advancedAnalytics: 'premium',
  exportExcel: 'premium',
  aiInsights: 'premium',
  ocrScanner: 'pro',
  aiAssistant: 'pro',
  customWallpaper: 'pro',
  prioritySupport: 'pro'
};

/**
 * Check if user has access to a feature
 * @param {string} currentPlan - User's current plan (basic, premium, pro)
 * @param {string} requiredFeature - Feature name to check
 * @returns {boolean} - Whether user has access
 */
export const hasFeatureAccess = (currentPlan, requiredFeature) => {
  const requiredPlan = FEATURE_REQUIREMENTS[requiredFeature];
  if (!requiredPlan) {
    // Feature not in requirements list - allow by default
    return true;
  }

  const currentLevel = PLAN_LEVELS[currentPlan] || 0;
  const requiredLevel = PLAN_LEVELS[requiredPlan] || 999;

  return currentLevel >= requiredLevel;
};

/**
 * Get required plan name for a feature
 * @param {string} requiredFeature - Feature name
 * @returns {string} - Required plan name (premium or pro)
 */
export const getRequiredPlan = (requiredFeature) => {
  return FEATURE_REQUIREMENTS[requiredFeature] || 'premium';
};

/**
 * Hook to check subscription and feature access
 */
export const useFeatureAccess = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const response = await getSubscription();
      if (response.success) {
        setSubscription(response.subscription);
        return response.subscription;
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
    return null;
  };

  useEffect(() => {
    fetchSubscription().finally(() => {
      setLoading(false);
    });

    // Listen for subscription updates from payment success
    const handleSubscriptionUpdate = async () => {
      await fetchSubscription();
    };
    
    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
    };
  }, []);

  const checkAccess = (feature) => {
    if (!subscription) return false;
    return hasFeatureAccess(subscription.plan, feature);
  };

  const checkAccessWithRefresh = async (feature) => {
    // If subscription is already loaded, use it immediately (no delay)
    if (subscription) {
      const hasAccess = hasFeatureAccess(subscription.plan, feature);
      // Refresh in background for next time, but don't wait for it
      fetchSubscription().catch(err => console.error('Background refresh failed:', err));
      return hasAccess;
    }
    
    // Only refresh if subscription is not loaded yet
    const currentSub = await fetchSubscription();
    if (!currentSub) return false;
    return hasFeatureAccess(currentSub.plan, feature);
  };

  const getRequiredPlanForFeature = (feature) => {
    return getRequiredPlan(feature);
  };

  return {
    subscription,
    loading,
    checkAccess,
    checkAccessWithRefresh,
    refreshSubscription: fetchSubscription,
    getRequiredPlanForFeature,
    currentPlan: subscription?.plan || 'basic'
  };
};

