// client/src/components/SearchBox.js - Updated with label styling
import React, { useState, useEffect } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';
import api from '../services/api';
import SearchResults from './SearchResults';
import './SearchBox.css';

function SearchBox() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('track');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const { addTrack, addArtist, addAlbum } = usePlaylist();
  
  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    
    return () => {
      clearTimeout(handler);
    };
  }, [query]);
  
  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    
    async function performSearch() {
      setLoading(true);
      
      try {
        const response = await api.get('/spotify/search', {
          params: {
            q: debouncedQuery,
            type: searchType,
            limit: 50 // Increased from default 20 to 50
          }
        });
        
        let resultItems = [];
        
        if (searchType === 'track' && response.data.tracks) {
          resultItems = response.data.tracks.items || [];
        } else if (searchType === 'artist' && response.data.artists) {
          resultItems = response.data.artists.items || [];
        } else if (searchType === 'album' && response.data.albums) {
          resultItems = response.data.albums.items || [];
        } else if (searchType === 'playlist' && response.data.playlists) {
          resultItems = response.data.playlists.items || [];
          
          // For playlists, normalize the data structure
          if (resultItems && resultItems.length > 0) {
            resultItems = resultItems.map(playlist => {
              if (playlist) {
                return {
                  ...playlist,
                  // Ensure tracks property exists and has a total
                  tracks: playlist.tracks || { total: playlist.tracks_total || 0 }
                };
              }
              return null;
            }).filter(Boolean); // Remove any null items
          }
        }
        
        setResults(resultItems);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    
    performSearch();
  }, [debouncedQuery, searchType]);
  
  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };
  
  const handleTypeChange = (e) => {
    setSearchType(e.target.value);
    setResults([]);
  };
  
  const handleSelect = (item) => {
    if (!item) return;
    
    if (searchType === 'track') {
      addTrack(item);
    } else if (searchType === 'artist') {
      addArtist(item);
    } else if (searchType === 'album') {
      addAlbum(item);
    } else if (searchType === 'playlist') {
      // For playlists, fetch tracks and add them
      fetchPlaylistTracks(item.id);
    }
  };
  
  const fetchPlaylistTracks = async (playlistId) => {
    if (!playlistId) return;
    
    try {
      const response = await api.get(`/spotify/playlist/${playlistId}`);
      
      // Handle possible different response structure
      let tracks = [];
      if (response.data.items) {
        tracks = response.data.items
          .map(item => item.track)
          .filter(track => track !== null);
      } else if (response.data.tracks && response.data.tracks.items) {
        tracks = response.data.tracks.items
          .map(item => item.track)
          .filter(track => track !== null);
      }
      
      // Add each track to selection
      tracks.forEach(track => {
        if (track) {
          addTrack(track);
        }
      });
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
    }
  };
  
  return (
    <div className="search-box">
      <div className="search-controls">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search for music..."
            className="search-input"
          />
        </div>
        
        <div className="search-type-selector">
          <select value={searchType} onChange={handleTypeChange} className="type-select">
            <option value="track">Tracks</option>
            <option value="artist">Artists</option>
            <option value="album">Albums</option>
            <option value="playlist">Playlists</option>
          </select>
        </div>
      </div>
      
      <SearchResults 
        results={results} 
        type={searchType} 
        loading={loading}
        onSelect={handleSelect}
      />
    </div>
  );
}

export default SearchBox;