import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

export const createPaymentOrder = async (plan) => {
  try {
    const response = await axios.post(`${API_BASE}/api/payment/create-order`, {
      plan
    });
    return response.data;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

export const verifyPayment = async (paymentData) => {
  try {
    const response = await axios.post(`${API_BASE}/api/payment/verify-payment`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

export const getSubscription = async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/payment/subscription`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};
