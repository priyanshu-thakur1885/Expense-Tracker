import React, { useState, useEffect } from 'react';
import Header from '../components/Header';

import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar,
  MapPin,
  Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import FloatingChat from '../components/FloatingChat';
import { format } from 'date-fns';

const Expenses = () => {
  const navigate = useNavigate();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFoodCourt, setFilterFoodCourt] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'drinks', label: 'Drinks' },
    { value: 'groceries', label: 'Groceries' },
    { value: 'other', label: 'Other' }
  ];

  const foodCourts = [
    { value: '', label: 'All Food Courts' },
    { value: 'Central Food Court', label: 'Central Food Court' },
    { value: 'Block 32 Food Court', label: 'Block 32 Food Court' },
    { value: 'Block 33 Food Court', label: 'Block 33 Food Court' },
    { value: 'Block 34 Food Court', label: 'Block 34 Food Court' },
    { value: 'Block 35 Food Court', label: 'Block 35 Food Court' },
    { value: 'Block 36 Food Court', label: 'Block 36 Food Court' },
    { value: 'Block 37 Food Court', label: 'Block 37 Food Court' },
    { value: 'Block 38 Food Court', label: 'Block 38 Food Court' },
    { value: 'Block 39 Food Court', label: 'Block 39 Food Court' },
    { value: 'Block 40 Food Court', label: 'Block 40 Food Court' },
    { value: 'Other', label: 'Other' }
  ];

  useEffect(() => {
    fetchExpenses();
}, [pagination.current, filterCategory, filterFoodCourt, sortBy, sortOrder, searchTerm]);


  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 20,
        ...(filterCategory && { category: filterCategory }),
        ...(filterFoodCourt && { foodCourt: filterFoodCourt }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await axios.get(`/api/expenses?${params}`);
      setExpenses(response.data.expenses);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await axios.delete(`/api/expenses/${expenseId}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleEditExpense = (expenseId) => {
    navigate(`/edit-expense/${expenseId}`);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = searchTerm === '' || 
      expense.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.foodCourt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const getCategoryColor = (category) => {
    const colors = {
      breakfast: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      lunch: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      dinner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      snacks: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      Drinks: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      Groceries: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-6">
      

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Expenses
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Track and manage your food court expenses
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/add-expense')}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          {/* Food Court Filter */}
          <select
            value={filterFoodCourt}
            onChange={(e) => setFilterFoodCourt(e.target.value)}
            className="input"
          >
            {foodCourts.map(court => (
              <option key={court.value} value={court.value}>
                {court.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="input"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredExpenses.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.map((expense, index) => (
              <motion.div
                key={expense._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {expense.item}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{expense.foodCourt}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                      </div>
                      {expense.tags && expense.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Tag className="w-4 h-4" />
                          <span>{expense.tags.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    
                    {expense.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {expense.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        ₹{expense.amount.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditExpense(expense._id)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense._id)}
                        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No expenses found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {searchTerm || filterCategory || filterFoodCourt
                ? 'Try adjusting your search or filters'
                : 'Start tracking your food court expenses'
              }
            </p>
            {!searchTerm && !filterCategory && !filterFoodCourt && (
              <button
                onClick={() => navigate('/add-expense')}
                className="btn btn-primary"
              >
                Add Your First Expense
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
            disabled={pagination.current === 1}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Page {pagination.current} of {pagination.pages}
          </span>
          
          <button
            onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
            disabled={pagination.current === pagination.pages}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
      
      {/* Floating Chat Component */}
      <FloatingChat />
    </div>
  );
};

export default Expenses;
