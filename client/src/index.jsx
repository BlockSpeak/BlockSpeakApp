// client/src/index.jsx
// Entry point for the BlockSpeak React app
// Renders the App component into the DOM and sets up performance monitoring.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';

// 1) Create the root using React 18's createRoot
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    {/*
      2) Wrap <App /> with <BrowserRouter> so the entire React tree
         can use React Router hooks (useLocation, useParams, etc.).
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// 3) Optionally log performance metrics
//    reportWebVitals logs results (e.g., console.log) or sends to an analytics endpoint.
reportWebVitals(console.log);
