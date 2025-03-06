import React from 'react';
import './ThinkingAnimation.css';

const ThinkingAnimation = ({ selectedTracks, selectedArtists, selectedAlbums, selectedPlaylists }) => {
  return (
    <div>
        <div className="analyzing-visual">
            <div className="listening-waves"></div>
            <div className="brain-icon">🧠</div>
            <div className="music-note">♪</div>
            <div className="music-note">♫</div>
            <div className="music-note">♩</div>
            <div className="music-note">♬</div>
            <div className="music-note">🎵</div>
        </div>
            
        <h2 className="thinking-title">Creating Your Perfect Playlist</h2>
        <p className="thinking-message">AI is analyzing your music selection and generating recommendations...</p>
        
        <div className="thinking-animation">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
        </div>
        
        {/* Add selection summary for better user feedback */}
        <div className="selection-summary">
            <p>
            Based on your selection of {selectedTracks.length} tracks
            {selectedArtists.length > 0 ? `, ${selectedArtists.length} artists` : ''}
            {selectedAlbums.length > 0 ? `, ${selectedAlbums.length} albums` : ''}
            {selectedPlaylists.length > 0 ? `, ${selectedPlaylists.length} playlists` : ''}
            </p>
        </div>
    </div>
  );
};

export default ThinkingAnimation;