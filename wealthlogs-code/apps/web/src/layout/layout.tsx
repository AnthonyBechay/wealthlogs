import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void | Promise<void>;
}

const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/'];

// AI Assistant Component
function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        "I can help you analyze your portfolio performance. Your current net worth has increased by 12% this quarter.",
        "Based on your spending patterns, you could save $500/month by reducing dining expenses.",
        "Your FX trading account shows strong performance with a 15% gain this month.",
        "I recommend diversifying your portfolio with 20% in bonds for better risk management.",
        "Your real estate investments are performing well with an average 8% annual appreciation."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { role: 'assistant', content: randomResponse }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      {/* AI Assistant Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
      </motion.button>

      {/* AI Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-xl">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-bold">WealthLogs AI Assistant</h3>
                    <p className="text-xs opacity-90">Ask me anything about your finances</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    <div className="text-6xl mb-4 opacity-20">💬</div>
                    <p className="text-sm">Hi! I'm your AI financial assistant.</p>
                    <p className="text-sm mt-2">Ask me about:</p>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => setPrompt("What's my current net worth?")}
                        className="block w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                      >
                        📊 "What's my current net worth?"
                      </button>
                      <button
                        onClick={() => setPrompt("How can I reduce my expenses?")}
                        className="block w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                      >
                        💰 "How can I reduce my expenses?"
                      </button>
                      <button
                        onClick={() => setPrompt("Show me my best performing investments")}
                        className="block w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                      >
                        📈 "Show me my best performing investments"
                      </button>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask about your finances..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Enhanced Navigation Link Component
function NavLink({ href, label, icon }: { href: string; label: string; icon?: string }) {
  const router = useRouter();
  const isActive = router.pathname === href;

  return (
    <Link href={href} legacyBehavior>
      <a className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-white/20 text-white shadow-md' 
          : 'hover:bg-white/10 text-white/80 hover:text-white'
      }`}>
        {icon && <span className="text-xl">{icon}</span>}
        <span className="font-medium">{label}</span>
        {isActive && (
          <motion.div
            layoutId="activeNav"
            className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </a>
    </Link>
  );
}

// Main Layout Component
export default function Layout({ children, onLogout }: LayoutProps) {
  const { t } = useTranslation('common');
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Skip layout for public pages
  if (publicPaths.some((p) => router.pathname === p || router.pathname.startsWith('/auth'))) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 80 : 280,
          x: mobileMenuOpen ? 0 : -280
        }}
        className={`${
          mobileMenuOpen ? 'fixed' : 'hidden'
        } lg:relative lg:block bg-gradient-to-b from-emerald-600 to-blue-700 text-white flex flex-col z-50 shadow-2xl transition-all duration-300`}
      >
        {/* Logo Section */}
        <div className="p-4 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="WealthLog" className="h-10 w-10" />
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold"
              >
                WealthLogs
              </motion.span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={sidebarCollapsed ? "M13 5l7 7-7 7" : "M11 19l-7-7 7-7"} />
            </svg>
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        {user && !sidebarCollapsed && (
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                {user.firstName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{user.firstName} {user.lastName}</p>
                <p className="text-sm opacity-80">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink href="/landing/landing" label={sidebarCollapsed ? "" : t('Dashboard')} icon="📊" />
          <NavLink href="/accounts" label={sidebarCollapsed ? "" : t('Accounts')} icon="💼" />
          <NavLink href="/trading/trading" label={sidebarCollapsed ? "" : t('Trading')} icon="📈" />
          <NavLink href="/RealEstate" label={sidebarCollapsed ? "" : t('Real Estate')} icon="🏠" />
          <NavLink href="/expenses" label={sidebarCollapsed ? "" : t('Expenses')} icon="💳" />
          <NavLink href="/loans" label={sidebarCollapsed ? "" : t('Loans')} icon="🏦" />
          <NavLink href="/forecasting" label={sidebarCollapsed ? "" : t('Forecasting')} icon="🔮" />

          {/* Collaboration Section */}
          {!sidebarCollapsed && (
            <div className="pt-4 mt-4 border-t border-white/20">
              <p className="px-3 mb-2 text-xs uppercase tracking-wider opacity-60">Collaboration</p>
              <NavLink href="/collaboration/delegated" label={t('Delegated Access')} icon="🔐" />
              <NavLink href="/collaboration/coaching" label={t('Coaching')} icon="👨‍🏫" />
              <NavLink href="/collaboration/communities" label={t('Communities')} icon="👥" />
            </div>
          )}

          {/* Settings Section */}
          {!sidebarCollapsed && (
            <div className="pt-4 mt-4 border-t border-white/20">
              <p className="px-3 mb-2 text-xs uppercase tracking-wider opacity-60">Settings</p>
              <NavLink href="/settings/settingsGeneral" label={t('General')} icon="⚙️" />
              <NavLink href="/settings/settingsTrading" label={t('Trading')} icon="📊" />
            </div>
          )}
        </nav>

        {/* Footer Controls */}
        <div className="p-3 space-y-2 border-t border-white/20">
          {!sidebarCollapsed && (
            <>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                {theme === 'dark' ? '☀️' : '🌙'} 
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>

              <button
                onClick={onLogout}
                className="w-full py-2.5 px-4 rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-semibold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('Logout')}
              </button>
            </>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden text-gray-600 dark:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4 ml-auto">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Net Worth:</span>
                <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400">$1,247,892</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Monthly Change:</span>
                <span className="ml-2 font-bold text-green-600">+12.3%</span>
              </div>
            </div>

            {/* Notifications */}
            <button className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
