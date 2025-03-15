// App.jsx
// Purpose: This is the heart of BlockSpeak's frontend - a multi-page app built with React.
// It connects users to Web3 via MetaMask, creates smart contracts, shows wallet analytics, crypto news,
// price graphs, lets users ask LLM questions, handles subscriptions (Stripe + ETH!), and collects emails.
// Everything lives at https://blockspeak.co (or http://localhost:3000) - the control room of our crypto spaceship!

import React, { useEffect } from 'react'; // useEffect for GA tracking
import { useLocation } from 'react-router-dom'; // useLocation from React Router
import ReactGA from 'react-ga';
import AppContent from './components/AppContent';
import useAuth from './hooks/useAuth'; // Custom hook for authentication logic
import './index.css';
import Spinner from './components/Spinner';

// 1) Initialize GA with your measurement ID
ReactGA.initialize('G-HPXWLCNQ6K');

function App() {
  // 2) Use the useAuth hook to manage authentication state and functions
  //    This replaces local useState for account/subscription, etc.
  //    We pass setSubscription and setAccount to AppContent as needed.
  const {
    account,
    setAccount,
    subscription,
    setSubscription,
    loginMessage,
    setLoginMessage,
    loginWithMetaMask,
    logout,
    loading,
  } = useAuth();

  // 3) useLocation() to detect route changes for GA pageview tracking
  const location = useLocation();

  // 4) Fire pageview each time the location changes
  useEffect(() => {
    ReactGA.pageview(location.pathname + location.search);
  }, [location]);

  // 5) If user auth is still loading, show spinner
  if (loading) {
    return <Spinner />; // Displays during session restoration
  }

  // 6) Otherwise, render our main content, passing relevant props
  return (
    <AppContent
      account={account} // User's wallet address from useAuth
      setAccount={setAccount} // Setter for account
      subscription={subscription} // User's subscription plan
      setSubscription={setSubscription} // Setter for subscription
      loginMessage={loginMessage} // Feedback message for login attempts
      setLoginMessage={setLoginMessage} // Setter for loginMessage
      loginWithMetaMask={loginWithMetaMask} // Function to log in with MetaMask
      logout={logout} // Function to log out and clear session
    />
  );
}

export default App; // Ensure export is at the top level
