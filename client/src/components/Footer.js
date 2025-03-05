import React from 'react';
import './Footer.css'; // Make sure to create a corresponding CSS file for styling

const Footer = ({ buttons }) => {
  return (
    <footer className="footer">
      <div className="footer-buttons">
        {buttons.map((button, index) => (
          <button key={index} className="footer-button" onClick={button.onClick}>
            {button.label}
          </button>
        ))}
      </div>
    </footer>
  );
};

export default Footer;