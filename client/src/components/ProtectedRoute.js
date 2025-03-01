import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  // Only redirect if we're sure the user is not authenticated
  if (currentUser === null) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

export default ProtectedRoute;