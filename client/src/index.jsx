// client/src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios'; // 1) Import axios
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';

// 2) Set axios defaults once
axios.defaults.withCredentials = true;

// 3) Render your root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

reportWebVitals();
