import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createWealthLogAPI } from "@wealthlog/shared";
import { motion, AnimatePresence } from 'framer-motion';

const api = createWealthLogAPI();

// Types
interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  accountId?: number;
  labels?: string[];
}

interface ExpenseCategory {
  name: string;
  icon: string;
  color: string;
  budget?: number;
}

// Predefined categories
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { name: 'Food & Dining', icon: '🍽️', color: 'bg-orange-500' },
  { name: 'Transportation', icon: '🚗', color: 'bg-blue-500' },
  { name: 'Shopping', icon: '🛍️', color: 'bg-pink-500' },
  { name: 'Entertainment', icon: '🎬', color: 'bg-purple-500' },
  { name: 'Bills & Utilities', icon: '💡', color: 'bg-yellow-500' },
  { name: 'Healthcare', icon: '🏥', color: 'bg-red-500' },
  { name: 'Education', icon: '📚', color: 'bg-indigo-500' },
  { name: 'Travel', icon: '✈️', color: 'bg-cyan-500' },
  { name: 'Home', icon: '🏠', color: 'bg-green-500' },
  { name: 'Other', icon: '📌', color: 'bg-gray-500' },
];

// Stats Card Component
function StatsCard({ title, value, change, icon }: any) {
  const isPositive = change > 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
          isPositive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
        }`}>
          {isPositive ? '+' : ''}{change}%
        </span>
      </div>
      <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        ${value.toLocaleString()}
      </p>
    </motion.div>
  );
}

// Category Progress Component
function CategoryProgress({ category, spent, budget }: any) {
  const percentage = budget ? (spent / budget) * 100 : 0;
  const isOverBudget = percentage > 100;
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{category.icon}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{category.name}</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          ${spent.toLocaleString()} {budget && `/ $${budget.toLocaleString()}`}
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-2 rounded-full ${
            isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
        />
      </div>
      {isOverBudget && (
        <p className="text-xs text-red-500 mt-1">Over budget by ${(spent - budget).toLocaleString()}</p>
      )}
    </div>
  );
}

// Main Expenses Page Component
export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Food & Dining');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRecurring, setFormRecurring] = useState(false);
  const [formFrequency, setFormFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [formLabels, setFormLabels] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    try {
      // Mock expenses data - replace with actual API call
      const mockExpenses: Expense[] = [
        { id: 1, amount: 120, category: 'Food & Dining', description: 'Grocery shopping', date: '2025-01-20', recurring: false },
        { id: 2, amount: 50, category: 'Transportation', description: 'Gas', date: '2025-01-19', recurring: false },
        { id: 3, amount: 1200, category: 'Bills & Utilities', description: 'Rent', date: '2025-01-01', recurring: true, frequency: 'monthly' },
        { id: 4, amount: 89, category: 'Entertainment', description: 'Netflix & Spotify', date: '2025-01-01', recurring: true, frequency: 'monthly' },
        { id: 5, amount: 250, category: 'Shopping', description: 'Clothes', date: '2025-01-15', recurring: false },
      ];
      setExpenses(mockExpenses);
    } catch (err) {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!formAmount || !formDescription) {
      setError('Please fill in all required fields');
      return;
    }

    const newExpense: Expense = {
      id: Date.now(),
      amount: parseFloat(formAmount),
      category: formCategory,
      description: formDescription,
      date: formDate,
      recurring: formRecurring,
      frequency: formRecurring ? formFrequency : undefined,
      labels: formLabels ? formLabels.split(',').map(l => l.trim()) : []
    };

    setExpenses([newExpense, ...expenses]);
    
    // Reset form
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRecurring(false);
    setFormLabels('');
    setShowAddExpense(false);
    setError('');
  }

  async function handleDeleteExpense(id: number) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setExpenses(expenses.filter(e => e.id !== id));
  }

  // Calculate statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });

  const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalYearly = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const categoryTotals = monthlyExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const recurringTotal = expenses
    .filter(e => e.recurring)
    .reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expense Tracking</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor and manage your spending</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddExpense(true)}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              + Add Expense
            </motion.button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Monthly Spending"
          value={totalMonthly}
          change={12.5}
          icon="📊"
        />
        <StatsCard
          title="Yearly Total"
          value={totalYearly}
          change={-5.2}
          icon="📈"
        />
        <StatsCard
          title="Recurring Bills"
          value={recurringTotal}
          change={0}
          icon="🔄"
        />
        <StatsCard
          title="Average Daily"
          value={Math.round(totalMonthly / 30)}
          change={8.3}
          icon="📅"
        />
      </div>

      {/* Category Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Category Breakdown</h2>
          {EXPENSE_CATEGORIES.map(category => {
            const spent = categoryTotals[category.name] || 0;
            const budget = category.name === 'Food & Dining' ? 500 : 
                          category.name === 'Bills & Utilities' ? 1500 : 
                          category.name === 'Entertainment' ? 200 : undefined;
            
            return (
              <CategoryProgress
                key={category.name}
                category={category}
                spent={spent}
                budget={budget}
              />
            );
          })}
        </div>

        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Recent Expenses</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {expenses.slice(0, 10).map((expense) => {
              const category = EXPENSE_CATEGORIES.find(c => c.name === expense.category);
              
              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category?.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(expense.date).toLocaleDateString()}
                        {expense.recurring && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs">
                            {expense.frequency}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-white">
                      ${expense.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddExpense && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddExpense(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Expense</h2>
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="What was this expense for?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRecurring}
                      onChange={(e) => setFormRecurring(e.target.checked)}
                      className="w-5 h-5 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recurring expense
                    </span>
                  </label>

                  {formRecurring && (
                    <select
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value as any)}
                      className="px-3 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Labels (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formLabels}
                    onChange={(e) => setFormLabels(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., vacation, tax-deductible, family"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
