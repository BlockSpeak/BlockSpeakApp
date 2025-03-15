// client/src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';

// Set axios defaults once
axios.defaults.withCredentials = true;

// Render your root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider> {/* Wrap everything with HelmetProvider */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);

reportWebVitals();
