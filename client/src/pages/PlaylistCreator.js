// Updated PlaylistCreator.js with compact song count slider
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaylist } from '../contexts/PlaylistContext';
import Header from '../components/Header';
import SearchBox from '../components/SearchBox';
import SelectionPanel from '../components/SelectionPanel';
import api from '../services/api';
import './PlaylistCreator.css';
import { MinusIcon, PlusIcon } from '../components/Icons';

function PlaylistCreator() {
  const { 
    selectedTracks, 
    selectedArtists,
    selectedAlbums,
    selectedPlaylists,
    playlistName, 
    setPlaylistName,
    playlistDescription,
    setPlaylistDescription,
    clearSelections,
    songCount,
    setSongCount
  } = usePlaylist();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!playlistName.trim()) {
      setError('Please enter a playlist name');
      return;
    }
    
    if (selectedTracks.length === 0 && selectedAlbums.length === 0 && 
        selectedArtists.length === 0 && selectedPlaylists.length === 0) {
      setError('Please select at least one track, album, artist, or playlist');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Submit selected tracks to AI for processing
      const response = await api.post('/ai/generate-playlist', {
        selectedTracks: selectedTracks.map(track => track.id),
        selectedArtists: selectedArtists.map(artist => artist.id),
        selectedAlbums: selectedAlbums.map(album => album.id),
        selectedPlaylists: selectedPlaylists.map(playlist => playlist.id),
        playlistName,
        playlistDescription,
        songCount // Pass the song count
      });
      
      if (response.data.streamId) {
        navigate(`/generating/${response.data.streamId}`);
      } else {
        setError('Failed to start playlist generation process');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="page-container">
      <Header />
      
      <div className="content-container content-with-fixed-buttons">
        <h1 className="page-title">Create Your AI-Enhanced Playlist</h1>
        <p className="page-subtitle">
          Select your favorite tracks, artists, albums, or playlists. Our AI will analyze 
          your selections and create a perfect playlist for you.
        </p>
        
        <div className="content-panel">
          <div className="playlist-details">
            <div className="playlist-name-container">
              <input
                type="text"
                id="playlist-name"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Give your playlist a name..."
                maxLength={100}
              />
            </div>
            
            <div className="playlist-description-container">
              <textarea
                id="playlist-description"
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder="What vibe are you going for? Add any details to help guide the AI..."
                maxLength={300}
              />
            </div>
          </div>
          
          <div className="song-count-section">
            <div className="song-count-container">
              <label htmlFor="song-count">Total Songs:</label>
              <button 
                className="song-count-adjust-button" 
                onClick={() => setSongCount(Math.max(10, songCount - 1))}
                disabled={songCount <= 10}
              >
                <MinusIcon />
              </button>
              <span>{songCount}</span>
              <button 
                className="song-count-adjust-button" 
                onClick={() => setSongCount(Math.min(100, songCount + 1))}
                disabled={songCount >= 100}
              >
                <PlusIcon />
              </button>
            </div>
            
            <div className="slider-container">
              <input
                type="range"
                id="song-count"
                min="10"
                max="100"
                value={songCount}
                onChange={(e) => {
                  setSongCount(parseInt(e.target.value, 10));
                }}
                className="song-slider"
              />
            </div>
          </div>
        </div>
        
        <div className="playlist-creator-grid">
          <div className="search-section">
            <SearchBox />
          </div>
          
          <div className="selection-section">
            <SelectionPanel />
            
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
        
        <div className="fixed-button-container">
          <div className="buttons-wrapper">
            <button 
              className="secondary-action-button" 
              onClick={clearSelections}
              disabled={loading || (selectedTracks.length === 0 && selectedArtists.length === 0 && 
                        selectedAlbums.length === 0 && selectedPlaylists.length === 0 && 
                        playlistName === '')}
            >
              Clear All
            </button>
            
            <button 
              className="primary-action-button" 
              onClick={handleSubmit}
              disabled={loading || (selectedTracks.length === 0 && selectedArtists.length === 0 && 
                        selectedAlbums.length === 0 && selectedPlaylists.length === 0) || 
                        !playlistName.trim()}
            >
              {loading ? 'Processing...' : 'Generate Playlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaylistCreator;