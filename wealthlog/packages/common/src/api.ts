// utils/api.ts
import axios from "axios";
import { Capacitor } from '@capacitor/core';

// We'll store the token in localStorage OR memory in production.
let accessToken: string | null = null;

// A helper to set or clear the token
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("accessToken");
  }
}

// On page load, let's see if there's a token in localStorage
const storedToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

if (storedToken) {
  accessToken = storedToken;
}

const getApiBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    // For native mobile development, point to the host machine's localhost.
    // On Android emulators, this is 10.0.2.2
    // For iOS simulators, this would be localhost.
    // This might need to be configurable for production builds.
    return 'http://10.0.2.2:5000';
  }
  // For web, use the Next.js environment variable or a fallback.
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

// Create Axios instance
export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Interceptor to add Bearer token
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
