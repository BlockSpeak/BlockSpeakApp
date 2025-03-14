// Subscribe.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

// Base URL for local testing or production
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function Subscribe({ account, subscription, setSubscription }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const [ethPaymentAddress, setEthPaymentAddress] = useState(null); // ETH payment address

  // Fetch ETH payment address on mount
  useEffect(() => {
    const fetchPaymentAddress = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/get_payment_address`, {
          withCredentials: true,
        });
        setEthPaymentAddress(response.data.eth_payment_address);
      } catch (error) {
        console.error('Failed to fetch payment address:', error);
        // Don’t alert here; we’ll handle UI feedback gracefully below
      }
    };
    fetchPaymentAddress();
  }, []);

  // Handle Stripe subscription
  const handleStripeSubscribe = async (plan) => {
    if (!account) {
      navigate('/login?return=/subscribe');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/api/subscribe`,
        new URLSearchParams({ plan }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          withCredentials: true,
        },
      );
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Stripe subscription error:', error);
      alert('Subscription failed - please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send ETH transaction via MetaMask
  const sendEthTransaction = async (plan) => {
    const ethAmount = plan === 'basic' ? '0.005' : '0.025';
    if (!ethPaymentAddress) throw new Error('Payment address not loaded.');
    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: account,
            to: ethPaymentAddress,
            value: (parseFloat(ethAmount) * 1e18).toString(16), // ETH to Wei, hex
          },
        ],
      });
      return txHash;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('Transaction rejected by user.');
      }
      throw new Error('Failed to send ETH transaction.');
    }
  };

  // Notify backend of ETH transaction
  const notifyBackend = async (plan, txHash) => {
    const response = await axios.post(
      `${BASE_URL}/api/subscribe_eth`,
      new URLSearchParams({ plan, tx_hash: txHash }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
      },
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Backend verification failed.');
    }
  };

  // Poll subscription status
  const pollSubscriptionStatus = async (plan) => {
    let attempts = 0;
    const maxAttempts = 24;

    const checkStatus = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/subscription_status`, {
          withCredentials: true,
        });
        console.log('Polling response:', response.data);
        console.log('Expected plan:', plan, 'Received subscription:', response.data.subscription);

        const currentSubscription = response.data.subscription;
        if (currentSubscription === plan) {
          setSubscription(currentSubscription); // Update state
          setIsLoading(false);
          navigate('/dashboard');
        } else if (attempts < maxAttempts) {
          attempts += 1;
          console.log(`Attempt ${attempts}: No match yet`);
          setTimeout(checkStatus, 5000);
        } else {
          setIsLoading(false);
          alert('Subscription timed out - check your status later.');
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts < maxAttempts) {
          attempts += 1;
          setTimeout(checkStatus, 5000);
        } else {
          setIsLoading(false);
          alert('Failed to verify subscription - try again later.');
        }
      }
    };
    checkStatus();
  };

  // Handle ETH subscription
  const handleEthSubscribe = async (plan) => {
    if (!account) {
      navigate('/login?return=/subscribe');
      return;
    }
    if (!window.ethereum) {
      alert('MetaMask is required for ETH payments!');
      return;
    }
    setIsLoading(true);
    try {
      const txHash = await sendEthTransaction(plan);
      await notifyBackend(plan, txHash);
      pollSubscriptionStatus(plan);
    } catch (error) {
      console.error('ETH subscription error:', error);
      alert(error.message || 'ETH payment failed - check console!');
      setIsLoading(false);
    }
  };

  // Render payment buttons or login prompt
  const renderPaymentOptions = (plan, currentPlan) => {
    if (subscription === currentPlan) {
      return (
        <p className="text-green-400 mt-2">
          You are already on this plan!{' '}
          {currentPlan === 'basic' && (
            <Link
              to="/subscribe"
              className="text-blue-400 hover:underline"
              onClick={() => handleStripeSubscribe('pro')}
            >
              Upgrade to Pro?
            </Link>
          )}
        </p>
      );
    }
    if (!account) {
      // Replaced text with a styled button for non-logged-in users
      return (
        <Link to="/login?return=/subscribe">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Log in to Subscribe
          </button>
        </Link>
      );
    }
    return (
      <div className="mt-2 flex space-x-2">
        <button
          onClick={() => handleStripeSubscribe(plan)}
          className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          disabled={isLoading}
        >
          Pay with Card
        </button>
        <button
          onClick={() => handleEthSubscribe(plan)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          disabled={isLoading || !ethPaymentAddress}
        >
          Pay with ETH
        </button>
      </div>
    );
  };

  return (
    <div className="bg-dark text-white min-h-screen p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-primary mb-6">Subscribe to BlockSpeak</h1>
      {isLoading && (
        <p className="text-yellow-400 mb-6 animate-pulse">Processing your subscription...</p>
      )}
      {!ethPaymentAddress && !isLoading && (
        <p className="text-red-400 mb-6">Loading payment options - please wait...</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-primary mb-2">Basic Plan</h2>
          <p className="text-accent mb-4">$10/month or 0.005 ETH</p>
          <p className="text-white mb-4">Unlimited contracts, basic analytics</p>
          {renderPaymentOptions('basic', 'basic')}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-primary mb-2">Pro Plan</h2>
          <p className="text-accent mb-4">$50/month or 0.025 ETH</p>
          <p className="text-white mb-4">
            Unlimited contracts, advanced analytics, priority support
          </p>
          {renderPaymentOptions('pro', 'pro')}
        </div>
      </div>
    </div>
  );
}

export default Subscribe;
