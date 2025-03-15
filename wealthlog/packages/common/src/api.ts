// utils/api.ts
import axios from "axios";

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

// Create Axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
});

// Interceptor to add Bearer token
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
