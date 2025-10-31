import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Mic } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import notificationService from '../services/notificationService';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { Save, ArrowLeft, Mic, Camera } from 'lucide-react';
import Tesseract from 'tesseract.js';


const AddExpense = () => {
  const navigate = useNavigate();
  const { generateExpenseNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    item: '',
    amount: '',
    category: 'other',
    foodCourt: '',
    description: '',
    tags: '',
    date: new Date().toLocaleDateString('en-CA'),
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🎤 Voice Input Functionality with Instruction Popup
  // 🎤 Voice Input Functionality (without auto submit)
const handleVoiceInput = () => {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Speech recognition is not supported in this browser. Please use Google Chrome.');
    return;
  }

  // Show instruction popup
  setMessage('Only say: I had [food item] from [food court] and it cost me [price]');
  setTimeout(() => setMessage(''), 4000);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();
  setListening(true);
  toast('Listening... 🎤', { icon: '🎧' });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    console.log('Voice input:', transcript);

    // Match the format: "I had [food item] from [food court] and it cost me [price]"
    const regex = /i had (.*) from (.*) and it cost me (\d+)/i;
    const match = transcript.match(regex);

    if (match) {
      const detectedItem = match[1].trim();
      const detectedFoodCourt = match[2].trim();
      const detectedAmount = match[3].trim();

      const matchedCourt =
        foodCourts.find(
          (court) => court.toLowerCase() === detectedFoodCourt.toLowerCase()
        ) || 'Other(Outside Campus)';

      // Fill the fields only (do not auto-submit)
      setFormData((prev) => ({
        ...prev,
        item: detectedItem || prev.item,
        foodCourt: matchedCourt,
        amount: detectedAmount || prev.amount,
      }));

      toast.success('Voice input processed! Review and click Save to confirm.');
    } else {
      toast.error(
        'Please speak in the correct format: I had [food item] from [food court] and it cost me [price]'
      );
    }

    setListening(false);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    toast.error('Voice recognition failed. Try again.');
    setListening(false);
  };

  recognition.onend = () => setListening(false);
};

// 📷 Bill Scan (OCR using Tesseract.js)
const handleScanBill = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.click();

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    toast('Extracting text from bill... 🧾', { icon: '🧠' });
    setLoading(true);

    try {
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text.toLowerCase();
      console.log('Extracted text:', text);

      // 🧠 Try to auto-detect key info
      const amountMatch = text.match(/₹\s?(\d+(\.\d{1,2})?)/) || text.match(/total[:\s]*(\d+)/);
      const dateMatch = text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/);
      const itemMatch =
        text.match(/item[:\s]*([a-zA-Z\s]+)/) ||
        text.split('\n').find(line => line.length > 3 && !line.includes('total') && !line.includes('gst'));

      const detectedAmount = amountMatch ? amountMatch[1] : '';
      const detectedDate = dateMatch ? dateMatch[0] : new Date().toLocaleDateString('en-CA');
      const detectedItem = itemMatch ? itemMatch.trim() : '';

      setFormData(prev => ({
        ...prev,
        item: detectedItem || prev.item,
        amount: detectedAmount || prev.amount,
        date: detectedDate || prev.date,
      }));

      toast.success('Bill scanned and data filled automatically!');
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Failed to scan the bill. Try again with a clearer image.');
    } finally {
      setLoading(false);
    }
  };
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
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
      };

      await axios.post('/api/expenses', expenseData);

      generateExpenseNotification('expense_added', parseFloat(formData.amount), formData.category);
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

          {/* 📷 Scan Bill button */}
<button
  type="button"
  onClick={handleScanBill}
  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 ml-2"
>
  <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
</button>

        </div>

        {/* Instruction Message */}
        {message && (
          <div className="fixed bottom-20 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-md z-50">
            {message}
          </div>
        )}

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
              className="input w-full"
            />
          </div>

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
