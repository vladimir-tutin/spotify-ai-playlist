// client/src/components/Header.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { IconSun, IconMoon } from '@tabler/icons-react';
import './Header.css';

function Header({ user, onLogout }) {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (logout) {
      logout();
    }
    navigate('/');
  };

  const goHome = () => {
    navigate('/dashboard');
  };

  const profileUser = user || currentUser;

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo" onClick={goHome}>
          <span className="logo-text">AI Playlist</span>
        </div>
        {profileUser && (
          <div className="user-profile">
            <div className="user-info">
              {profileUser.images && profileUser.images[0] ? (
                <img
                  className="profile-image"
                  src={profileUser.images[0].url}
                  alt={profileUser.display_name}
                />
              ) : (
                <div className="profile-placeholder">
                  {profileUser.display_name?.charAt(0)}
                </div>
              )}
              <span className="username">{profileUser.display_name}</span>
            </div>
            <button className="theme-toggle-button" onClick={toggleTheme} title="Toggle Night Mode">
              {theme === 'light' ? <IconMoon size={24} class="rotated-moon" /> : <IconSun size={24} />}
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;