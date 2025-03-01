import React, { useState } from 'react';
import './SearchResults.css';

function SearchResults({ results, type, loading, onSelect }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 48; // Show 48 items per page
  
  // Filter out any null items and ensure results is an array
  const validResults = Array.isArray(results) ? results.filter(item => item !== null) : [];
  
  if (loading) {
    return (
      <div className="search-results loading">
        <div className="spinner"></div>
        <p>Searching...</p>
      </div>
    );
  }
  
  if (validResults.length === 0) {
    return (
      <div className="search-results empty">
        <p>Search for music to add to your playlist</p>
      </div>
    );
  }
  
  // Pagination logic
  const totalPages = Math.ceil(validResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = validResults.slice(startIndex, endIndex);
  
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  // Helper to get image URL or return null
  const getImageUrl = (item) => {
    if (!item) return null;
    
    if (type === 'track' && item.album?.images?.[0]) {
      return item.album.images[0].url;
    } else if (['artist', 'album', 'playlist'].includes(type) && item.images?.[0]) {
      return item.images[0].url;
    }
    return null;
  };
  
  // Helper to get item name and subtitle
  const getItemInfo = (item) => {
    if (!item) return { name: 'Unknown', subtitle: '' };
    
    switch (type) {
      case 'track':
        return {
          name: item.name || 'Unknown Track',
          subtitle: item.artists ? item.artists.map(a => a.name).join(', ') : 'Unknown Artist'
        };
      case 'artist':
        return {
          name: item.name || 'Unknown Artist',
          subtitle: 'Artist'
        };
      case 'album':
        return {
          name: item.name || 'Unknown Album',
          subtitle: item.artists ? item.artists.map(a => a.name).join(', ') : 'Unknown Artist'
        };
      case 'playlist':
        return {
          name: item.name || 'Unknown Playlist',
          subtitle: `Playlist • ${item.tracks?.total || 0} tracks`
        };
      default:
        return { name: item.name || 'Unknown', subtitle: '' };
    }
  };
  
  const renderItem = (item) => {
    if (!item || !item.id) return null;
    
    const imageUrl = getImageUrl(item);
    const { name, subtitle } = getItemInfo(item);
    
    return (
      <div className="result-item" key={item.id} onClick={() => onSelect(item)}>
        <div className="result-image-wrapper">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="result-image" />
          ) : (
            <div className="result-image-placeholder">
              {type === 'track' ? '♪' : type === 'artist' ? '👤' : type === 'album' ? '💿' : '📋'}
            </div>
          )}
        </div>
        <div className="result-info">
          <h3 title={name}>{name}</h3>
          <p title={subtitle}>{subtitle}</p>
        </div>
        <div className="result-actions">
          <button className="add-button" onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}>+</button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="search-results">
      <div className="results-grid">
        {currentResults.map((item) => renderItem(item)).filter(Boolean)}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            className="pagination-button" 
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button 
            className="pagination-button" 
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchResults;