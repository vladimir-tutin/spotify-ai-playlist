// client/src/contexts/PlaylistContext.js - Updated to handle playlist tracks
import React, { createContext, useState, useContext } from 'react';

const PlaylistContext = createContext();

export function usePlaylist() {
  return useContext(PlaylistContext);
}

export function PlaylistProvider({ children }) {
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [selectedAlbums, setSelectedAlbums] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [generatedPlaylist, setGeneratedPlaylist] = useState(null);
  const [songCount, setSongCount] = useState(25); // Default to 25 songs

  const addTrack = (track) => {
    setSelectedTracks(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };
  
  const removeTrack = (trackId) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId));
  };
  
  const addArtist = (artist) => {
    setSelectedArtists(prev => {
      if (prev.some(a => a.id === artist.id)) return prev;
      return [...prev, artist];
    });
  };
  
  const removeArtist = (artistId) => {
    setSelectedArtists(prev => prev.filter(a => a.id !== artistId));
  };
  
  const addAlbum = (album) => {
    setSelectedAlbums(prev => {
      if (prev.some(a => a.id === album.id)) return prev;
      return [...prev, album];
    });
  };
  
  const removeAlbum = (albumId) => {
    setSelectedAlbums(prev => prev.filter(a => a.id !== albumId));
  };
  
  const addPlaylist = (playlist) => {
    setSelectedPlaylists(prev => {
      if (prev.some(p => p.id === playlist.id)) return prev;
      return [...prev, playlist];
    });
  };
  
  const removePlaylist = (playlistId) => {
    setSelectedPlaylists(prev => prev.filter(p => p.id !== playlistId));
  };
  
  // Add tracks from a playlist
  const addTracksFromPlaylist = async (playlist, spotifyApi) => {
    try {
      // Fetch tracks from the playlist
      const response = await spotifyApi.get(`/spotify/playlist/${playlist.id}`);
      const tracks = response.data.items
        .map(item => item.track)
        .filter(track => track !== null);
      
      // Add each track to selection
      tracks.forEach(track => {
        addTrack(track);
      });
      
      // Add the playlist to selected playlists
      addPlaylist(playlist);
      
      // Optionally set the new playlist name based on the source playlist
      if (!playlistName) {
        setPlaylistName(`${playlist.name} (Enhanced)`);
      }
      
      // Add influence info to description
      if (!playlistDescription) {
        setPlaylistDescription(`Inspired by "${playlist.name}" playlist`);
      } else {
        setPlaylistDescription(prev => 
          prev + (prev ? '\n' : '') + `Inspired by "${playlist.name}" playlist`
        );
      }
      
      return tracks.length;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      throw error;
    }
  };
  
  const clearSelections = () => {
    setSelectedTracks([]);
    setSelectedArtists([]);
    setSelectedAlbums([]);
    setSelectedPlaylists([]);
    setPlaylistName('');
    setPlaylistDescription('');
    setSongCount(25); // Reset to default
  };
  
  const value = {
    selectedTracks,
    selectedArtists,
    selectedAlbums,
    selectedPlaylists,
    playlistName,
    playlistDescription,
    generatedPlaylist,
    songCount,
    setSelectedTracks,
    setSelectedArtists,
    setSelectedAlbums,
    setSelectedPlaylists,
    setPlaylistName,
    setPlaylistDescription,
    setSongCount,
    setGeneratedPlaylist,
    addTrack,
    removeTrack,
    addArtist,
    removeArtist,
    addAlbum,
    removeAlbum,
    addPlaylist,
    removePlaylist,
    addTracksFromPlaylist,
    clearSelections
  };
  
  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}