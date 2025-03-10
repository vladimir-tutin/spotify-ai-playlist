// client/src/pages/PlaylistGeneration.js - Updated to use URIs directly and display album art
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import api from '../services/api';
import './PlaylistGeneration.css';
import ThinkingAnimation from '../components/ThinkingAnimation'

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
  
  // Check stream status and handle the AI response
  useEffect(() => {
    let interval;
    
    async function checkStreamStatus() {
      try {
        // Ensure token is fresh
        await refreshTokens();
        
        const response = await api.get(`/ai/stream-status/${streamId}`);
        console.log('Stream status response:', response.data);
        
        const { status, content, error: streamError, userTracks: streamUserTracks } = response.data;

        // Process AI response - handle the JSON parsing issue
        let analysisData = null;
        let recommendationsData = [];

        if (content && status === 'completed') {
          try {
            // Try to parse the AI response
            const parsedData = parseAIResponse(content);
            
            if (parsedData) {
              analysisData = parsedData.analysis || null;
              recommendationsData = parsedData.recommendations || [];
              
              // Mark all recommendations as pre-validated (important change)
              if (recommendationsData.length > 0) {
                recommendationsData = recommendationsData.map(rec => ({
                  ...rec,
                  validated: true,
                  spotifyUri: rec.uri // Use the provided URI directly
                }));
              }
              
              // Log successful parsing
              console.log('Successfully parsed AI response:', {
                analysis: analysisData,
                recommendations: recommendationsData.length
              });
            } else {
              // If parsing fails, handle as error
              throw new Error("Failed to parse AI response");
            }
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            setError(`Failed to process AI response: ${parseError.message}`);
          }
        }

        // Store user tracks if they're included in the response
        if (streamUserTracks && streamUserTracks.length > 0) {
          setUserTracks(streamUserTracks);
        } else if (userTracks.length === 0 && selectedTracks.length > 0) {
          // If no tracks in response but we have tracks in context, use those
          setUserTracks(selectedTracks);
        }
        
        if (streamError && (!analysisData || recommendationsData.length === 0)) {
          setError(streamError);
          clearInterval(interval);
          setLoading(false);
          return;
        }
        
        if (status === 'completed') {
          setLoading(false);
          setAiThinking(false);
          
          // Set data from parsing
          if (analysisData) setAnalysis(analysisData);
          if (recommendationsData.length > 0) setRecommendations(recommendationsData);
          
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
  
  // Helper function to parse AI response with improved error handling
  function parseAIResponse(text) {
    try {
      // First, try direct parsing - maybe it's already valid JSON
      return JSON.parse(text);
    } catch (e) {
      console.log('Direct JSON parse failed, trying to extract from markdown...');
      
      try {
        // Look for JSON within markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log('Found JSON within markdown block, parsing...');
          return JSON.parse(jsonMatch[1]);
        }
        
        // Look for JSON without markdown code blocks
        const jsonRegex = /(\{[\s\S]*\})/g;
        const matches = text.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          // Try each match until we find valid JSON
          for (const match of matches) {
            try {
              console.log('Found potential JSON object, attempting to parse...');
              return JSON.parse(match);
            } catch (err) {
              console.log('Parse attempt failed, trying next match...');
            }
          }
        }
        
        // If we get here, we couldn't extract JSON
        throw new Error('Could not extract valid JSON from the response');
      } catch (err) {
        console.error('JSON extraction failed:', err);
        console.log('Full response text:', text);
        throw new Error('Failed to extract JSON from AI response: ' + err.message);
      }
    }
  }
  
  // Enhanced createPlaylist function that skips validation since URIs are already provided
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
      
      // Step 2: Add tracks to playlist - directly use URIs without validation
      const tracksToAdd = [
        ...userTracks.map(track => track.uri),
        ...recommendations.map(rec => rec.uri) // Use URIs directly without validation
      ];
      
      setProgress(50);
      
      // If we don't have enough tracks, get recommendations from Spotify
      if (tracksToAdd.length < songCount && userTracks.length > 0) {
        try {
          const seedTracks = userTracks.slice(0, 5).map(t => t.id).join(',');
          const recResponse = await api.get('/spotify/recommendations', {
            params: {
              seed_tracks: seedTracks,
              limit: songCount - tracksToAdd.length
            }
          });
          
          const spotifyRecs = recResponse.data.tracks || [];
          tracksToAdd.push(...spotifyRecs.map(t => t.uri));
        } catch (error) {
          console.error('Error getting fallback recommendations:', error);
        }
      }
      
      setProgress(70);
      
      // Add tracks in batches (Spotify API limitation)
      const uniqueTracks = [...new Set(tracksToAdd)].slice(0, songCount);
      
      for (let i = 0; i < uniqueTracks.length; i += 100) {
        const batch = uniqueTracks.slice(i, i + 100);
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
        userTracks,
        recommendations
      });
      
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
  
  // Helper function to extract Spotify ID from URI
  const getSpotifyId = (uri) => {
    if (!uri) return null;
    const parts = uri.split(':');
    return parts.length === 3 ? parts[2] : null;
  };
  
  return (
    <div className="page-container">
      <Header />
      
      <div className="content-container content-with-fixed-buttons">
        <h1 className="page-title">Your AI-Powered Playlist</h1>
        
        {loading && (
          <div className="thinking-section">
            <ThinkingAnimation 
              selectedTracks={selectedTracks}
              selectedArtists={selectedArtists}
              selectedAlbums={selectedAlbums}
              selectedPlaylists={selectedPlaylists}
            />
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
              <div className="analysis-content">
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
            </div>
            
            <div className="tracks-grid">
              {/* User selection section */}
              <div className="content-panel user-selection-section">
                <h2 className="section-title">Your Selected Tracks</h2>
                {userTracks.length > 0 ? (
                  <div className="track-list">
                    {userTracks.slice(0, Math.floor(songCount / 2)).map((track) => (
                      <div className="track-item" key={track.id}>
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
                      </div>
                    ))}
                  </div>
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
              
              {/* AI recommendations section - now with album artwork */}
              <div className="content-panel recommendations-section">
                <h2 className="section-title">AI-Recommended Tracks ({recommendations.length})</h2>
                <div className="recommendation-grid">
                  {recommendations.map((rec, index) => {
                    // Get Spotify ID from URI for constructing album art URL
                    const trackId = getSpotifyId(rec.uri);
                    
                    return (
                      <div key={index} className="recommendation-card">
                        {/* Album artwork - use albumImage directly from recommendation */}
                        <div className="recommendation-image">
                          <a 
                            href={trackId ? `https://open.spotify.com/track/${trackId}` : '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            {rec.albumImage ? (
                              <img 
                                src={rec.albumImage} 
                                alt={`${rec.title} by ${rec.artist}`}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://via.placeholder.com/80?text=No+Cover";
                                }}
                              />
                            ) : (
                              <div className="track-image-placeholder">♪</div>
                            )}
                          </a>
                        </div>
                        <div className="recommendation-content">
                          <div className="recommendation-header">
                            <h3>{rec.title}</h3>
                            <p className="artist">{rec.artist}</p>
                          </div>
                          <p className="reason">{rec.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="fixed-button-container">
              <div className="single-button-container">
                {!complete ? (
                  <button 
                    className="create-playlist-button"
                    onClick={createPlaylist}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <span>Creating Playlist...</span>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      'Create Playlist in Spotify'
                    )}
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