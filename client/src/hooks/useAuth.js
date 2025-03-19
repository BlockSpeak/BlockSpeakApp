import { useState, useEffect } from 'react';
import axios from 'axios';

// Dynamically switch between local and production environments
const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:8080'
  : 'https://blockspeak.onrender.com';

export default function useAuth() {
  const [account, setAccount] = useState(localStorage.getItem('account') || null);
  const [subscription, setSubscription] = useState('free');
  const [loginMessage, setLoginMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const { userAgent } = navigator;
    setIsMobile(/android|iphone|ipad|ipod/i.test(userAgent));
  }, []);

  // Restore user session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      const storedAccount = localStorage.getItem('account');
      if (!storedAccount) return;

      try {
        const { data } = await axios.get(`${BASE_URL}/api/subscription_status`, { withCredentials: true });
        setSubscription(data.subscription);
        if (data.subscription !== 'free') {
          setAccount(storedAccount);
        } else {
          localStorage.removeItem('account');
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        localStorage.removeItem('account');
      }
    };
    restoreSession();
  }, []);

  // Login with MetaMask
  const loginWithMetaMask = async () => {
    setLoginMessage('');

    if (!window.ethereum) {
      setLoginMessage('MetaMask not detected. Please install or open the MetaMask app.');
      if (isMobile) {
        window.location.href = 'https://metamask.app.link/dapp/blockspeak.co';
      }
      return false;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Secure Nonce Signing for Authentication
      const nonceRes = await fetch(`${BASE_URL}/nonce`, { credentials: 'include' });
      const nonce = await nonceRes.text();
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [`Log in to BlockSpeak: ${nonce}`, address],
      });

      // Verify Signature with Backend
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

      throw new Error('Login unsuccessful, server rejected authentication.');
    } catch (error) {
      if (error.code === 4001) {
        setLoginMessage('Login cancelled. Please retry.');
      } else {
        setLoginMessage('An unexpected error occurred during login.');
        console.error('Login error:', error);
      }
      return false;
    }
  };

  // Logout function to clear session and local storage
  const logout = async () => {
    try {
      await axios.get(`${BASE_URL}/api/logout`, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAccount(null);
      localStorage.removeItem('account');
      setSubscription('free');
    }
  };

  return {
    account,
    setAccount,
    subscription,
    setSubscription,
    loginMessage,
    setLoginMessage,
    loginWithMetaMask,
    logout,
    isMobile,
  };
}
