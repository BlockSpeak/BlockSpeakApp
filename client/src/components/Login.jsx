// components/Login.jsx
// Purpose: Provides a dedicated login page for BlockSpeak, authenticating users via MetaMask.
// MetaMask connection, nonce signing, authentication, and redirection based on the 'return' URL parameter.

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Navigation and query parameter tools
import axios from 'axios'; // For fetching subscription data post-login

// Base URL dynamically switches between local development and production environments
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function Login({ setAccount, setSubscription }) {
  const navigate = useNavigate(); // For programmatic navigation after login
  const location = useLocation(); // Accesses URL query params like '?return=...'

  // loginWithMetaMask: Handles MetaMask authentication process
  // Steps: Connects to MetaMask, fetches a nonce, signs it, authenticates, updates state, and redirects.
  const loginWithMetaMask = async () => {
    // Check if MetaMask is installed in the browser
    if (!window.ethereum) {
      alert('Please install MetaMask to proceed!');
      return; // Exit early if MetaMask is unavailable
    }

    try {
      // Request wallet connection and get the user's address
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0]; // First account is the active one

      // Fetch a unique nonce from the backend to prevent replay attacks
      const nonce = await fetch(`${BASE_URL}/nonce`, { credentials: 'include' })
        .then((res) => res.text());

      // Create a message for the user to sign, incorporating the nonce
      const message = `Log in to BlockSpeak: ${nonce}`;

      // Request MetaMask to sign the message with the user's private key
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // Send the address and signature to the backend for verification
      const response = await fetch(`${BASE_URL}/login/metamask`, {
        method: 'POST',
        credentials: 'include', // Include cookies for session management
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }), // Payload for authentication
      });

      // Check if login was successful
      if (response.ok) {
        setAccount(address); // Update the account state in the parent component
        localStorage.setItem('account', address); // Persist address for session continuity

        // Fetch user data (e.g., subscription status) from the backend
        const homeData = await axios.get(`${BASE_URL}/api/`, { withCredentials: true });
        setSubscription(homeData.data.subscription); // Update subscription state

        // Extract the 'return' URL parameter or default to '/dashboard'
        const returnUrl = new URLSearchParams(location.search).get('return') || '/dashboard';
        navigate(returnUrl); // Redirect the user to their intended destination
      } else {
        throw new Error('Authentication failed'); // Trigger error handling if response is not OK
      }
    } catch (error) {
      // Display a user-friendly error message and log details for debugging
      alert('Login failed! Please check the console for more information.');
      console.error('Login error:', error); // Detailed error logging
    }
  };

  // Render a simple, centered login UI
  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-primary mb-6">Login to BlockSpeak</h1>
      <button
        onClick={loginWithMetaMask} // Trigger MetaMask login on click
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform duration-200 hover:scale-105"
      >
        Login with MetaMask
      </button>
    </div>
  );
}

export default Login; // Export for use in routing
