// AppContent.jsx
// Purpose: Centralizes routing and layout for BlockSpeak, rendering navigation and page content.
// Passes authentication state and functions to child components like Subscribe and Success.

import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
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
import Faq from './Faq';
import Blog from './Blog';
import BlogPost from './BlogPost';
import Prices from './Prices';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (account && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [account, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-dark">
      <Helmet>
        <title>BlockSpeak - Blockchain Tools & Smart Contracts</title>
        <meta
          name="description"
          content="BlockSpeak: Create smart contracts, explore DAOs, and manage your blockchain journey with ease."
        />
      </Helmet>

      <nav className="bg-gray-800 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 text-center lg:text-left">
        <div className="flex justify-between items-center w-full lg:w-auto">
          <Link to="/">
            <img
              src="/blockspeakvert.svg"
              alt="Block Speak Vertical Logo"
              className="h-16 mx-auto lg:mx-0 transition-transform duration-200 hover:scale-105"
            />
          </Link>

          {/* Hamburger Button (Mobile Only) */}
          <button
            type="button"
            className="lg:hidden text-white" // Changed sm:hidden to lg:hidden
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:flex-row lg:justify-center gap-4 lg:gap-0 lg:space-x-6 mt-4 lg:mt-0"> {/* Changed sm:flex to lg:flex */}
          <Link to="/" className="text-primary hover:text-purple-400 text-lg py-2">Home</Link>
          {account && (
            <Link to="/dashboard" className="text-primary hover:text-purple-400 text-lg py-2">
              Dashboard
            </Link>
          )}
          <Link to="/marketplace" className="text-primary hover:text-purple-400 text-lg py-2">Marketplace</Link>
          <Link to="/prices" className="text-primary hover:text-purple-400 text-lg py-2">Prices</Link>
          <Link to="/blog" className="text-primary hover:text-purple-400 text-lg py-2">Blog</Link>
          <Link to="/about" className="text-primary hover:text-purple-400 text-lg py-2">About Us</Link>
          <Link to="/how-it-works" className="text-primary hover:text-purple-400 text-lg py-2">How It Works</Link>
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

        {/* Mobile Menu (Visible when hamburger is clicked) */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 space-y-2"> {/* Changed sm:hidden to lg:hidden */}
            <Link
              to="/"
              className="block text-primary hover:text-purple-400 text-lg py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            {account && (
              <Link
                to="/dashboard"
                className="block text-primary hover:text-purple-400 text-lg py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
            <Link
              to="/marketplace"
              className="block text-primary hover:text-purple-400 text-lg py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link
              to="/prices"
              className="block text-primary hover:text-purple-400 text-lg py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Prices
            </Link>
            <Link
              to="/blog"
              className="block text-primary hover:text-purple-400 text-lg py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              to="/about"
              className="block text-primary hover:text-purple-400 text-lg py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              About Us
            </Link>
            <Link
              to="/how-it-works"
              className="block text-primary hover:text-purple-400 text-lg py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            {account ? (
              <Link
                to="/subscribe"
                className="block text-primary hover:text-purple-400 text-lg py-2"
                rel="nofollow"
                onClick={() => setIsMenuOpen(false)}
              >
                Subscribe
              </Link>
            ) : (
              <Link
                to="/login?return=/subscribe"
                className="block text-primary hover:text-purple-400 text-lg py-2"
                rel="nofollow"
                onClick={() => setIsMenuOpen(false)}
              >
                Subscribe
              </Link>
            )}
          </div>
        )}
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
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute account={account}>
                <Dashboard account={account} logout={logout} subscription={subscription} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/subscribe"
            element={(
              <ProtectedRoute account={account}>
                <Subscribe account={account} subscription={subscription} setSubscription={setSubscription} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/success"
            element={<Success account={account} setAccount={setAccount} setSubscription={setSubscription} />}
          />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/prices" element={<Prices />} />
        </Routes>
      </main>

      <footer className="bg-gray-800 p-4 w-full">
        <EmailSignup />
      </footer>
    </div>
  );
}

export default AppContent;
