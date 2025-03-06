// server/services/spotify.js - Correctly formatted SpotifyService class
const axios = require('axios');
const querystring = require('querystring');

class SpotifyService {
  constructor() {
    // Try to get from environment or use fallback for development (NOT FOR PRODUCTION)
    this.clientId = process.env.SPOTIFY_CLIENT_ID || ""; 
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback';
    this.baseUrl = 'https://api.spotify.com/v1';
    this.authUrl = 'https://accounts.spotify.com/authorize';
    this.tokenUrl = 'https://accounts.spotify.com/api/token';
    
    // Debug
    console.log('SpotifyService initialized with clientId:', this.clientId ? 'exists' : 'missing');
  }
  
  createAuthURL() {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-private',
      'playlist-modify-public'
    ];
    
    return `${this.authUrl}?${querystring.stringify({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri,
      show_dialog: true
    })}`;
  }
  
  async getTokens(code) {
    const response = await axios({
      method: 'post',
      url: this.tokenUrl,
      data: querystring.stringify({
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      }
    });
    
    return response.data;
  }
  
  async refreshAccessToken(refreshToken) {
    const response = await axios({
      method: 'post',
      url: this.tokenUrl,
      data: querystring.stringify({
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      }
    });
    
    return response.data;
  }
  
  async getUserProfile(accessToken) {
    const response = await axios.get(`${this.baseUrl}/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return response.data;
  }
  
  async getUserPlaylists(accessToken, limit = 50) {
    const response = await axios.get(`${this.baseUrl}/me/playlists`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { limit }
    });
    
    return response.data;
  }
  
  async getPlaylist(accessToken, playlistId) {
    const response = await axios.get(`${this.baseUrl}/playlists/${playlistId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return response.data;
  }

  async getPlaylistTracks(accessToken, playlistId, limit = 100) {
    const response = await axios.get(`${this.baseUrl}/playlists/${playlistId}/tracks`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { limit }
    });
    
    return response.data;
  }
  
  async search(accessToken, query, type, limit = 40) {
    const response = await axios.get(`${this.baseUrl}/search`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { q: query, type, limit }
    });
    
    return response.data;
  }

  async getArtist(accessToken, artistId) {
    const response = await axios.get(`${this.baseUrl}/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return response.data;
  }
  
  async getArtistTopTracks(accessToken, artistId, market = 'US') {
    const response = await axios.get(`${this.baseUrl}/artists/${artistId}/top-tracks`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { market }
    });
    
    return response.data;
  }

  async getAlbum(accessToken, albumId) {
    const response = await axios.get(`${this.baseUrl}/albums/${albumId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return response.data;
  }
  
  async getAlbumTracks(accessToken, albumId, limit = 50) {
    const response = await axios.get(`${this.baseUrl}/albums/${albumId}/tracks`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { limit }
    });
    
    return response.data;
  }

  async getTrack(accessToken, trackId) {
    const response = await axios.get(`${this.baseUrl}/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return response.data;
  }
  
  async getAudioFeatures(accessToken, trackIds) {
    if (!trackIds.length) return [];
    
    const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    const response = await axios.get(`${this.baseUrl}/audio-features`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { ids }
    });
    
    return response.data;
  }
  
  async getRecommendations(accessToken, options) {
    const { seed_tracks, seed_artists, seed_genres, ...audioFeatures } = options;
    const params = {
      limit: 50,
      ...audioFeatures
    };
    
    if (seed_tracks) params.seed_tracks = seed_tracks;
    if (seed_artists) params.seed_artists = seed_artists;
    if (seed_genres) params.seed_genres = seed_genres;
    
    const response = await axios.get(`${this.baseUrl}/recommendations`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params
    });
    
    return response.data;
  }
  
  async createPlaylist(accessToken, { name, description, public: isPublic }) {
    const user = await this.getUserProfile(accessToken);
    
    const response = await axios.post(
      `${this.baseUrl}/users/${user.id}/playlists`,
      {
        name,
        description,
        public: isPublic
      },
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  }
  
  async addTracksToPlaylist(accessToken, playlistId, uris) {
    // Spotify API allows adding 100 tracks max per request
    const chunks = [];
    for (let i = 0; i < uris.length; i += 100) {
      chunks.push(uris.slice(i, i + 100));
    }
    
    const results = [];
    for (const chunk of chunks) {
      const response = await axios.post(
        `${this.baseUrl}/playlists/${playlistId}/tracks`,
        { uris: chunk },
        {
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      results.push(response.data);
    }
    
    return results;
  }
  
  async getRecentlyPlayed(accessToken, limit = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/me/player/recently-played`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { limit }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching recently played:', error);
      // Return empty data structure if the endpoint is not available
      return { items: [] };
    }
  }
}

module.exports = SpotifyService;