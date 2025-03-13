// AppContent: Defines the layout and navigation
// Handles routing, navigation, and user authentication (login/logout).
// Moved outside of App to avoid redefinition during renders
import React from 'react';
import { useNavigate, Link, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Home from './Home';
import Dashboard from './Dashboard';
import Subscribe from './Subscribe';
import Success from './Success';
import Marketplace from './Marketplace';
import AboutUs from './AboutUs';
import HowItWorks from './HowItWorks';
import EmailSignup from './EmailSignup';

// Base URL switches between local testing and production
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function AppContent({ setAccount, setSubscription, account, subscription }) {
  const navigate = useNavigate();

  // Login with MetaMask
  // Connects to MetaMask, signs a nonce, and authenticates with the backend.
  const loginWithMetaMask = async () => {
    if (!window.ethereum) return alert('Please install MetaMask!');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      const nonce = await fetch(`${BASE_URL}/nonce`, { credentials: 'include' }).then((res) => res.text());
      const message = `Log in to BlockSpeak: ${nonce}`;
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [message, address] });
      const response = await fetch(`${BASE_URL}/login/metamask`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      });
      if (response.ok) {
        setAccount(address);
        if (address) localStorage.setItem('account', address);
        const homeData = await axios.get(`${BASE_URL}/api/`, { withCredentials: true });
        setSubscription(homeData.data.subscription);
        navigate('/dashboard');
      } else throw new Error('Login failed');
    } catch (error) {
      alert('Login failed, check console!');
      console.error('Login error:', error);
    }
  };

  // Logout function
  // Logs the user out, clears the account and subscription state, and redirects to the home page.
  const logout = async () => {
    try {
      await axios.get(`${BASE_URL}/api/logout`, { withCredentials: true });
      setAccount(null);
      localStorage.removeItem('account');
      setSubscription('free');
      setTimeout(() => navigate('/'), 0);
    } catch (error) {
      console.error('Logout error:', error);
      setAccount(null);
      localStorage.removeItem('account');
      setSubscription('free');
      setTimeout(() => navigate('/'), 0);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-dark">
      <nav className="bg-gray-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 text-center sm:text-left">
        <Link to="/">
          <img src="/blockspeakvert.svg" alt="Block Speak Vertical Logo" className="h-16 mx-auto sm:mx-0 transition-transform duration-200 hover:scale-105" />
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-center gap-4 sm:gap-0 sm:space-x-6 mt-4 sm:mt-0">
          <Link to="/" className="text-primary hover:text-purple-400 text-lg py-2">Home</Link>
          {account && <Link to="/dashboard" className="text-primary hover:text-purple-400 text-lg py-2">Dashboard</Link>}
          <Link to="/marketplace" className="text-primary hover:text-purple-400 text-lg py-2">Marketplace</Link>
          <Link to="/about" className="text-primary hover:text-purple-400 text-lg py-2">About Us</Link>
          <Link to="/how-it-works" className="text-primary hover:text-purple-400 text-lg py-2">How It Works</Link>
          <Link to="/subscribe" className="text-primary hover:text-purple-400 text-lg py-2">Subscribe</Link>
        </div>
      </nav>
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home loginWithMetaMask={loginWithMetaMask} />} />
          <Route path="/dashboard" element={<Dashboard account={account} logout={logout} subscription={subscription} />} />
          <Route path="/subscribe" element={<Subscribe account={account} subscription={subscription} setSubscription={setSubscription} />} />
          <Route path="/success" element={<Success account={account} setAccount={setAccount} setSubscription={setSubscription} />} />
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
