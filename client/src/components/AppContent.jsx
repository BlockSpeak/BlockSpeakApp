// AppContent.jsx
// Purpose: Centralizes routing and layout for BlockSpeak, rendering navigation and page content.
// Passes authentication state and functions to child components like Subscribe and Success.

import React, { useEffect } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // Helmet for default SEO tags
import Home from './Home';
import Dashboard from './Dashboard';
import Subscribe from './Subscribe';
import Success from './Success';
import Marketplace from './Marketplace';
import AboutUs from './AboutUs';
import HowItWorks from './HowItWorks';
import EmailSignup from './EmailSignup';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import Faq from './Faq'; // Import Faq
import Blog from './Blog'; // Import Blog
import BlogPost from './BlogPost';

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
      {/* Set default SEO tags for the entire app */}
      <Helmet>
        <title>BlockSpeak - Blockchain Tools & Smart Contracts</title>
        <meta
          name="description"
          content="BlockSpeak: Create smart contracts, explore DAOs, and manage your blockchain journey with ease."
        />
      </Helmet>
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
          <Link to="/blog" className="text-primary hover:text-purple-400 text-lg py-2">Blog</Link>
          <Link to="/about" className="text-primary hover:text-purple-400 text-lg py-2">
            About Us
          </Link>
          <Link to="/how-it-works" className="text-primary hover:text-purple-400 text-lg py-2">
            How It Works
          </Link>
          {/* Subscribe link: if logged in, go to /subscribe; else, go to /login?return=/subscribe */}
          {account ? (
            <Link to="/subscribe" className="text-primary hover:text-purple-400 text-lg py-2" rel="nofollow">
              Subscribe
            </Link>
          ) : (
            <Link to="/login?return=/subscribe" className="text-primary hover:text-purple-400 text-lg py-2" rel="nofollow">
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
          {/* Protect /dashboard route: requires authentication, redirects to /login if not logged in */}
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute account={account}>
                <Dashboard account={account} logout={logout} subscription={subscription} />
              </ProtectedRoute>
            )}
          />
          {/* Protect /subscribe route: requires authentication, redirects to /login if not logged in */}
          {/* Pass setSubscription to Subscribe to allow state updates after payment */}
          <Route
            path="/subscribe"
            element={(
              <ProtectedRoute account={account}>
                <Subscribe account={account} subscription={subscription} setSubscription={setSubscription} />
              </ProtectedRoute>
            )}
          />
          {/* FIX: Added setAccount and setSubscription to Success for state updates */}
          <Route
            path="/success"
            element={<Success account={account} setAccount={setAccount} setSubscription={setSubscription} />}
          />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/faq" element={<Faq />} /> {/* New FAQ route */}
          <Route path="/blog" element={<Blog />} /> {/* New Blog route */}
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </main>
      <footer className="bg-gray-800 p-4 w-full">
        <EmailSignup />
      </footer>
    </div>
  );
}

export default AppContent;
