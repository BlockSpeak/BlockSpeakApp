// AppContent.jsx
// Purpose: Centralizes routing and layout for BlockSpeak, rendering navigation and page content.
// Passes authentication state and functions to child components like Subscribe and Success.

import React, { useEffect } from 'react';
import { Link, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Home from './Home';
import Dashboard from './Dashboard';
import Subscribe from './Subscribe';
import Success from './Success';
import Marketplace from './Marketplace';
import AboutUs from './AboutUs';
import HowItWorks from './HowItWorks';
import EmailSignup from './EmailSignup';
import Login from './Login';

function AppContent({
  account,
  setAccount,
  subscription,
  setSubscription,
  loginMessage,
  setLoginMessage,
  loginWithMetaMask,
  logout,
}) {
  const navigate = useNavigate();

  // Redirect to dashboard if logged in and on home page
  useEffect(() => {
    if (account && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [account, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-dark">
      <nav className="bg-gray-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 text-center sm:text-left">
        <Link to="/">
          <img
            src="/blockspeakvert.svg"
            alt="Block Speak Vertical Logo"
            className="h-16 mx-auto sm:mx-0 transition-transform duration-200 hover:scale-105"
          />
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-center gap-4 sm:gap-0 sm:space-x-6 mt-4 sm:mt-0">
          <Link to="/" className="text-primary hover:text-purple-400 text-lg py-2">
            Home
          </Link>
          {account && (
            <Link to="/dashboard" className="text-primary hover:text-purple-400 text-lg py-2">
              Dashboard
            </Link>
          )}
          <Link to="/marketplace" className="text-primary hover:text-purple-400 text-lg py-2">
            Marketplace
          </Link>
          <Link to="/about" className="text-primary hover:text-purple-400 text-lg py-2">
            About Us
          </Link>
          <Link to="/how-it-works" className="text-primary hover:text-purple-400 text-lg py-2">
            How It Works
          </Link>
          {/* Conditionally render Sublink: if logged in, go to /subscribe; else, go to /login?return=/subscribe */}
          {account ? (
            <Link to="/subscribe" className="text-primary hover:text-purple-400 text-lg py-2">
              Subscribe
            </Link>
          ) : (
            <Link to="/login?return=/subscribe" className="text-primary hover:text-purple-400 text-lg py-2">
              Subscribe
            </Link>
          )}
        </div>
      </nav>
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home loginWithMetaMask={loginWithMetaMask} loginMessage={loginMessage} />} />
          <Route
            path="/login"
            element={(
              <Login
                loginWithMetaMask={loginWithMetaMask}
                loginMessage={loginMessage}
                setLoginMessage={setLoginMessage}
              />
            )}
          />
          {/* Pass setSubscription to Subscribe to allow state updates after payment */}
          {/* Protect /subscribe route: if not logged in, redirect to /login?return=/subscribe */}
          <Route
            path="/subscribe"
            element={
              account ? (
                <Subscribe account={account} subscription={subscription} setSubscription={setSubscription} />
              ) : (
                <Navigate to="/login?return=/subscribe" />
              )
            }
          />
          <Route path="/dashboard" element={<Dashboard account={account} logout={logout} subscription={subscription} />} />
          {/* FIX: Added setAccount and setSubscription to Success for state updates */}
          <Route
            path="/success"
            element={<Success account={account} setAccount={setAccount} setSubscription={setSubscription} />}
          />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Routes>
      </main>
      <footer className="bg-gray-800 p-4 w-full">
        <EmailSignup />
      </footer>
    </div>
  );
}

export default AppContent;
