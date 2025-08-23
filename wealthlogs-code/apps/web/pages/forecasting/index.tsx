import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ForecastingPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Financial Forecasting</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Plan your financial future</p>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg text-center">
          <div className="text-6xl mb-4">🔮</div>
          <h2 className="text-2xl font-bold mb-4">Forecasting & Planning Coming Soon</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Project future cash flows, plan for major expenses, and visualize your financial trajectory.
          </p>
          <Link href="/landing/landing">
            <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
