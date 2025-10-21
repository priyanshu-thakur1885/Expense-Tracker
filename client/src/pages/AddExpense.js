import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Mic } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import notificationService from '../services/notificationService';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const AddExpense = () => {
  const navigate = useNavigate();
  const { generateExpenseNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    amount: '',
    category: 'other',
    foodCourt: '',
    description: '',
    tags: '',
    date: new Date().toISOString().split('T')[0],
  });

  const foodCourts = [
    'BH1 Food Court',
    'Apartment Food Court',
    'CC',
    'CSE Food Court',
    'Hostel Le Broc',
    'NK Food Court',
    'Food Factory',
    'Other(Outside Campus)',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🎤 Voice Input Functionality
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome.');
      return;
    }

    // Show instruction
    toast('Only say: "I had [food item] from [food court] and it cost me [price]"', {
      icon: '🎤',
      duration: 4000,
    });

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    setListening(true);
    toast('Listening... 🎧');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log('Voice input:', transcript);

      let detectedItem = '';
      let detectedAmount = '';
      let detectedFoodCourt = '';

      // Extract amount (e.g., "100 rupees" or "₹100")
      const amountMatch = transcript.match(/(\d+)(\s?rupees|₹)?/);
      if (amountMatch) detectedAmount = amountMatch[1];

      // Extract food court from "from [food court]" pattern
      const fromMatch = transcript.match(/from\s+([a-zA-Z\s]+)/);
      if (fromMatch) {
        const spokenCourt = fromMatch[1].trim();
        for (const court of foodCourts) {
          if (court.toLowerCase().includes(spokenCourt)) {
            detectedFoodCourt = court;
            break;
          }
        }
      }

      // Extract item name heuristically
      // Remove common keywords and the food court part
      let cleaned = transcript
        .replace(/(block|food court|rupees|₹|\d+)/g, '')
        .replace(/(from|in|at|cost|for|buy|bought|had|purchase|item|it|is)/g, '')
        .replace(new RegExp(detectedFoodCourt.toLowerCase(), 'g'), '')
        .replace(/\s+/g, ' ')
        .trim();

      detectedItem = cleaned.split(' ')[0] ? cleaned : '';

      // Fill the fields
      setFormData((prev) => ({
        ...prev,
        item: detectedItem || prev.item,
        amount: detectedAmount || prev.amount,
        foodCourt: detectedFoodCourt || prev.foodCourt,
      }));

      toast.success('Voice input processed! 🎯');
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast.error('Voice recognition failed. Try again.');
      setListening(false);
    };

    recognition.onend = () => setListening(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.item || !formData.amount || !formData.foodCourt) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tags: formData.tags
          ? formData.tags.split(',').map((tag) => tag.trim())
          : [],
      };

      await axios.post('/api/expenses', expenseData);

      generateExpenseNotification(
        'expense_added',
        parseFloat(formData.amount),
        formData.category
      );

      notificationService.generateExpenseInsight({
        amount: parseFloat(formData.amount),
        category: formData.category,
      });

      toast.success('Expense added successfully!');
      navigate('/expenses');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Add New Expense
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Track your food court spending
              </p>
            </div>
          </div>

          {/* 🎤 Mic button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`p-2 rounded-lg transition-colors ${
              listening
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="item" className="label block mb-2">
              Food Item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="item"
              name="item"
              value={formData.item}
              onChange={handleInputChange}
              placeholder="e.g., Chicken Biryani, Pizza, Coffee"
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="amount" className="label block mb-2">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="input w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="label block mb-2">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snacks">Snacks</option>
                <option value="beverages">Beverages</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="foodCourt" className="label block mb-2">
              Food Court <span className="text-red-500">*</span>
            </label>
            <select
              id="foodCourt"
              name="foodCourt"
              value={formData.foodCourt}
              onChange={handleInputChange}
              className="input w-full"
              required
            >
              <option value="">Select Food Court</option>
              {foodCourts.map((court) => (
                <option key={court} value={court}>
                  {court}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className="label block mb-2">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="description" className="label block mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add notes or details"
              className="input w-full"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="tags" className="label block mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="spicy, cheese, cold drink"
              className="input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full flex justify-center items-center space-x-2"
          >
            {loading && <LoadingSpinner size={20} />}
            <Save className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AddExpense;
