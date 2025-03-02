// Updated PlaylistGeneration.js with consistent button styling
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import api from '../services/api';
import './PlaylistGeneration.css';

function PlaylistGeneration() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { 
    setGeneratedPlaylist, 
    selectedTracks = [],
    selectedArtists = [],
    selectedAlbums = [],
    selectedPlaylists = [], 
    songCount = 25 
  } = usePlaylist();
  const { refreshTokens } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [userTracks, setUserTracks] = useState([]);
  const [playlistUrl, setPlaylistUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Add this to calculate total selected items
  const totalSelectedItems = selectedTracks.length + selectedArtists.length + 
                            selectedAlbums.length + selectedPlaylists.length;
  
  // Add this useEffect hook to check stream status
  useEffect(() => {
    let interval;
    
    async function checkStreamStatus() {
      try {
        // Log the request
        console.log('Checking stream status for ID:', streamId);
        
        // Ensure token is fresh
        await refreshTokens();
        
        const response = await api.get(`/ai/stream-status/${streamId}`);
        console.log('Stream status response:', response.data);
        
        const { status, content, analysis, recommendations, error: streamError, userTracks: streamUserTracks } = response.data;

        // Store user tracks if they're included in the response
        if (streamUserTracks && streamUserTracks.length > 0) {
          setUserTracks(streamUserTracks);
        } else if (userTracks.length === 0 && selectedTracks.length > 0) {
          // If no tracks in response but we have tracks in context, use those
          setUserTracks(selectedTracks);
        }
        
        if (streamError) {
          setError(streamError);
          clearInterval(interval);
          setLoading(false);
          return;
        }
        
        if (status === 'completed') {
          setLoading(false);
          setAiThinking(false);
          setAnalysis(analysis);
          setRecommendations(recommendations || []);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking stream status:', error);
        if (error.response?.status === 404) {
          setError('The AI processing session was not found or has expired');
          clearInterval(interval);
          setLoading(false);
        }
      }
    }
    
    // Check status immediately and then every 5 seconds
    checkStreamStatus();
    interval = setInterval(checkStreamStatus, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [streamId, refreshTokens, selectedTracks, userTracks.length]);
  
  const createPlaylist = async () => {
    setGenerating(true);
    
    try {
      // Ensure token is fresh
      await refreshTokens();
      
      // Step 1: Create a new playlist
      setProgress(10);
      const playlistResponse = await api.post('/spotify/create-playlist', {
        name: analysis.playlistName || 'AI Generated Playlist',
        description: `Created with AI based on your musical taste. ${analysis.detailed_insights ? analysis.detailed_insights.substring(0, 100) + '...' : ''}`,
        isPublic: false
      });
      
      const playlistId = playlistResponse.data.id;
      setProgress(30);
      
      // Combine tracks from all sources
      const allSourceTracks = [
        ...userTracks, // Original user-selected tracks
        ...(await Promise.all(selectedPlaylists.map(async (playlist) => {
          try {
            const playlistTracksResponse = await api.get(`/spotify/playlist/${playlist.id}`);
            return playlistTracksResponse.data.items
              .map(item => item.track)
              .filter(track => track !== null);
          } catch (error) {
            console.error(`Error fetching tracks for playlist ${playlist.id}:`, error);
            return [];
          }
        }))).flat() // Flatten playlist tracks
      ];
      
      // Get the total number of tracks from the original request
      const totalTracksRequested = songCount || 25;
      
      // Step 2: Find ALL recommendation tracks
      setProgress(50);
      const tracksToAdd = [];
      const notFoundTracks = [];
      
      // First, add source tracks
      tracksToAdd.push(...allSourceTracks.map(track => track.uri).slice(0, totalTracksRequested));
      
      // Then add recommended tracks if needed
      while (tracksToAdd.length < totalTracksRequested && recommendations.length > 0) {
        for (const rec of recommendations) {
          if (tracksToAdd.length >= totalTracksRequested) break;
          
          try {
            // Normalize title variations
            const searchQueries = [
              // Remove periods and spaces
              rec.title.replace(/[. ]/g, ''),
              // Original title
              rec.title,
              // Variations
              rec.title.replace(/\./g, ''),
              rec.title.replace(/ /g, '')
            ];
            
            let trackFound = false;
            
            for (const query of searchQueries) {
              const searchResponse = await api.get('/spotify/search', {
                params: {
                  q: `track:"${query}" artist:"${rec.artist}"`,
                  type: 'track',
                  limit: 5  // Get multiple results to increase chances
                }
              });
              
              // Find best match with more flexible matching
              const bestMatch = searchResponse.data.tracks.items.find(track => {
                // Remove periods and spaces from both track names for comparison
                const normalizedTrackName = track.name.replace(/[. ]/g, '').toLowerCase();
                const normalizedQueryName = query.replace(/[. ]/g, '').toLowerCase();
                const normalizedArtist = track.artists.some(artist => 
                  artist.name.toLowerCase().includes(rec.artist.toLowerCase())
                );
                
                return normalizedTrackName === normalizedQueryName && normalizedArtist;
              });
              
              if (bestMatch) {
                tracksToAdd.push(bestMatch.uri);
                trackFound = true;
                break;
              }
            }
            
            // If no track found after all searches
            if (!trackFound) {
              notFoundTracks.push(rec);
              console.warn(`Could not find track: ${rec.title} by ${rec.artist}`);
            }
          } catch (error) {
            console.error('Error searching for track:', error);
            notFoundTracks.push(rec);
          }
        }
        
        // Break if we've added enough tracks or exhausted recommendations
        if (tracksToAdd.length >= totalTracksRequested) break;
      }
      
      // Trim or pad tracks to match exact requested number
      const finalTracksToAdd = tracksToAdd.slice(0, totalTracksRequested);
      
      setProgress(70);
      
      // Add tracks in batches (Spotify API limitation)
      while (finalTracksToAdd.length > 0) {
        const batch = finalTracksToAdd.splice(0, 100);
        await api.post('/spotify/add-tracks', {
          playlistId,
          uris: batch
        });
      }
      
      setProgress(100);
      setComplete(true);
      setPlaylistUrl(`https://open.spotify.com/playlist/${playlistId}`);
      
      // Store the generated playlist info
      setGeneratedPlaylist({
        id: playlistId,
        name: analysis.playlistName || 'AI Generated Playlist',
        userTracks: allSourceTracks,
        recommendations: recommendations.slice(0, finalTracksToAdd.length),
        notFoundTracks: notFoundTracks.length > 0 ? notFoundTracks : undefined
      });
      
      // Log tracks not found for debugging
      if (notFoundTracks.length > 0) {
        console.log('Tracks not found:', notFoundTracks);
      }
      
    } catch (error) {
      console.error('Error creating playlist:', error);
      setError('Failed to create playlist in Spotify');
    } finally {
      setGenerating(false);
    }
  };
  
  const navigateHome = () => {
    navigate('/dashboard');
  };
  
  const openPlaylist = () => {
    window.open(playlistUrl, '_blank');
  };
  
  return (
    <div className="playlist-generation">
      <Header />
      
      <div className="playlist-generation-container content-with-fixed-buttons">
        <h1>Your AI-Powered Playlist</h1>
        
        {loading && (
  <div className="thinking-section">
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
)}
        
        {error && (
          <div className="error-section">
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button className="primary-action-button" onClick={navigateHome}>Return to Dashboard</button>
          </div>
        )}
        
        {!loading && !error && (
          <div className="results-section">
            <div className="analysis-section">
              <h2>Analysis of Your Music</h2>
              {analysis && (
                <>
                  <div className="genre-chips">
                    {analysis.genres?.map((genre, i) => (
                      <span key={i} className="genre-chip">{genre}</span>
                    ))}
                  </div>
                  
                  <div className="analysis-details">
                    <div className="analysis-item">
                      <h3>Mood</h3>
                      <p>{analysis.mood?.join(', ')}</p>
                    </div>
                    <div className="analysis-item">
                      <h3>Era</h3>
                      <p>{analysis.era?.join(', ')}</p>
                    </div>
                    <div className="analysis-item">
                      <h3>Themes</h3>
                      <p>{analysis.themes?.join(', ')}</p>
                    </div>
                  </div>
                  
                  <div className="analysis-detailed">
                    <h3>Detailed Insights</h3>
                    <p>{analysis.detailed_insights}</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="tracks-grid">
              {/* User selection section */}
              <div className="user-selection-section">
                <h2>Your Selected Tracks</h2>
                {userTracks.length > 0 ? (
                  <>
                    {userTracks.length > 25 && (
                      <div className="selection-notice">
                        <p>You selected {userTracks.length} tracks. For optimal analysis, the first 25 tracks were used.</p>
                      </div>
                    )}
                    <div className="track-list">
                      {userTracks.map((track, index) => (
                        <div className={`track-item ${index >= 25 ? 'track-item-unused' : ''}`} key={track.id || index}>
                          <div className="track-image">
                            {track.album?.images?.[0] ? (
                              <img src={track.album.images[0].url} alt={track.name} />
                            ) : (
                              <div className="track-image-placeholder">♪</div>
                            )}
                          </div>
                          <div className="track-info">
                            <h3>{track.name}</h3>
                            <p>{track.artists ? track.artists.map(a => a.name).join(', ') : 'Unknown Artist'}</p>
                          </div>
                          {index >= 25 && <span className="track-status">Not used</span>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-selection">
                    <p>
                      {totalSelectedItems > 0 ? 
                        `${totalSelectedItems} items analyzed (${selectedTracks.length} tracks, ${selectedArtists.length} artists, ${selectedAlbums.length} albums, ${selectedPlaylists.length} playlists)` :
                        'No tracks could be found in your selection'
                      }
                    </p>
                  </div>
                )}
              </div>
              
              {/* AI recommendations section */}
              <div className="recommendations-section">
                <h2>AI-Recommended Tracks ({recommendations.length})</h2>
                <div className="recommendation-grid">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="recommendation-card">
                      <div className="recommendation-header">
                        <h3>{rec.title}</h3>
                        <p className="artist">{rec.artist}</p>
                      </div>
                      <p className="reason">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="fixed-button-container">
  <div className="single-button-container">
    {!complete ? (
      <button 
        className="primary-action-button" 
        onClick={createPlaylist}
        disabled={generating}
      >
        {generating ? 'Creating...' : 'Create Playlist in Spotify'}
      </button>
    ) : (
      <div className="complete-message">
        <h2>Playlist Created!</h2>
        <button className="primary-action-button" onClick={openPlaylist}>
          Open in Spotify
        </button>
      </div>
    )}
  </div>
</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlaylistGeneration;