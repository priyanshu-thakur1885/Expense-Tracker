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
  const [listeningField, setListeningField] = useState(null);

  const [formData, setFormData] = useState({
    item: '',
    amount: '',
    category: 'other',
    foodCourt: '',
    description: '',
    tags: '',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'other', label: 'Other' }
  ];

  const foodCourts = [
    'BH1 Food Court',
    'Apartment Food Court',
    'CC',
    'CSE Food Court',
    'Hostel Le Broc',
    'NK Food Court',
    'Food Factory',
    'Other(Outside Campus)'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      await axios.post('/api/expenses', expenseData);
      
      // Generate notification
      generateExpenseNotification('expense_added', parseFloat(formData.amount), formData.category);
      
      // Generate expense insights
      notificationService.generateExpenseInsight({
        amount: parseFloat(formData.amount),
        category: formData.category
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

  // 🎤 Voice recognition handler
  const handleVoiceInput = (field) => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech Recognition not supported in this browser. Please use Google Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    setListeningField(field);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log('🎤 Heard:', transcript);

      // Parse full sentence for all fields (if item mic used)
      if (field === 'item') {
        const priceMatch = transcript.match(/(\d+)\s*(?:rupees|rupee|rs|₹)?/);
        const blockMatch = transcript.match(/block\s*(\d+)/);
        const itemMatch = transcript
          .replace(/block\s*\d+/g, '')
          .replace(/(\d+)\s*(?:rupees|rupee|rs|₹)?/g, '')
          .trim();

        setFormData(prev => ({
          ...prev,
          item: itemMatch || prev.item,
          foodCourt: blockMatch ? `Block ${blockMatch[1]}` : prev.foodCourt,
          amount: priceMatch ? priceMatch[1] : prev.amount
        }));
      } 
      // Handle single field mics
      else if (field === 'amount') {
        const amount = transcript.match(/\d+/);
        if (amount) setFormData(prev => ({ ...prev, amount: amount[0] }));
      } 
      else if (field === 'foodCourt') {
        setFormData(prev => ({ ...prev, foodCourt: transcript }));
      }
    };

    recognition.onerror = () => {
      toast.error('Voice input failed. Try again.');
      setListeningField(null);
    };

    recognition.onend = () => {
      setListeningField(null);
    };
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
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
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Item Name */}
          <div>
            <label htmlFor="item" className="label block mb-2">
              Food Item <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
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
              <button
                type="button"
                onClick={() => handleVoiceInput('item')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  listeningField === 'item' ? 'bg-red-200' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Mic className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Amount and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="amount" className="label block mb-2">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
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
                <button
                  type="button"
                  onClick={() => handleVoiceInput('amount')}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    listeningField === 'amount' ? 'bg-red-200' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Mic className="w-5 h-5 text-gray-700" />
                </button>
              </div>
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
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Food Court */}
          <div>
            <label htmlFor="foodCourt" className="label block mb-2">
              Food Court <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              <select
                id="foodCourt"
                name="foodCourt"
                value={formData.foodCourt}
                onChange={handleInputChange}
                className="input w-full"
                required
              >
                <option value="">Select Food Court</option>
                {foodCourts.map(court => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleVoiceInput('foodCourt')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  listeningField === 'foodCourt' ? 'bg-red-200' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Mic className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Date */}
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
              className="input w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label block mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Any additional notes about this expense..."
              rows={3}
              className="input w-full resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="label block mb-2">
              Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="e.g., spicy, healthy, quick (comma separated)"
              className="input w-full"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Separate tags with commas
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="btn btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Expense</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddExpense;
