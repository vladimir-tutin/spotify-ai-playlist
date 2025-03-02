// client/src/components/SelectionPanel.js - Updated with label styling
import React, { useState } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';
import './SelectionPanel.css';
import { RemoveIcon } from './Icons';

function SelectionPanel() {
  const { 
    selectedTracks,
    selectedArtists,
    selectedAlbums,
    selectedPlaylists,
    removeTrack,
    removeArtist,
    removeAlbum,
    removePlaylist
  } = usePlaylist();
  
  const [activeTab, setActiveTab] = useState('tracks');
  
  // Count total selections
  const totalSelections = selectedTracks.length + selectedArtists.length + 
                         selectedAlbums.length + selectedPlaylists.length;
  
  // Determine which tab to show by default
  React.useEffect(() => {
    if (selectedTracks.length > 0) {
      setActiveTab('tracks');
    } else if (selectedArtists.length > 0) {
      setActiveTab('artists');
    } else if (selectedAlbums.length > 0) {
      setActiveTab('albums');
    } else if (selectedPlaylists.length > 0) {
      setActiveTab('playlists');
    }
  }, [selectedTracks.length, selectedArtists.length, selectedAlbums.length, selectedPlaylists.length]);
  
  // Enhanced removal handlers with stopPropagation
  const handleRemoveTrack = (e, trackId) => {
    e.stopPropagation();
    removeTrack(trackId);
  };

  const handleRemoveArtist = (e, artistId) => {
    e.stopPropagation();
    removeArtist(artistId);
  };

  const handleRemoveAlbum = (e, albumId) => {
    e.stopPropagation();
    removeAlbum(albumId);
  };

  const handleRemovePlaylist = (e, playlistId) => {
    e.stopPropagation();
    removePlaylist(playlistId);
  };
  
  return (
    <div className="selection-panel">
      <div className="selection-tabs">
        <button 
          className={`tab-button ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          Tracks ({selectedTracks.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'artists' ? 'active' : ''}`}
          onClick={() => setActiveTab('artists')}
        >
          Artists ({selectedArtists.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'albums' ? 'active' : ''}`}
          onClick={() => setActiveTab('albums')}
        >
          Albums ({selectedAlbums.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveTab('playlists')}
        >
          Playlists ({selectedPlaylists.length})
        </button>
      </div>
      
      <div className="selected-items">
        {activeTab === 'tracks' && (
          <div className="tracks-container">
            {selectedTracks.length === 0 ? (
              <div className="empty-selection">
                <p>No tracks selected</p>
              </div>
            ) : (
              selectedTracks.map((track) => (
                <div className="selected-item" key={track.id}>
                  <div className="selected-image-wrapper">
                    {track.album?.images[0] ? (
                      <img src={track.album.images[0].url} alt={track.name} className="selected-image" />
                    ) : (
                      <div className="selected-image-placeholder">♪</div>
                    )}
                  </div>
                  <div className="selected-info">
                    <h3>{track.name}</h3>
                    <p>{track.artists.map(a => a.name).join(', ')}</p>
                  </div>
                  <button 
                    className="remove-button" 
                    onClick={(e) => handleRemoveTrack(e, track.id)}
                  >
                    <RemoveIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'artists' && (
          <div className="artists-container">
            {selectedArtists.length === 0 ? (
              <div className="empty-selection">
                <p>No artists selected</p>
                <span className="hint">Artists influence recommendations but don't count toward the track limit</span>
              </div>
            ) : (
              selectedArtists.map((artist) => (
                <div className="selected-item" key={artist.id}>
                  <div className="selected-image-wrapper">
                    {artist.images?.[0] ? (
                      <img src={artist.images[0].url} alt={artist.name} className="selected-image" />
                    ) : (
                      <div className="selected-image-placeholder">👤</div>
                    )}
                  </div>
                  <div className="selected-info">
                    <h3>{artist.name}</h3>
                    <p>Artist</p>
                  </div>
                  <button 
                    className="remove-button" 
                    onClick={(e) => handleRemoveArtist(e, artist.id)}
                  >
                    <RemoveIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'albums' && (
          <div className="albums-container">
            {selectedAlbums.length === 0 ? (
              <div className="empty-selection">
                <p>No albums selected</p>
                <span className="hint">Albums are used to influence the AI's recommendations</span>
              </div>
            ) : (
              selectedAlbums.map((album) => (
                <div className="selected-item" key={album.id}>
                  <div className="selected-image-wrapper">
                    {album.images?.[0] ? (
                      <img src={album.images[0].url} alt={album.name} className="selected-image" />
                    ) : (
                      <div className="selected-image-placeholder">💿</div>
                    )}
                  </div>
                  <div className="selected-info">
                    <h3>{album.name}</h3>
                    <p>{album.artists?.map(a => a.name).join(', ')}</p>
                  </div>
                  <button 
                    className="remove-button" 
                    onClick={(e) => handleRemoveAlbum(e, album.id)}
                  >
                    <RemoveIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'playlists' && (
          <div className="playlists-container">
            {selectedPlaylists.length === 0 ? (
              <div className="empty-selection">
                <p>No playlists selected</p>
                <span className="hint">Playlists are used to influence the AI's recommendations</span>
              </div>
            ) : (
              selectedPlaylists.map((playlist) => (
                <div className="selected-item" key={playlist.id}>
                  <div className="selected-image-wrapper">
                    {playlist.images?.[0] ? (
                      <img src={playlist.images[0].url} alt={playlist.name} className="selected-image" />
                    ) : (
                      <div className="selected-image-placeholder">📋</div>
                    )}
                  </div>
                  <div className="selected-info">
                    <h3>{playlist.name}</h3>
                    <p>Playlist • {playlist.tracks?.total || 0} tracks</p>
                  </div>
                  <button 
                    className="remove-button" 
                    onClick={(e) => handleRemovePlaylist(e, playlist.id)}
                  >
                    <RemoveIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectionPanel;