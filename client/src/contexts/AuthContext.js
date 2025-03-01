import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Add this flag to prevent infinite loading loops
  const [authChecked, setAuthChecked] = useState(false);
  
  useEffect(() => {
    // Only check auth status once
    if (authChecked) return;
    
    // Check if user is authenticated
    async function checkAuthStatus() {
      try {
        const response = await api.get('/spotify/user');
        setCurrentUser(response.data);
      } catch (err) {
        // Not authenticated or token expired
        console.log("Not authenticated:", err.message);
        setCurrentUser(null);
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    }
    
    checkAuthStatus();
  }, [authChecked]);
  
  const login = async () => {
    try {
      const response = await api.get('/spotify/login');
      window.location.href = response.data.url;
    } catch (err) {
      setError('Failed to initialize Spotify login');
    }
  };
  
  const refreshTokens = async () => {
    try {
      await api.get('/spotify/refresh-token');
      return true;
    } catch (err) {
      setCurrentUser(null);
      return false;
    }
  };
  
  const logout = async () => {
    try {
      // Make a request to the server to clear the auth cookies
      await api.get('/spotify/logout');
      
      // Also clear cookies on the client side (as a backup)
      document.cookie = 'spotify_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'spotify_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Update the user state
      setCurrentUser(null);
      
      // Reset the authChecked flag so that the auth status will be checked again
      setAuthChecked(false);
      
      console.log('User logged out successfully');
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      // Even if the server request fails, still clear local state
      setCurrentUser(null);
      setAuthChecked(false);
      return false;
    }
  };
  
  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    refreshTokens
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}