/**
 * Login Component
 * ----------------------------------------------------
 * This component handles user login with MetaMask.
 * It checks if MetaMask (window.ethereum) is available,
 * then either proceeds with the normal login flow or
 * directs users to the MetaMask deep link if they’re
 * on a browser/device without a built-in Ethereum provider.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isMobile } from 'react-device-detect';
import useAuth from '../hooks/useAuth';

function Login() {
  const { loginWithMetaMask, loginMessage, setLoginMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isMobile && window.ethereum) {
      // Ensure MetaMask is detected properly in mobile browser
      window.ethereum.autoRefreshOnNetworkChange = false;
    }
  }, []);

  const handleLogin = async () => {
    setLoginMessage('');
    setLoading(true);
    if (isMobile) {
      if (!window.ethereum) {
        window.location.href = 'https://metamask.app.link/dapp/blockspeak.co';
        return;
      }

      try {
        const success = await loginWithMetaMask();
        if (success) {
          const returnUrl = new URLSearchParams(location.search).get('return') || '/dashboard';
          navigate(returnUrl);
        }
      } catch (error) {
        console.error('MetaMask mobile login failed:', error);
        setLoginMessage('MetaMask login failed. Please try again.');
      }
    } else {
      // Desktop flow
      try {
        const success = await loginWithMetaMask();
        if (success) {
          const returnUrl = new URLSearchParams(location.search).get('return') || '/dashboard';
          navigate(returnUrl);
        }
      } catch (error) {
        console.error('MetaMask desktop login failed:', error);
        setLoginMessage('MetaMask login failed. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-primary mb-6">Login to BlockSpeak</h1>
      {loginMessage && <p className="text-red-400 mb-4">{loginMessage}</p>}
      <button
        onClick={handleLogin}
        className={`bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform duration-200 hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Login with MetaMask'}
      </button>
    </div>
  );
}

export default Login;
