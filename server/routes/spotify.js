// server/routes/spotify.js - Add logout route
const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotify');

// Authentication routes
router.get('/login', spotifyController.login);
router.get('/callback', spotifyController.callback);
router.get('/refresh-token', spotifyController.refreshToken);
router.get('/logout', spotifyController.logout); // Add the logout route

// Data routes
router.get('/user', spotifyController.getUserProfile);
router.get('/playlists', spotifyController.getUserPlaylists);
router.get('/playlist/:id', spotifyController.getPlaylistTracks);
router.get('/search', spotifyController.search);
router.get('/recommendations', spotifyController.getRecommendations);
router.get('/recent', spotifyController.getRecentlyPlayed);

// Playlist creation
router.post('/create-playlist', spotifyController.createPlaylist);
router.post('/add-tracks', spotifyController.addTracksToPlaylist);

module.exports = router;