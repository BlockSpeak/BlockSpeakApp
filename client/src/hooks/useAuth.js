// hooks/useAuth.js
// Purpose: Custom hook to manage authentication state and actions (login/logout) using MetaMask.
// Now uses a default export to satisfy ESLint's 'prefer-default-export' rule.

import { useState, useEffect } from 'react';
import axios from 'axios';

// Base URL switches between local development and production environments
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

export default function useAuth() {
  // State for the connected account, subscription status, and login feedback message
  const [account, setAccount] = useState(localStorage.getItem('account') || null);
  const [subscription, setSubscription] = useState('free');
  const [loginMessage, setLoginMessage] = useState('');

  // Login function: Connects MetaMask, signs a nonce, and authenticates with the backend
  const loginWithMetaMask = async () => {
    setLoginMessage(''); // Clear any previous message
    if (!window.ethereum) {
      setLoginMessage('Please install MetaMask!');
      return false; // Early return if MetaMask isn’t installed
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      const nonce = await fetch(`${BASE_URL}/nonce`, { credentials: 'include' }).then((res) => res.text());
      const message = `Log in to BlockSpeak: ${nonce}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });
      const response = await fetch(`${BASE_URL}/login/metamask`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      });
      if (response.ok) {
        setAccount(address);
        localStorage.setItem('account', address); // Persist account in localStorage
        const homeData = await axios.get(`${BASE_URL}/api/`, { withCredentials: true });
        setSubscription(homeData.data.subscription); // Update subscription status
        return true; // Login successful
      }
      throw new Error('Login failed');
    } catch (error) {
      if (error.code === 4001) {
        setLoginMessage('Login cancelled. Please try again.');
      } else {
        setLoginMessage('Login failed due to an unexpected error!');
        console.error('Login error:', error);
      }
      return false; // Login failed
    }
  };

  // Logout function: Clears session on backend and resets local state
  const logout = async () => {
    try {
      await axios.get(`${BASE_URL}/api/logout`, { withCredentials: true });
      setAccount(null);
      localStorage.removeItem('account');
      setSubscription('free');
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure state is cleared even if the backend request fails
      setAccount(null);
      localStorage.removeItem('account');
      setSubscription('free');
    }
  };

  // Effect to restore session on page load
  useEffect(() => {
    const restoreSession = async () => {
      const storedAccount = localStorage.getItem('account');
      if (!storedAccount) {
        // No account stored, assume user isn’t logged in
        setSubscription('free');
        setAccount(null);
        return; // Skip API call to avoid 401 error
      }

      try {
        const response = await axios.get(`${BASE_URL}/api/subscription_status`, { withCredentials: true });
        const { subscription: subStatus } = response.data;
        setSubscription(subStatus);
        if (subStatus !== 'free') {
          setAccount(storedAccount); // Restore account if subscription is active
        } else {
          setAccount(null);
          localStorage.removeItem('account'); // Clear if no active subscription
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        setSubscription('free');
        setAccount(null);
        localStorage.removeItem('account');
      }
    };
    restoreSession();
  }, []); // Empty dependency array: Runs once on mount

  // Return authentication state and functions for use in components
  // Added setSubscription to the return object to fix TypeError in Subscribe.jsx
  return {
    account,
    setAccount,
    subscription,
    setSubscription,
    loginMessage,
    setLoginMessage,
    loginWithMetaMask,
    logout,
  };
}
