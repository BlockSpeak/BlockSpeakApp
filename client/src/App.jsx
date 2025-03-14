// App.jsx
// Purpose: This is the heart of BlockSpeak's frontend - a multi-page app built with React.
// It connects users to Web3 via MetaMask, creates smart contracts, shows wallet analytics, crypto news,
// price graphs, lets users ask LLM questions, handles subscriptions (Stripe + ETH!), and collects emails.
// Everything lives at https://blockspeak.co (or http://localhost:3000) - the control room of our crypto spaceship!
import React, { useState, useEffect } from 'react'; // Added useEffect for session restoration
import { BrowserRouter as Router } from 'react-router-dom';
import axios from 'axios';
import AppContent from './components/AppContent';
import './index.css';

// Base URL switches between local testing and production
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function App() {
  const [account, setAccount] = useState(localStorage.getItem('account') || null); // User's wallet address
  const [subscription, setSubscription] = useState('free'); // User's subscription plan (free, basic, pro)

  // Restore session and subscription status on app load
  // Ensures that if a user is logged in on the backend (valid session cookie),
  // their subscription status (e.g., 'pro') is restored instead of defaulting to 'free'
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/subscription_status`, { withCredentials: true });
        const { subscription: subStatus } = response.data; // Rename to avoid conflict with state variable
        setSubscription(subStatus); // Set the subscription to what the backend reports
        // If subscription is not 'free', restore the account from localStorage
        if (subStatus !== 'free') {
          const storedAccount = localStorage.getItem('account');
          if (storedAccount) {
            setAccount(storedAccount); // Keep the account if it matches a valid subscription
          }
        } else {
          // If subscription is 'free', clear the account to maintain consistency
          setAccount(null);
          localStorage.removeItem('account');
        }
      } catch (error) {
        console.error('Failed to check session:', error);
        // If the request fails (e.g., 401 Unauthorized), assume session expired or user not logged in
        setSubscription('free');
        setAccount(null);
        localStorage.removeItem('account');
      }
    };
    checkSession();
  }, []); // Empty dependency array ensures this runs only once when the app mounts

  // Updates account state and localStorage
  // Saves or removes the account from localStorage and updates the backend user session
  // Optimized to avoid unnecessary backend calls post-logout for cleaner logs and better UX
  const updateAccount = async (newAccount) => {
    setAccount(newAccount);
    if (newAccount) {
      localStorage.setItem('account', newAccount);
      // Update backend with the new account
      try {
        await axios.post(
          `${BASE_URL}/api/update_account`,
          new URLSearchParams({ account: newAccount }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
        );
      } catch (error) {
        console.error('Failed to update account on backend:', error);
      }
    } else {
      localStorage.removeItem('account');
      // No need to clear account on backend since /api/logout already ends the session
      // Skipping this POST prevents a 401 error after logout, keeping logs clean
      // For scaling: If future features need backend sync on logout, add a dedicated /api/clear_account route
    }
  };

  return (
    <Router>
      <AppContent
        setAccount={updateAccount}
        setSubscription={setSubscription}
        account={account}
        subscription={subscription}
      />
    </Router>
  );
}

export default App; // Ensure export is at the top level
