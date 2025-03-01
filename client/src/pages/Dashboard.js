import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlaylist } from '../contexts/PlaylistContext';
import api from '../services/api';
import Header from '../components/Header';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { 
    setSelectedTracks, 
    setPlaylistName, 
    setPlaylistDescription,
    clearSelections 
  } = usePlaylist();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchUserPlaylists() {
      try {
        const response = await api.get('/spotify/playlists');
        setPlaylists(response.data.items);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserPlaylists();
  }, []);
  
  const handleCreateNew = () => {
    clearSelections();
    navigate('/create');
  };
  
  const handleUsePlaylist = async (playlist) => {
    try {
      setLoading(true);
      
      // First, clear any existing selections
      clearSelections();
      
      // Set the playlist name and description
      setPlaylistName(`${playlist.name} (Enhanced)`);
      setPlaylistDescription(`Enhanced version of "${playlist.name}". ${playlist.description || ''}`);
      
      // Fetch the tracks from the playlist
      const tracksResponse = await api.get(`/spotify/playlist/${playlist.id}`);
      
      if (tracksResponse.data && tracksResponse.data.items) {
        // Collect all valid tracks from the playlist
        const playlistTracks = tracksResponse.data.items
          .map(item => item.track)
          .filter(track => track && track.id); // Filter out null tracks
        
        // Add tracks to selection
        setSelectedTracks(playlistTracks);
        
        console.log(`Added ${playlistTracks.length} tracks from playlist "${playlist.name}"`);
        
        // Navigate to the create page
        navigate('/create');
      }
    } catch (error) {
      console.error('Error processing playlist:', error);
      alert('Failed to load playlist tracks. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="dashboard">
      <Header user={currentUser} onLogout={logout} />
      
      <div className="dashboard-container">
        <section className="dashboard-welcome">
          <h1>Welcome, {currentUser?.display_name}</h1>
          <p>Ready to create your next playlist?</p>
          <button className="create-button" onClick={handleCreateNew}>
            Create New Playlist
          </button>
        </section>
        
        <section className="dashboard-content">
          <div className="user-playlists-section">
            <h2>Your Playlists</h2>
            
            {loading ? (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <p>Loading your playlists...</p>
              </div>
            ) : playlists.length === 0 ? (
              <p className="no-playlists">No playlists found</p>
            ) : (
              <>
                <div className="playlists-scroll-container">
                  <div className="playlist-grid">
                    {playlists.map(playlist => (
                      <div className="playlist-card" key={playlist.id}>
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
                          <h3 title={playlist.name}>{playlist.name}</h3>
                          <p>{playlist.tracks.total} tracks</p>
                          
                          <div className="playlist-actions">
                            <a 
                              href={playlist.external_urls.spotify} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="action-button view-button"
                            >
                              Open
                            </a>
                            <button 
                              className="action-button use-button"
                              onClick={() => handleUsePlaylist(playlist)}
                            >
                              Enhance
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="see-all-container">
                  <a 
                    href="https://open.spotify.com/collection/playlists" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="see-all-button"
                  >
                    See all in Spotify
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}