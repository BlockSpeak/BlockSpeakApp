// App.jsx
// Purpose: This is the heart of BlockSpeak's frontend - a multi-page app built with React.
// It connects users to Web3 via MetaMask, creates smart contracts, shows wallet analytics, crypto news,
// price graphs, lets users ask LLM questions, handles subscriptions (Stripe + ETH!), and collects emails.
// Everything lives at https://blockspeak.co (or http://localhost:3000) - the control room of our crypto spaceship!

import React from 'react'; // Removed useState, useEffect, axios as useAuth.js handles state and session restoration
import { BrowserRouter as Router } from 'react-router-dom';
import AppContent from './components/AppContent';
import useAuth from './hooks/useAuth'; // Custom hook for authentication logic
import './index.css';

// Base URL is now defined in useAuth.js to keep it centralized
// BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function App() {
  // Use the useAuth hook to manage authentication state and functions
  // This replaces local useState for account/subscription, useEffect for session checks, and updateAccount
  // Added setSubscription and setAccount from useAuth to pass to AppContent
  const {
    account, setAccount, subscription, setSubscription, loginMessage, setLoginMessage, loginWithMetaMask, logout,
  } = useAuth();

  return (
    <Router>
      <AppContent
        account={account} // User's wallet address from useAuth
        setAccount={setAccount} // Setter for account, added for completeness
        subscription={subscription} // User's subscription plan from useAuth
        setSubscription={setSubscription} // Setter for subscription, added to allow updates from Subscribe.jsx
        loginMessage={loginMessage} // Feedback message for login attempts
        setLoginMessage={setLoginMessage} // Setter for loginMessage
        loginWithMetaMask={loginWithMetaMask} // Function to log in with MetaMask
        logout={logout} // Function to log out and clear session
      />
    </Router>
  );
}

export default App; // Ensure export is at the top level
