// client/src/components/RecentlyPlayed.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './RecentlyPlayed.css';

function RecentlyPlayed() {
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchRecentlyPlayed() {
      try {
        const response = await api.get('/spotify/recent');
        setRecentTracks(response.data.items || []);
      } catch (error) {
        console.error('Error fetching recently played:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRecentlyPlayed();
  }, []);
  
  if (loading) {
    return (
      <div className="recently-played loading">
        <h2>Recently Played</h2>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading your recent tracks...</p>
        </div>
      </div>
    );
  }
  
  // If the API endpoint isn't implemented yet, show sample data
  if (recentTracks.length === 0) {
    return (
      <div className="recently-played">
        <h2>Recently Played</h2>
        <p className="no-tracks">No recent tracks found</p>
        <p className="tip">Start listening on Spotify to see your recently played tracks here.</p>
      </div>
    );
  }
  
  return (
    <div className="recently-played">
      <h2>Recently Played</h2>
      
      <div className="track-list">
        {recentTracks.slice(0, 5).map((item, index) => (
          <a 
            href={item.track.external_urls.spotify} 
            target="_blank" 
            rel="noopener noreferrer"
            className="track-item"
            key={`${item.track.id}-${index}`}
          >
            <div className="track-image">
              <img src={item.track.album.images[0].url} alt={item.track.name} />
            </div>
            <div className="track-info">
              <h3>{item.track.name}</h3>
              <p>{item.track.artists.map(artist => artist.name).join(', ')}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default RecentlyPlayed;
