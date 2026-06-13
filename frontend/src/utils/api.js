// frontend/src/utils/api.js
import axios from 'axios';
import { supabase } from './superbaseClient'; // Adjust path as needed

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Your backend URL
});

// Intercept every outgoing request to attach the Supabase token
api.interceptors.request.use(async (config) => {
  // Get the current user session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;