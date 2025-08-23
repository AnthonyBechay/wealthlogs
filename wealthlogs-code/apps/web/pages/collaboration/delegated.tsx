import { motion } from 'framer-motion';
import { useState } from 'react';

export default function DelegatedAccessPage() {
  const [activeTab, setActiveTab] = useState<'granted' | 'received'>('granted');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Delegated Access</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Manage who can view or edit your financial data</p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('granted')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'granted'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Access I've Granted
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'received'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Access I've Received
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          {activeTab === 'granted' ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-20">🔐</div>
              <h3 className="text-xl font-semibold mb-2">No Access Granted Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You haven't granted access to any advisors or collaborators yet.
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                + Grant Access
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-20">📥</div>
              <h3 className="text-xl font-semibold mb-2">No Shared Access</h3>
              <p className="text-gray-600 dark:text-gray-400">
                No one has shared their financial data with you yet.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
