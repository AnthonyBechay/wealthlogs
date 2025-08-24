import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

// Feature Card Component
function FeatureCard({ 
  icon, 
  title, 
  description,
  delay = 0 
}: { 
  icon: string; 
  title: string; 
  description: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </motion.div>
  );
}

// Hero Section Component
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-blue-600 to-purple-700 text-white">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative container mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Your Complete
              <span className="block text-yellow-300">Financial Command Center</span>
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              Take control of your wealth with WealthLogs - the all-in-one platform for tracking investments, 
              managing expenses, monitoring real estate, and achieving your financial goals.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white text-emerald-600 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started Free
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-emerald-600 transition-all"
                >
                  Sign In
                </motion.button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-400 rounded-lg flex items-center justify-center text-2xl">📈</div>
                  <div>
                    <p className="text-sm opacity-80">Net Worth</p>
                    <p className="text-2xl font-bold">$1,247,892</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-400 rounded-lg flex items-center justify-center text-2xl">💼</div>
                  <div>
                    <p className="text-sm opacity-80">Total Assets</p>
                    <p className="text-2xl font-bold">15 Accounts</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-400 rounded-lg flex items-center justify-center text-2xl">🏠</div>
                  <div>
                    <p className="text-sm opacity-80">Real Estate</p>
                    <p className="text-2xl font-bold">3 Properties</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Main Features Section
function FeaturesSection() {
  const features = [
    {
      icon: "💰",
      title: "Account Management",
      description: "Track multiple accounts across banks, brokers, and crypto exchanges in one place."
    },
    {
      icon: "📊",
      title: "Trading & Investments",
      description: "Monitor stocks, forex, bonds, and crypto with real-time performance tracking."
    },
    {
      icon: "🏡",
      title: "Real Estate Portfolio",
      description: "Manage properties, mortgages, valuations, and rental income effortlessly."
    },
    {
      icon: "💳",
      title: "Expense Tracking",
      description: "Categorize expenses, set budgets, and identify spending patterns."
    },
    {
      icon: "📈",
      title: "Forecasting & Planning",
      description: "Project future cash flows and plan for major financial goals."
    },
    {
      icon: "👥",
      title: "Collaboration",
      description: "Share access with advisors, join communities, and get coaching."
    },
    {
      icon: "🤖",
      title: "AI Assistant",
      description: "Get intelligent insights and answers about your finances instantly."
    },
    {
      icon: "📱",
      title: "Mobile Access",
      description: "Access your financial data anywhere with our mobile apps."
    }
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Everything You Need in One Platform
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            WealthLogs brings together all aspects of your financial life into a single, powerful dashboard.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Integration Section
function IntegrationSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              Connect Your Favorite Platforms
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Seamlessly integrate with leading financial platforms and brokers to automatically sync your data.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <span className="text-gray-700 dark:text-gray-200">Interactive Brokers Integration</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <span className="text-gray-700 dark:text-gray-200">Binance API Connection</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <span className="text-gray-700 dark:text-gray-200">MetaTrader 5 (MT5) Support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <span className="text-gray-700 dark:text-gray-200">Bank Account Sync (Coming Soon)</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-6"
          >
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">Interactive Brokers</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">Binance</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">MT5</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">More Soon</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-emerald-500 to-blue-600 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="container mx-auto px-6 text-center"
      >
        <h2 className="text-4xl font-bold mb-6">
          Start Your Financial Journey Today
        </h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Join thousands of users who are taking control of their wealth with WealthLogs.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-emerald-600 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Create Free Account
            </motion.button>
          </Link>
          <Link href="/demo">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-emerald-600 transition-all"
            >
              Watch Demo
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// Main Homepage Component
export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (!isLoading && user && mounted) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router, mounted]);

  // Show loading state
  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading WealthLogs...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show nothing (will redirect)
  if (user) {
    return null;
  }

  // Show landing page for non-logged in users
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="WealthLogs" className="h-10 w-10" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">WealthLogs</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/about" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                About
              </Link>
              <Link href="/features" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Pricing
              </Link>
              <Link href="/login">
                <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors">
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <IntegrationSection />
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">WealthLogs</h3>
              <p className="text-gray-400">Your complete financial management platform.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 WealthLogs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
