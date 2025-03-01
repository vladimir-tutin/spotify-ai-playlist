// client/src/App.js - Fix loading handling
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PlaylistProvider } from './contexts/PlaylistContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import PlaylistCreator from './pages/PlaylistCreator';
import PlaylistGeneration from './pages/PlaylistGeneration';
import ErrorPage from './pages/ErrorPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <PlaylistProvider>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/create" element={
              <ProtectedRoute>
                <PlaylistCreator />
              </ProtectedRoute>
            } />
            <Route path="/generating/:streamId" element={
              <ProtectedRoute>
                <PlaylistGeneration />
              </ProtectedRoute>
            } />
            <Route path="/error" element={<ErrorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </PlaylistProvider>
    </AuthProvider>
  );
}

export default App;