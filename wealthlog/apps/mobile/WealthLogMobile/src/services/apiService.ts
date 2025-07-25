import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Make this configurable, perhaps via an environment setup
const API_BASE_URL = 'http://10.0.2.2:5000'; // Root base URL

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Auth Endpoints ---
export const loginUser = async (credentials: {username: string, password: string}) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data && response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const registerUser = async (userData: any) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Register API error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const logoutUser = async () => {
  try {
    // Backend /auth/logout is a simple message, primary action is local token removal
    // await apiClient.post('/auth/logout');
    await AsyncStorage.removeItem('userToken');
  } catch (error) {
    console.error('Logout error:', error.response?.data || error.message);
    // Don't prevent logout if API call fails, just remove local token
    await AsyncStorage.removeItem('userToken');
  }
};

// --- Financial Accounts Endpoints ---
export const getFinancialAccounts = async () => {
  try {
    const response = await apiClient.get('/account');
    return response.data;
  } catch (error) {
    console.error('Get Financial Accounts API error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// --- Transactions Endpoints ---
export const getTransactions = async () => {
  try {
    const response = await apiClient.get('/transactions');
    return response.data;
  } catch (error) {
    console.error('Get Transactions API error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export const createTransaction = async (transactionData: any) => {
  try {
    const response = await apiClient.post('/transactions', transactionData);
    return response.data;
  } catch (error) {
    console.error('Create Transaction API error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

export default apiClient;
