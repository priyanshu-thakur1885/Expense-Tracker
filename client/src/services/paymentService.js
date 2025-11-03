import axios from 'axios';

// Use axios defaults (baseURL and auth headers are set in AuthContext)
export const createPaymentOrder = async (plan) => {
  try {
    console.log('Creating payment order for plan:', plan);
    const response = await axios.post('/api/payment/create-order', {
      plan
    });
    console.log('Payment order created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating payment order:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Extract and format a better error message
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to create payment order';
    
    // Create a new error with the formatted message
    const formattedError = new Error(errorMessage);
    formattedError.response = error.response;
    formattedError.status = error.response?.status;
    throw formattedError;
  }
};

export const verifyPayment = async (paymentData) => {
  try {
    console.log('Verifying payment:', paymentData);
    const response = await axios.post('/api/payment/verify-payment', paymentData);
    console.log('Payment verified successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const getSubscription = async () => {
  try {
    const response = await axios.get('/api/payment/subscription');
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};
