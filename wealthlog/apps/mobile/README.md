# WealthLogs Mobile App

This is the mobile app for WealthLogs, built with Capacitor.

## Prerequisites

- Node.js and npm
- Android Studio (for Android)
- Xcode (for iOS)

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build the web app and sync with Capacitor:**

   ```bash
   npm run mobile:build
   ```

3. **Open the native project in its IDE:**

   - For Android:

     ```bash
     npx cap open android
     ```

   - For iOS:

     ```bash
     npx cap open ios
     ```

4. **Run the app from the IDE.**

## Development Workflow

When you make changes to the web app, you need to rebuild it and sync the changes with Capacitor.

```bash
npm run mobile:build
```

Then, you can run the app again from the IDE.
