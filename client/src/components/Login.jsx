import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isMobile } from 'react-device-detect'; // Added for mobile detection

function Login({ loginWithMetaMask, loginMessage, setLoginMessage }) {
  const navigate = useNavigate(); // For redirecting after login
  const location = useLocation(); // To get the 'return' URL parameter

  // Handle login: Redirects mobile users to MetaMask app, logs in desktop users
  const handleLogin = async () => {
    setLoginMessage(''); // Clear previous message
    if (isMobile) {
      // Redirect mobile users to MetaMask app with your sites URL
      window.location.href = 'https://metamask.app.link/dapp/blockspeak.co';
    } else {
      // Desktop users proceed with MetaMask login
      const success = await loginWithMetaMask();
      if (success) {
        const returnUrl = new URLSearchParams(location.search).get('return') || '/dashboard';
        navigate(returnUrl); // Redirect to return URL or dashboard
      }
    }
  };

  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-primary mb-6">Login to BlockSpeak</h1>
      {/* Show login feedback if there’s a message */}
      {loginMessage && <p className="text-red-400 mb-4">{loginMessage}</p>}
      <button
        onClick={handleLogin} // Trigger login on click
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform duration-200 hover:scale-105"
      >
        Login with MetaMask
      </button>
    </div>
  );
}

export default Login;
