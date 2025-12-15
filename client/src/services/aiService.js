import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Send a message to the AI assistant.
 * Optional: include expense payload for CRUD intents.
 */
export const sendAIMessage = async ({ message, expense }) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to use the AI assistant');

  try {
    const response = await axios.post(
      `${API_URL}/api/ai/chat`,
      { message, expense },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get AI response');
    }

    return {
      text: response.data.response,
      interactionId: response.data.interactionId,
      confidence: response.data.confidence,
      patternId: response.data.patternId,
      intent: response.data.intent,
      clarification: response.data.clarification,
    };
  } catch (error) {
    console.error('AI service error:', error);
    if (error.response?.status === 401) {
      throw new Error('Please log in to use the AI assistant');
    }
    throw new Error(error.response?.data?.message || error.message || 'AI service unavailable');
  }
};

export const sendFeedback = async ({ interactionId, rating, patternId, correction }) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to send feedback');
  try {
    await axios.post(
      `${API_URL}/api/ai/feedback`,
      { interactionId, rating, patternId, correction },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('AI feedback error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to send feedback');
  }
};

export default {
  sendAIMessage,
  sendFeedback,
};
