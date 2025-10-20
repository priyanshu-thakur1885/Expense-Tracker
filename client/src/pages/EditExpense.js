import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import notificationService from '../services/notificationService';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const EditExpense = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { generateExpenseNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(true);
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

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoadingExpense(true);
        const resp = await axios.get(`/api/expenses/${id}`);
        if (resp.data && resp.data.expense) {
          const e = resp.data.expense;
          setFormData({
            item: e.item || '',
            amount: e.amount != null ? e.amount.toString() : '',
            category: e.category || 'other',
            foodCourt: e.foodCourt || '',
            description: e.description || '',
            tags: e.tags ? e.tags.join(', ') : '',
            date: e.date ? new Date(e.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          });
        } else {
          toast.error('Expense not found');
          navigate('/expenses');
        }
      } catch (err) {
        console.error('Error fetching expense:', err);
        toast.error('Failed to load expense');
        navigate('/expenses');
      } finally {
        setLoadingExpense(false);
      }
    };

    if (id) fetchExpense();
  }, [id, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      await axios.put(`/api/expenses/${id}`, expenseData);

      // Generate any notifications/insights if needed
      generateExpenseNotification('expense_updated', parseFloat(formData.amount), formData.category);
      notificationService.generateExpenseInsight({ amount: parseFloat(formData.amount), category: formData.category });

      toast.success('Expense updated successfully');
      navigate('/expenses');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingExpense) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
                Edit Expense
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Update your expense details
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

          {/* Amount and Category */}
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
                  <span>Save Changes</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditExpense;
