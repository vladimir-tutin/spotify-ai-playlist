// client/src/pages/ErrorPage.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ErrorPage.css';

function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const errorMessage = new URLSearchParams(location.search).get('message') || 'Something went wrong';
  
  return (
    <div className="error-page">
      <div className="error-container">
        <h1>Oops!</h1>
        <p className="error-message">{errorMessage}</p>
        <button className="return-button" onClick={() => navigate('/')}>
          Return to Home
        </button>
      </div>
    </div>
  );
}

export default ErrorPage;