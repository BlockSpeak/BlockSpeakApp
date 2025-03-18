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

  // Redirect to dashboard if logged in and on home page
  useEffect(() => {
    if (account && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [account, navigate]);

  // Define navigation links to avoid duplication
  const navLinks = [
    { to: '/', label: 'Home' },
    account && { to: '/dashboard', label: 'Dashboard' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/prices', label: 'Prices' },
    { to: '/blog', label: 'Blog' },
    { to: '/about', label: 'About Us' },
    { to: '/how-it-works', label: 'How It Works' },
    account
      ? { to: '/subscribe', label: 'Subscribe', rel: 'nofollow' }
      : { to: '/login?return=/subscribe', label: 'Subscribe', rel: 'nofollow' },
  ].filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen bg-dark">
      {/* Default SEO tags */}
      <Helmet>
        <title>BlockSpeak - Blockchain Tools & Smart Contracts</title>
        <meta
          name="description"
          content="BlockSpeak: Create smart contracts, explore DAOs, and manage your blockchain journey with ease."
        />
      </Helmet>

      {/* Navigation Bar */}
      <nav className="bg-gray-800 p-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/">
            <img
              src="/blockspeakvert.svg"
              alt="Block Speak Logo"
              className="h-16 transition-transform duration-200 hover:scale-105"
            />
          </Link>

          {/* Desktop Links */}
          <div className="hidden sm:flex space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-primary hover:text-purple-400 text-lg py-2"
                rel={link.rel}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Hamburger Button (Mobile Only) */}
          <button
            className="sm:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu (Visible when hamburger is clicked) */}
        {isMenuOpen && (
          <div className="sm:hidden mt-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-primary hover:text-purple-400 text-lg py-2"
                rel={link.rel}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
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
          {/* Protected Dashboard Route */}
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute account={account}>
                <Dashboard account={account} logout={logout} subscription={subscription} />
              </ProtectedRoute>
            )}
          />
          {/* Protected Subscribe Route */}
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

      {/* Footer */}
      <footer className="bg-gray-800 p-4 w-full">
        <EmailSignup />
      </footer>
    </div>
  );
}

export default AppContent;
