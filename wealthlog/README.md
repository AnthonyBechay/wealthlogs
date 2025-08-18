# WealthLog - Cross-Platform Financial Management

A modern, cross-platform financial management application built with a monorepo architecture supporting both web and mobile platforms.

## 🏗️ Architecture

```
wealthlogs/
├── apps/
│   ├── web/                 # Next.js web application
│   ├── mobile/              # Capacitor mobile app (iOS/Android)
│   └── backend/             # Node.js API server
├── packages/
│   ├── shared/              # Cross-platform utilities and API client
│   └── ui/                  # Shared UI components
└── turbo.json               # Turbo build configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- For mobile development:
  - Xcode (for iOS)
  - Android Studio (for Android)

### Installation

```bash
# Clone and install dependencies
git clone <your-repo>
cd wealthlog
npm run bootstrap
```

### Development

```bash
# Start all applications
npm run dev

# Or start individual applications
npm run dev:web      # Web app on http://localhost:3000
npm run dev:mobile   # Mobile app on http://localhost:3001
npm run dev:backend  # API server on http://localhost:5000
```

### Building

```bash
# Build all applications
npm run build

# Build specific applications
npm run build:web
npm run build:mobile
npm run build:backend
```

## 📱 Mobile Development

The mobile app is built with Capacitor, allowing you to use the same React codebase for both web and mobile platforms.

### Mobile Setup (First Time)

```bash
# Build the mobile app
npm run build:mobile

# Add platforms
cd apps/mobile
npx cap add ios
npx cap add android
```

### Mobile Development Workflow

```bash
# Sync changes to mobile platforms
npm run mobile:sync

# Open in native IDEs
npm run mobile:ios      # Opens Xcode
npm run mobile:android  # Opens Android Studio
```

## 🏆 Key Features

### ✅ Cross-Platform Compatibility
- **Web App**: Next.js with React 19
- **Mobile Apps**: Capacitor for iOS and Android
- **Shared Codebase**: 90%+ code reuse between platforms

### ✅ Modern Architecture
- **Monorepo**: Organized with Turbo for efficient builds
- **TypeScript**: Full type safety across all packages
- **Shared Packages**: Reusable components and utilities

### ✅ Robust Backend
- **Node.js + Express**: RESTful API
- **PostgreSQL + Prisma**: Type-safe database access
- **JWT Authentication**: Secure token-based auth
- **Comprehensive Schema**: Financial accounts, trades, transactions

### ✅ Cross-Platform Storage
- **Web**: localStorage with fallback
- **Mobile**: Capacitor Preferences
- **Universal API**: Same interface across platforms

## 📦 Package Structure

### `@wealthlog/shared`
Cross-platform utilities and API client:
- **API Client**: Axios-based client with automatic token management
- **Storage**: Universal storage interface (localStorage/Preferences)
- **Types**: Shared TypeScript definitions
- **Platform Detection**: Utility functions for platform-specific logic

### `@wealthlog/ui`
Shared UI components:
- **Button**: Cross-platform button component
- **Input**: Form input with validation
- **Card**: Content container components
- **Consistent Design**: Works across web and mobile

### `apps/web`
Next.js web application:
- **React 19**: Latest React features
- **Tailwind CSS**: Utility-first styling
- **i18n**: Internationalization support
- **PWA Ready**: Progressive Web App capabilities

### `apps/mobile`
Capacitor mobile application:
- **Vite**: Fast development and builds
- **React Router**: Client-side routing
- **Native Features**: Camera, storage, push notifications
- **Platform-Specific**: iOS and Android optimizations

### `apps/backend`
Node.js API server:
- **Express**: Web framework
- **Prisma**: Database ORM
- **JWT**: Authentication
- **File Upload**: Multer for image handling
- **Security**: Helmet, CORS, rate limiting

## 🔐 Authentication Flow

1. **Login**: User enters credentials
2. **Token Storage**: JWT stored using platform-appropriate method
3. **API Requests**: Automatic token attachment via interceptors
4. **Token Refresh**: Automatic handling of expired tokens
5. **Logout**: Token removal from all storage locations

## 🎨 Styling & Design

- **Tailwind CSS**: Consistent styling across platforms
- **Design System**: Shared color palette and spacing
- **Mobile-First**: Responsive design principles
- **Safe Areas**: Proper handling of mobile safe areas
- **Touch Targets**: Optimized for mobile interaction

## 🔧 Development Commands

### Package Management
```bash
npm run bootstrap    # Install all dependencies
npm run clean       # Remove build artifacts
npm run clean:deps  # Remove all node_modules
```

### Development
```bash
npm run dev         # Start all apps in dev mode
npm run dev:web     # Web app only
npm run dev:mobile  # Mobile app only
npm run dev:backend # Backend only
```

### Building
```bash
npm run build       # Build all packages
npm run type-check  # TypeScript validation
npm run lint        # Code linting
```

### Mobile
```bash
npm run mobile:sync    # Sync web build to mobile
npm run mobile:ios     # Open iOS project
npm run mobile:android # Open Android project
```

## 🚀 Deployment

### Web App
- **Frontend**: Vercel (recommended)
- **Alternative**: Netlify, AWS Amplify

### Backend
- **API**: Render, Railway, or AWS
- **Database**: Render PostgreSQL, AWS RDS

### Mobile Apps
- **iOS**: App Store via Xcode
- **Android**: Google Play Store via Android Studio

## 📊 Database Schema

The Prisma schema includes comprehensive models for:
- **Users & Authentication**: JWT-based auth with roles
- **Financial Accounts**: Multi-type account support
- **Trades**: FX, stocks, crypto, bonds
- **Transactions**: Deposits, withdrawals, transfers
- **Real Estate**: Property investments and valuations
- **Analytics**: Performance tracking and reporting

## 🔄 Migration from Old Structure

The refactoring includes:
1. ✅ Renamed `packages/common` → `packages/shared`
2. ✅ Cross-platform storage implementation
3. ✅ New mobile app structure
4. ✅ Updated build configurations
5. ✅ Shared UI components package

## 🛠️ Troubleshooting

### Build Issues
```bash
# Clean everything and reinstall
npm run clean:deps
npm run bootstrap
npm run build
```

### Mobile Issues
```bash
# Rebuild and sync mobile
npm run build:mobile
npm run mobile:sync
```

### TypeScript Errors
```bash
# Check types across all packages
npm run type-check
```

## 📝 Contributing

1. Follow the existing code structure
2. Add types for all new features
3. Test on both web and mobile platforms
4. Update documentation as needed

## 📄 License

This project is proprietary software. All rights reserved.
