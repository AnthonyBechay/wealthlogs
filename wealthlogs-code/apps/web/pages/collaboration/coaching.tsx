import { motion } from 'framer-motion';

export default function CoachingPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Financial Coaching</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Connect with financial advisors and coaches</p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Find a Coach */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Find a Coach</h2>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👨‍🏫</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect with certified financial coaches
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                Browse Coaches
              </button>
            </div>
          </div>

          {/* Become a Coach */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Become a Coach</h2>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎓</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Help others manage their finances better
              </p>
              <button className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all">
                Apply Now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
