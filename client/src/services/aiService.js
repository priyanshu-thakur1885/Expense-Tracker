import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Send a message to the AI assistant
 * @param {string} message - User's message
 * @returns {Promise<string>} - AI assistant's response
 */
export const sendAIMessage = async (message) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_URL}/api/ai/chat`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      return response.data.response;
    } else {
      throw new Error(response.data.message || 'Failed to get AI response');
    }
  } catch (error) {
    console.error('AI service error:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Please log in to use the AI assistant');
    } else if (error.response?.status === 500) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    } else if (error.message.includes('GEMINI_API_KEY') || 
               error.message.includes('GROQ_API_KEY') || 
               error.message.includes('HUGGINGFACE_API_KEY')) {
      throw new Error('AI service is not configured. Please contact support.');
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Failed to communicate with AI assistant');
    }
  }
};

export default {
  sendAIMessage
};
