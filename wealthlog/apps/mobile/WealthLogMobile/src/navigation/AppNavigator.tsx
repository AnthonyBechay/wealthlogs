import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import HomeScreen from '../screens/Main/HomeScreen';
import AddTransactionScreen from '../screens/Main/AddTransactionScreen'; 
import { logoutUser as apiLogoutUser } from '../services/apiService'; 
import { globalStyles, commonColors, typography } from '../constants/Styles'; // Updated path
import Colors from '../constants/Colors'; // Updated path


const AuthContext = createContext<{
  isAuthenticated: boolean;
  isLoading: boolean;
  userToken: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

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
  const [userToken, setUserToken] = useState<string | null>(null); 

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
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={commonColors.primary} />
      </View>
    );
  }
  
  const screenOptions = {
    headerStyle: {
      backgroundColor: Colors.light.card, 
      elevation: Platform.OS === 'android' ? 2 : 0,
      shadowColor: commonColors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      borderBottomWidth: Platform.OS === 'android' ? 0 : StyleSheet.hairlineWidth, 
      borderBottomColor: Colors.light.border,
    },
    headerTintColor: Colors.light.text, 
    headerTitleStyle: {
      fontWeight: typography.fontWeightBold,
      fontSize: typography.fontSizeLarge,
    },
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS, 
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
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
              options={{ title: 'Add Transaction' }} 
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="MainApp" component={LoginScreen} options={{ headerShown: false }}/> 
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const RootNavigator = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

export default RootNavigator;