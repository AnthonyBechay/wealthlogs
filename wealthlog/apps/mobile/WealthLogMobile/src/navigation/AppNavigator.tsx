import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import HomeScreen from '../screens/Main/HomeScreen';
import AddTransactionScreen from '../screens/Main/AddTransactionScreen'; // Import new screen
import { logoutUser as apiLogoutUser } from '../services/apiService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const Stack = createStackNavigator();

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setIsAuthenticated(true);
          setUserToken(token);
        } else {
          setIsAuthenticated(false);
          setUserToken(null);
        }
      } catch (e) {
        console.error('Failed to fetch auth token from storage', e);
        setIsAuthenticated(false);
        setUserToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  const login = async (token: string) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      setIsAuthenticated(true);
      setUserToken(token);
    } catch (e) {
      console.error('Failed to save auth token to storage', e);
    }
  };

  const logout = async () => {
    try {
      await apiLogoutUser();
    } catch (e) {
      console.error('Logout API call failed', e);
      // Ensure local state is cleared even if API call fails
      await AsyncStorage.removeItem('userToken');
    } finally {
      setIsAuthenticated(false);
      setUserToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="MainApp"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddTransaction"
              component={AddTransactionScreen}
              options={{ title: 'Add Transaction' }} // Show header with back button and title
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }}/>
            {/* Fallback for unauthenticated access to MainApp */}
            <Stack.Screen name="MainApp" component={LoginScreen} options={{ headerShown: false }}/>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// This RootNavigator ensures that AuthProvider wraps AppNavigator
const RootNavigator = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootNavigator;
