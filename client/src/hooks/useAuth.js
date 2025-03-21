// hooks/useAuth.js
// Purpose: Custom hook to manage authentication state and actions (login/logout) using MetaMask.
// Now uses a default export to satisfy ESLint's 'prefer-default-export' rule.

import { useState, useEffect } from 'react';
import axios from 'axios';

// Base URL switches between local development and production environments
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

export default function useAuth() {
  const [account, setAccount] = useState(localStorage.getItem('account') || null);
  const [subscription, setSubscription] = useState('free');
  const [loginMessage, setLoginMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false); // Added for mobile detection

  // Detect mobile devices on mount
  useEffect(() => {
    const { userAgent } = navigator;
    setIsMobile(/android|iphone|ipad|ipod/i.test(userAgent));
  }, []);

  const loginWithMetaMask = async () => {
    setLoginMessage('');
    console.log('Starting MetaMask login...');
    console.log('window.ethereum exists:', !!window.ethereum);
    console.log('User Agent:', navigator.userAgent);

    if (!window.ethereum) {
      setLoginMessage('MetaMask not detected. Please install or open the MetaMask app.');
      console.log('MetaMask not detected');
      if (isMobile) {
        window.location.href = 'https://metamask.app.link/dapp/blockspeak.co';
      }
      return false;
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
        localStorage.setItem('account', address);
        const homeData = await axios.get(`${BASE_URL}/api/`, { withCredentials: true });
        setSubscription(homeData.data.subscription);
        return true;
      }
      throw new Error('Login failed');
    } catch (error) {
      if (error.code === 4001) {
        setLoginMessage('Login cancelled. Please try again.');
      } else {
        setLoginMessage('Login failed due to an unexpected error!');
        console.error('Login error:', error);
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.get(`${BASE_URL}/api/logout`, { withCredentials: true });
      setAccount(null);
      localStorage.removeItem('account');
      setSubscription('free');
    } catch (error) {
      console.error('Logout error:', error);
      setAccount(null);
      localStorage.removeItem('account');
      setSubscription('free');
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      const storedAccount = localStorage.getItem('account');
      if (!storedAccount) {
        setSubscription('free');
        setAccount(null);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/api/subscription_status`, { withCredentials: true });
        const { subscription: subStatus } = response.data;
        setSubscription(subStatus);
        if (subStatus !== 'free') {
          setAccount(storedAccount);
        } else {
          setAccount(null);
          localStorage.removeItem('account');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        setSubscription('free');
        setAccount(null);
        localStorage.removeItem('account');
      }
    };
    restoreSession();
  }, []);

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
