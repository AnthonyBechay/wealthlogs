# WealthLog Mobile Application

This is the React Native mobile application for WealthLog, designed to provide a mobile interface for the features available on the WealthLog web platform.

## Current Features

*   User authentication (Login, Registration) with existing backend.
*   Session persistence using AsyncStorage.
*   Viewing a list of financial transactions.
*   Adding new financial transactions (Deposit, Withdraw, Transfer, Dividend) with account selection.
*   Basic error handling and loading states for API interactions.
*   Global styling constants for a more consistent look and feel.
*   Navigation structure for authenticated and unauthenticated users.

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended - check project's `.nvmrc` or `package.json` engines if specified)
*   NPM or Yarn
*   React Native development environment setup for your chosen platform (iOS/Android). Follow the official [React Native Environment Setup guide](https://reactnative.dev/docs/environment-setup) (CLI Quickstart).
*   For iOS: Xcode and CocoaPods.
*   For Android: Android Studio and Android SDK.
*   An instance of the WealthLog backend API running and accessible.

### Installation

1.  **Navigate to the mobile app directory:**
    ```bash
    cd wealthlog/apps/mobile/WealthLogMobile
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    (Or `yarn install` if your project primarily uses Yarn.)

### API Configuration

*   The mobile app currently expects the backend API to be at `http://localhost:5000`. 
*   If your backend runs on a different URL, update the `API_BASE_URL` constant in `wealthlog/apps/mobile/WealthLogMobile/src/services/apiService.ts`.
*   For Android emulators, `localhost` typically refers to the emulator's own loopback interface. To connect to a backend running on your host machine from an Android emulator, you usually need to use `http://10.0.2.2:<PORT>` instead of `http://localhost:<PORT>`. Update `apiService.ts` accordingly if testing with an Android emulator and a locally hosted backend. For physical devices, ensure the device can reach the backend server's IP address on your network.

### Running the Application

1.  **Ensure the WealthLog backend API is running and accessible via the configured URL.**

2.  **For iOS:**
    *   Install Pods (if not already done or if dependencies changed):
        ```bash
        cd ios
        pod install
        cd ..
        ```
    *   Run on simulator or device:
        ```bash
        npm run ios
        ```
        Alternatively, you can start the Metro bundler separately (`npm start`) and then run the app from Xcode or by using `npx react-native run-ios` in another terminal.

3.  **For Android:**
    *   Ensure you have an Android emulator running or a physical device connected (with USB debugging enabled).
    *   Run on emulator or device:
        ```bash
        npm run android
        ```
        Alternatively, you can start the Metro bundler separately (`npm start`) and then run the app using `npx react-native run-android` in another terminal.

## Project Structure (Key Files/Folders)

*   `App.tsx`: Main entry point, sets up the `RootNavigator`.
*   `src/`
    *   `constants/`: Global styles, colors, and other constants.
        *   `Colors.ts`: Defines color palettes (light/dark structure provided, currently using light).
        *   `Styles.ts`: Defines global StyleSheet objects, typography, and spacing constants.
    *   `navigation/`: Navigation setup.
        *   `AppNavigator.tsx`: Defines main navigation stacks (authenticated and unauthenticated) and the `AuthContext` for managing user session.
    *   `screens/`: Contains all application screens, organized by context.
        *   `Auth/`: Authentication-related screens (`LoginScreen.tsx`, `RegisterScreen.tsx`).
        *   `Main/`: Screens for authenticated users (`HomeScreen.tsx`, `AddTransactionScreen.tsx`).
    *   `services/`: API interaction layer.
        *   `apiService.ts`: Handles all communication with the backend API using Axios. Includes an interceptor to attach JWT tokens.
    *   `components/`: (Currently empty) Intended for reusable UI components (e.g., custom buttons, cards, input fields).
    *   `utils/`: (Currently empty) Intended for utility functions (e.g., date formatters, validation helpers).

## Next Steps & Areas for Improvement

*   **Thorough Testing:** Rigorously test all implemented features, edge cases, and user flows on both iOS and Android devices/simulators.
*   **UI/UX Refinement:** Enhance the user interface and experience for a more polished and intuitive "very nice mobile app". This includes better visual hierarchy, component styling, and potentially animations/transitions.
*   **Advanced Error Handling:** Implement a more user-friendly global error display system (e.g., toast messages, snackbars) instead of relying solely on `Alert`.
*   **Environment Configuration:** Use a library like `react-native-config` to manage API URLs and other environment-specific settings, avoiding hardcoding.
*   **Form Handling:** For more complex forms, consider using a library like Formik or React Hook Form.
*   **State Management:** For more complex global state needs beyond authentication, evaluate solutions like Redux Toolkit, Zustand, or Recoil.
*   **Implement Remaining Features:** Add other features from the web app (e.g., dashboard views, detailed trade logging, user profile management, account creation/editing).
*   **Offline Support:** Investigate strategies for basic offline data viewing or queueing actions if required.
*   **Testing (Unit/Integration/E2E):** Implement a comprehensive testing strategy.
*   **CI/CD:** Set up continuous integration and deployment pipelines for easier builds and releases.
*   **Accessibility (A11y):** Ensure the app is accessible by adding appropriate labels, hints, and testing with screen readers.
*   **Dark Mode Theme:** Fully implement and test the dark mode theme defined in `Colors.ts`.

## Notes

*   This is an initial functional version. Some UI elements are basic and await further styling.
*   The backend API URL might need adjustment based on your development setup (see API Configuration).
*   Ensure your React Native development environment is correctly configured for your target platform(s).
*   The project uses TypeScript; strive to maintain type safety.