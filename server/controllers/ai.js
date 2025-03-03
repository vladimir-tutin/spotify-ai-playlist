// server/controllers/ai.js
const AIService = require('../services/ai');
const SpotifyService = require('../services/spotify');

// Create ONE global instance to maintain state across requests
const globalAIService = new AIService();

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getSpotifyRecommendations(accessToken, analysis, seedTracks, count) {
  try {
    const spotifyService = new SpotifyService();
    
    // Extract seed tracks (up to 5, which is Spotify's limit)
    const trackSeeds = seedTracks
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, 5)
      .map(track => track.id);
    
    // Extract seed genres from AI analysis
    const genreSeeds = analysis.genres || [];
    
    // Prepare recommendation parameters
    const params = {
      seed_tracks: trackSeeds.join(','),
      limit: count
    };
    
    // If we have genres from analysis, add them
    if (genreSeeds.length > 0) {
      // Spotify only allows 5 seeds total (tracks + artists + genres)
      const remainingSeeds = 5 - trackSeeds.length;
      if (remainingSeeds > 0) {
        params.seed_genres = genreSeeds
          .slice(0, remainingSeeds)
          .map(genre => genre.toLowerCase().replace(/\s+/g, '-'))
          .join(',');
      }
    }
    
    // Get recommendations from Spotify
    const recommendations = await spotifyService.getRecommendations(accessToken, params);
    
    // Format the recommendations
    return recommendations.tracks.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      uri: track.uri,
      albumImage: track.album?.images?.[0]?.url,
      reason: `This ${track.artists[0].name} track fits with your preference for ${analysis.genres[0] || 'this music style'}`
    }));
  } catch (error) {
    console.error('Error getting Spotify recommendations:', error);
    return [];
  }
}


exports.generatePlaylist = async (req, res) => {
  console.time('generatePlaylist');
  const accessToken = req.cookies.spotify_access_token;
  const { 
    selectedTracks, 
    selectedArtists, 
    selectedAlbums, 
    selectedPlaylists,
    playlistName, 
    playlistDescription,
    songCount = 25 // Default to 25 songs if not provided
  } = req.body;
  
  // Log key information
  console.log('Generating playlist:', playlistName);
  console.log('Description:', playlistDescription);
  console.log('Song count:', songCount);
  console.log('Selected tracks count:', selectedTracks?.length || 0);
  console.log('Selected artists count:', selectedArtists?.length || 0);
  console.log('Selected albums count:', selectedAlbums?.length || 0);
  console.log('Selected playlists count:', selectedPlaylists?.length || 0);
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!selectedTracks?.length && !selectedArtists?.length && 
      !selectedAlbums?.length && !selectedPlaylists?.length) {
    return res.status(400).json({ error: 'No music selected' });
  }
  
  try {
    // Use the global AIService instance to maintain stream data across requests
    // But create a fresh SpotifyService instance for each request
    const spotifyService = new SpotifyService();
    
    // Array to hold all track details
    let allTracks = [];
    let influenceSources = [];
    
    console.time('fetchTrackDetails');
    
    // Get tracks directly selected
    if (selectedTracks && selectedTracks.length > 0) {
      const trackDetails = await Promise.all(
        selectedTracks.map(async (trackId) => {
          return await spotifyService.getTrack(accessToken, trackId);
        })
      );
      allTracks = [...allTracks, ...trackDetails];
    }
    
    // Get tracks from albums if any
    if (selectedAlbums && selectedAlbums.length > 0) {
      for (const albumId of selectedAlbums) {
        try {
          const albumDetails = await spotifyService.getAlbum(accessToken, albumId);
          influenceSources.push(`Album: ${albumDetails.name} by ${albumDetails.artists[0].name}`);
          
          // Get album tracks
          const albumTracks = await spotifyService.getAlbumTracks(accessToken, albumId);
          if (albumTracks.items && albumTracks.items.length > 0) {
            // Get full track details for top 5 tracks from this album
            const topAlbumTracks = albumTracks.items.slice(0, 5);
            const albumTrackDetails = await Promise.all(
              topAlbumTracks.map(async (track) => {
                return await spotifyService.getTrack(accessToken, track.id);
              })
            );
            allTracks = [...allTracks, ...albumTrackDetails];
          }
        } catch (error) {
          console.error('Error fetching album tracks:', error);
        }
      }
    }
    
    // Get top tracks from artists if any
    if (selectedArtists && selectedArtists.length > 0) {
      for (const artistId of selectedArtists) {
        try {
          const artistDetails = await spotifyService.getArtist(accessToken, artistId);
          influenceSources.push(`Artist: ${artistDetails.name}`);
          
          // Get artist's top tracks
          const topTracks = await spotifyService.getArtistTopTracks(accessToken, artistId);
          if (topTracks.tracks && topTracks.tracks.length > 0) {
            // Get top 5 tracks for influence
            const topArtistTracks = topTracks.tracks.slice(0, 5);
            allTracks = [...allTracks, ...topArtistTracks];
          }
        } catch (error) {
          console.error('Error fetching artist top tracks:', error);
        }
      }
    }
    
    // Get tracks from playlists if any
    if (selectedPlaylists && selectedPlaylists.length > 0) {
      for (const playlistId of selectedPlaylists) {
        try {
          const playlistDetails = await spotifyService.getPlaylist(accessToken, playlistId);
          influenceSources.push(`Playlist: ${playlistDetails.name}`);
          
          // Get playlist tracks
          const playlistTracks = await spotifyService.getPlaylistTracks(accessToken, playlistId);
          if (playlistTracks.items && playlistTracks.items.length > 0) {
            // Get top 10 tracks from this playlist for influence
            const topPlaylistTracks = playlistTracks.items.slice(0, 10)
              .map(item => item.track)
              .filter(track => track !== null);
            allTracks = [...allTracks, ...topPlaylistTracks];
          }
        } catch (error) {
          console.error('Error fetching playlist tracks:', error);
        }
      }
    }
    
    console.timeEnd('fetchTrackDetails');
    console.log('Total tracks collected:', allTracks.length);
    
    // Deduplicate tracks by ID
    const uniqueTracks = [];
    const trackIds = new Set();
    for (const track of allTracks) {
      if (!trackIds.has(track.id)) {
        uniqueTracks.push(track);
        trackIds.add(track.id);
      }
    }
    console.log('Unique tracks after deduplication:', uniqueTracks.length);
    
    // IMPORTANT CHANGE: All tracks should be analyzed, but we'll randomly select tracks for the final playlist
    // Save a copy of all unique tracks for analysis
    const allTracksForAnalysis = [...uniqueTracks];
    
    // Shuffle the tracks and pick a subset for the final playlist if there are more than songCount/2
    let tracksForFinalPlaylist = uniqueTracks;
    const userTrackLimit = Math.min(uniqueTracks.length, Math.floor(songCount / 2));
    
    if (uniqueTracks.length > userTrackLimit) {
      console.log(`Randomly selecting ${userTrackLimit} tracks from ${uniqueTracks.length} total tracks`);
      tracksForFinalPlaylist = shuffleArray([...uniqueTracks]).slice(0, userTrackLimit);
    }
    
    // Calculate how many AI recommendations to get
    const aiTrackLimit = songCount - userTrackLimit;
    
    console.log(`Using all ${allTracksForAnalysis.length} tracks for analysis`);
    console.log(`Will include ${userTrackLimit} user tracks and request ${aiTrackLimit} AI recommendations in the final playlist`);
    
    // Prepare enhanced description with influence sources
    let enhancedDescription = playlistDescription || '';
    if (influenceSources.length > 0) {
      if (enhancedDescription) enhancedDescription += '\n\n';
      enhancedDescription += 'Influenced by: ' + influenceSources.join(', ');
    }
    
    console.log('Creating AI analysis stream...');
    console.time('createAnalysisStream');
    
    // First, create a stream for the reasoning process
    // Use ALL tracks for analysis, but specify that only a subset will be used in the final playlist
    const reasoningStream = await globalAIService.analyzeTracksStreaming(
      allTracksForAnalysis,
      playlistName,
      enhancedDescription,
      aiTrackLimit,
      songCount
    );
    console.timeEnd('createAnalysisStream');
    
    console.log('Stream created with ID:', reasoningStream.id);
    
    // Send the initial response with the stream ID and the tracks that will be used in the final playlist
    res.json({ 
      status: 'processing',
      streamId: reasoningStream.id,
      userTracks: tracksForFinalPlaylist, // Send the subset of tracks that will be used
      message: 'AI is analyzing your music selection and generating recommendations...'
    });
    
    console.timeEnd('generatePlaylist');
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate AI recommendations: ' + error.message });
    console.timeEnd('generatePlaylist');
  }
};

exports.analyzeTracks = async (req, res) => {
  const { tracks, playlistName, playlistDescription } = req.body;
  
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    return res.status(400).json({ error: 'No tracks provided for analysis' });
  }
  
  try {
    // Use the global AIService instance for consistency
    const analysis = await globalAIService.analyzeTracks(tracks, playlistName, playlistDescription);
    res.json(analysis);
  } catch (error) {
    console.error('Track analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze tracks: ' + error.message });
  }
};

// IMPORTANT: This needs to be a separate export, not nested inside generatePlaylist
exports.createPlaylistFromRecommendations = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  const { streamId, playlistName, playlistDescription, songCount = 25 } = req.body;
  
  if (!streamId) {
    return res.status(400).json({ error: 'Stream ID is required' });
  }
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Get AI recommendations from the stream
    const streamStatus = globalAIService.getStreamStatus(streamId);
    
    if (!streamStatus.exists || streamStatus.status !== 'completed') {
      return res.status(400).json({ 
        error: 'AI recommendations not completed or stream not found'
      });
    }
    
    const recommendations = streamStatus.recommendations || [];
    const userTracks = streamStatus.userTracks || [];
    const analysis = streamStatus.analysis || {};
    
    // For now, let's just implement a simple version without the validateAndResolveRecommendations function
    // You can add that utility later
    
    // Step 1: Create a new playlist
    const spotifyService = new SpotifyService();
    const playlist = await spotifyService.createPlaylist(accessToken, {
      name: playlistName || analysis.playlistName || 'AI Generated Playlist',
      description: playlistDescription || 'Created with AI based on your musical taste.',
      isPublic: false
    });
    
    // Step 2: Search for each recommended track
    const validatedTracks = [];
    const notFoundTracks = [];
    
    for (const rec of recommendations) {
      try {
        // Create search queries
        const searchQuery = `track:"${rec.title}" artist:"${rec.artist}"`;
        
        const searchResponse = await spotifyService.search(
          accessToken, 
          searchQuery, 
          'track', 
          5
        );
        
        if (searchResponse.tracks?.items?.length > 0) {
          // Find the best match (simplistic approach for now)
          const track = searchResponse.tracks.items[0];
          validatedTracks.push({
            id: track.id,
            uri: track.uri,
            name: track.name,
            artist: track.artists[0].name
          });
        } else {
          notFoundTracks.push(rec);
        }
      } catch (error) {
        console.error('Error searching for track:', error);
        notFoundTracks.push(rec);
      }
    }
    
    // Step 3: Add tracks to the playlist
    const tracksToAdd = [
      ...userTracks.map(track => track.uri),
      ...validatedTracks.map(track => track.uri)
    ];
    
    // Add tracks in batches (Spotify API limitation)
    const results = [];
    for (let i = 0; i < tracksToAdd.length; i += 100) {
      const batch = tracksToAdd.slice(i, i + 100);
      const result = await spotifyService.addTracksToPlaylist(
        accessToken,
        playlist.id,
        batch
      );
      results.push(result);
    }
    
    res.json({
      success: true,
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls.spotify,
      stats: {
        totalTracks: tracksToAdd.length,
        userTracks: userTracks.length,
        aiTracks: validatedTracks.length,
        notFound: notFoundTracks.length
      },
      validatedRecommendations: validatedTracks,
      notFoundRecommendations: notFoundTracks
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist: ' + error.message });
  }
};

exports.getStreamStatus = async (req, res) => {
  console.log('Stream status requested for ID:', req.params.streamId);
  
  const { streamId } = req.params;
  const accessToken = req.cookies.spotify_access_token;
  
  if (!streamId) {
    return res.status(400).json({ error: 'Stream ID is required' });
  }
  
  try {
    // Use the global AIService instance to access the same streams map
    const streamStatus = globalAIService.getStreamStatus(streamId);
    
    if (!streamStatus.exists) {
      console.log(`Stream ${streamId} not found`);
      return res.status(404).json({ error: 'Stream not found or expired' });
    }
    
    // IMPORTANT: Run validation if stream is completed but not yet validated
    if (streamStatus.status === 'completed' && 
        !streamStatus.validationComplete && 
        streamStatus.recommendations && 
        streamStatus.recommendations.length > 0) {
      
      console.log(`Stream ${streamId} is completed but not validated, running validation...`);
      await globalAIService.validateRecommendations(streamId, accessToken);
    }
    
    console.log(`Returning status for stream ${streamId}:`, streamStatus.status);
    res.json(streamStatus);
  } catch (error) {
    console.error('Stream status error:', error);
    res.status(500).json({ error: 'Failed to get stream status: ' + error.message });
  }
};