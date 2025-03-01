// client/src/pages/Home.js - Fix navigation in Home
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SpotifyLogo from '../assets/spotify-logo.svg';
import './Home.css';

function Home() {
  const { login, currentUser, loading } = useAuth();
  const navigate = useNavigate();
  
  // Only navigate if we have a user and we're not loading
  React.useEffect(() => {
    if (currentUser && !loading) {
      navigate('/dashboard');
    }
  }, [currentUser, loading, navigate]);
  
  // Don't render anything while checking authentication
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>AI-Powered Spotify Playlist Generator</h1>
        <p className="subheading">Create personalized playlists enhanced by AI that understands your musical taste</p>
        
        <div className="features">
          <div className="feature">
            <i className="icon-music"></i>
            <h3>Select Your Favorites</h3>
            <p>Choose your favorite tracks, artists, and playlists</p>
          </div>
          <div className="feature">
            <i className="icon-brain"></i>
            <h3>AI Analysis</h3>
            <p>Our AI analyzes your music to understand your taste</p>
          </div>
          <div className="feature">
            <i className="icon-playlist"></i>
            <h3>Custom Playlist</h3>
            <p>Get a perfectly curated playlist with new discoveries</p>
          </div>
        </div>
        
        <button className="login-button" onClick={login}>
          <img src={SpotifyLogo} alt="Spotify" />
          Connect with Spotify
        </button>
      </div>
    </div>
  );
}

export default Home;