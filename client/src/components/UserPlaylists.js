// client/src/components/UserPlaylists.js
import React from 'react';
import './UserPlaylists.css';

function UserPlaylists({ playlists, loading }) {
  if (loading) {
    return (
      <div className="user-playlists loading">
        <h2>Your Playlists</h2>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading your playlists...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="user-playlists">
      <h2>Your Playlists</h2>
      
      {playlists.length === 0 ? (
        <p className="no-playlists">No playlists found</p>
      ) : (
        <div className="playlists-scroll-container">
          <div className="playlist-grid">
            {playlists.slice(0, 6).map(playlist => (
              <a 
                href={playlist.external_urls.spotify} 
                target="_blank" 
                rel="noopener noreferrer"
                className="playlist-card"
                key={playlist.id}
              >
                <div className="playlist-image">
                  {playlist.images && playlist.images[0] ? (
                    <img src={playlist.images[0].url} alt={playlist.name} />
                  ) : (
                    <div className="playlist-image-placeholder">
                      <i className="icon-music"></i>
                    </div>
                  )}
                </div>
                <div className="playlist-info">
                  <h3>{playlist.name}</h3>
                  <p>{playlist.tracks.total} tracks</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      
      {playlists.length > 6 && (
        <a 
          href="https://open.spotify.com/collection/playlists" 
          target="_blank" 
          rel="noopener noreferrer"
          className="see-all-link"
        >
          See all in Spotify
        </a>
      )}
    </div>
  );
}

export default UserPlaylists;