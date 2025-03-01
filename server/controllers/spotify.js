const SpotifyService = require('../services/spotify');
const spotifyService = new SpotifyService();

exports.login = (req, res) => {
  // Debug the Spotify service and authorization URL
  console.log('SpotifyService clientId:', spotifyService.clientId ? 'exists' : 'missing');
  console.log('Creating Spotify auth URL with client ID:', spotifyService.clientId);
  
  const authUrl = spotifyService.createAuthURL();
  console.log('Generated auth URL:', authUrl);
  
  if (!authUrl.includes('client_id=')) {
    console.error('ERROR: client_id is missing from the auth URL');
    return res.status(500).json({ 
      error: 'Failed to create Spotify authorization URL',
      details: 'Client ID is missing. Check your environment variables.'
    });
  }
  
  res.json({ url: authUrl });
};

exports.logout = (req, res) => {
  // Clear the auth cookies by setting expiration to a past date
  res.cookie('spotify_access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0) // Set expiration to epoch time (1970)
  });
  
  res.cookie('spotify_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0) // Set expiration to epoch time (1970)
  });
  
  console.log('User logged out, cookies cleared');
  res.json({ success: true });
};

exports.callback = async (req, res) => {
  const { code } = req.query;
  
  try {
    const tokens = await spotifyService.getTokens(code);
    
    // Set cookies with tokens
    res.cookie('spotify_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expires_in * 1000
    });
    
    res.cookie('spotify_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Redirect to client app
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`);
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/error?message=${encodeURIComponent('Authentication failed')}`);
  }
};

exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.spotify_refresh_token;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found' });
  }
  
  try {
    const tokens = await spotifyService.refreshAccessToken(refreshToken);
    
    res.cookie('spotify_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expires_in * 1000
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
};

exports.getUserProfile = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const profile = await spotifyService.getUserProfile(accessToken);
    res.json(profile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

exports.getUserPlaylists = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const playlists = await spotifyService.getUserPlaylists(accessToken);
    res.json(playlists);
  } catch (error) {
    console.error('Playlists fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user playlists' });
  }
};

exports.getPlaylistTracks = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  const { id } = req.params;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const tracks = await spotifyService.getPlaylistTracks(accessToken, id);
    res.json(tracks);
  } catch (error) {
    console.error('Playlist tracks fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
};

exports.search = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  const { q, type } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const results = await spotifyService.search(accessToken, q, type || 'track,artist,album,playlist');
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.getRecommendations = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  const { seed_tracks, seed_artists, seed_genres } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const recommendations = await spotifyService.getRecommendations(
      accessToken, 
      { seed_tracks, seed_artists, seed_genres }
    );
    res.json(recommendations);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

exports.createPlaylist = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  const { name, description, isPublic } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const playlist = await spotifyService.createPlaylist(
      accessToken,
      { name, description, public: isPublic ?? false }
    );
    res.json(playlist);
  } catch (error) {
    console.error('Playlist creation error:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
};

exports.addTracksToPlaylist = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  const { playlistId, uris } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    console.log(`Adding tracks to playlist ${playlistId}:`);
    console.log(`Total tracks to add: ${uris.length}`);
    console.log('First few track URIs:', uris.slice(0, 10));
    
    // Spotify playlist API allows adding 100 tracks max per request
    const chunks = [];
    for (let i = 0; i < uris.length; i += 100) {
      chunks.push(uris.slice(i, i + 100));
    }
    
    const results = [];
    for (const [index, chunk] of chunks.entries()) {
      console.log(`Adding chunk ${index + 1} with ${chunk.length} tracks`);
      const response = await spotifyService.addTracksToPlaylist(
        accessToken,
        playlistId,
        chunk
      );
      
      results.push(response);
      
      console.log(`Chunk ${index + 1} added successfully`);
    }
    
    res.json({ 
      success: true, 
      totalTracksAdded: uris.length,
      chunks: results.length 
    });
  } catch (error) {
    console.error('Add tracks error:', error.response ? error.response.data : error);
    res.status(500).json({ 
      error: 'Failed to add tracks to playlist',
      details: error.response ? error.response.data : error.message
    });
  }
};

exports.getRecentlyPlayed = async (req, res) => {
  const accessToken = req.cookies.spotify_access_token;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const recentlyPlayed = await spotifyService.getRecentlyPlayed(accessToken);
    res.json(recentlyPlayed);
  } catch (error) {
    console.error('Recently played fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recently played tracks' });
  }
};
