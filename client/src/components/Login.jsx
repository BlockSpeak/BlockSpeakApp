import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Login Component
 * ----------------------------------------------------
 * This component handles user login with MetaMask.
 * It checks if MetaMask (window.ethereum) is available,
 * then either proceeds with the normal login flow or
 * directs users to the MetaMask deep link if they’re
 * on a browser/device without a built-in Ethereum provider.
 */
function Login({ loginWithMetaMask, loginMessage, setLoginMessage }) {
  // useNavigate: Allows us to programmatically route the user
  const navigate = useNavigate();

  // useLocation: Lets us read the `?return=` URL param so we know where to send them post-login
  const location = useLocation();

  // handleLogin: Triggered when user clicks the "Login with MetaMask" button
  const handleLogin = async () => {
    // Clear any existing status/error messages
    setLoginMessage('');

    // 1) Check if MetaMask (an Ethereum provider) is injected in the current browser context
    const hasMetaMask = typeof window.ethereum !== 'undefined';

    if (hasMetaMask) {
      // 2) If MetaMask is present (desktop or mobile in-app browser), proceed with normal login
      try {
        // loginWithMetaMask is defined in your custom hook (useAuth.js).
        // It handles the nonce retrieval, personal_sign, and backend session setup.
        const success = await loginWithMetaMask();
        if (success) {
          // After successful login, check if the URL has `?return=someRoute`.
          // If not, we default to "/dashboard".
          const returnUrl = new URLSearchParams(location.search).get('return') || '/dashboard';

          // Programmatically navigate to the intended route
          navigate(returnUrl);
        }
      } catch (error) {
        // Show a user-friendly message if something goes wrong
        setLoginMessage('Login failed due to an unexpected error in MetaMask flow!');
        console.error('Login error:', error);
      }
    } else {
      // 3) If no Ethereum provider is detected (e.g., user on mobile Safari or a non-crypto browser),
      //    redirect them to the MetaMask app link so they can install or open it.
      window.location.href = 'https://metamask.app.link/dapp/blockspeak.co';
    }
  };

  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-primary mb-6">Login to BlockSpeak</h1>

      {/* If there's a status message (e.g. an error), display it */}
      {loginMessage && <p className="text-red-400 mb-4">{loginMessage}</p>}

      <button
        onClick={handleLogin}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform duration-200 hover:scale-105"
      >
        Login with MetaMask
      </button>
    </div>
  );
}

export default Login;
