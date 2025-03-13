// Subscribe component: Handles subscription plans (Stripe and ETH)
// Allows users to subscribe to Basic or Pro plans using Stripe (card) or ETH payments.
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

// Base URL switches between local testing and production
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';
// Your ETH wallet for payments - replace with your real one for live!
const ETH_PAYMENT_ADDRESS = '0x37558169d86748dA34eACC76eEa6b5AF787FF74c';

function Subscribe({ account, subscription, setSubscription }) {
  const navigate = useNavigate();

  // Stripe payment handler
  // Initiates a Stripe checkout session for the selected plan and redirects to Stripe's payment page.
  const handleStripeSubscribe = async (plan) => {
    if (!account) return alert('Please log in!');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/subscribe`,
        new URLSearchParams({ plan }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert('Subscription failed - check console!');
      console.error('Stripe subscribe error:', error);
    }
  };

  // ETH payment handler - Basic: 0.005 ETH, Pro: 0.025 ETH (test values!)
  // Sends an ETH transaction to the payment address and verifies it with the backend.
  const handleEthSubscribe = async (plan) => {
    if (!account) return alert('Please log in!');
    if (!window.ethereum) return alert('MetaMask required for ETH payment!');
    const ethAmount = plan === 'basic' ? '0.005' : '0.025'; // Rough USD match - tweak for live!
    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: ETH_PAYMENT_ADDRESS,
          value: (parseFloat(ethAmount) * 1e18).toString(16), // ETH to Wei, hex for MetaMask
        }],
      });
      // Send txHash to backend to verify payment
      const response = await axios.post(
        `${BASE_URL}/api/subscribe_eth`,
        new URLSearchParams({ plan, tx_hash: txHash }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      if (response.data.success) {
        setSubscription(plan);
        navigate('/dashboard');
      } else {
        alert('ETH subscription failed - check console!');
        console.error('ETH subscribe failed:', response.data);
      }
    } catch (error) {
      alert('ETH payment failed - check console!');
      console.error('ETH subscribe error:', error);
    }
  };

  return (
    <div className="bg-dark text-white min-h-screen p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-primary mb-4">Subscribe to BlockSpeak</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-bold text-primary">Basic Plan - $10/month or 0.005 ETH</h2>
          <p className="text-accent">Unlimited contracts, basic analytics</p>
          {subscription === 'basic' ? (
            <p className="text-green-400 mt-2">
              You are already on this plan!{' '}
              <Link to="/subscribe" className="text-blue-400 hover:underline" onClick={() => handleStripeSubscribe('pro')}>
                Upgrade to Pro?
              </Link>
            </p>
          ) : (
            <div className="mt-2 flex space-x-2">
              <button onClick={() => handleStripeSubscribe('basic')} className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                Pay with Card
              </button>
              <button onClick={() => handleEthSubscribe('basic')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                Pay with ETH
              </button>
            </div>
          )}
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-bold text-primary">Pro Plan - $50/month or 0.025 ETH</h2>
          <p className="text-accent">Unlimited contracts, advanced analytics, priority support</p>
          {subscription === 'pro' ? (
            <p className="text-green-400 mt-2">You are already on this plan!</p>
          ) : (
            <div className="mt-2 flex space-x-2">
              <button onClick={() => handleStripeSubscribe('pro')} className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                Pay with Card
              </button>
              <button onClick={() => handleEthSubscribe('pro')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                Pay with ETH
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Subscribe;
