import React, { useState, useEffect } from 'react'; // Added useEffect for fetching address
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

// Base URL for local testing or production
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function Subscribe({ account, subscription, setSubscription }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false); // Track loading state for UI feedback
  const [ethPaymentAddress, setEthPaymentAddress] = useState(null); // State to hold the dynamic ETH payment address

  // Fetch the ETH payment address from the backend when the component mounts
  useEffect(() => {
    const fetchPaymentAddress = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/get_payment_address`, { withCredentials: true });
        setEthPaymentAddress(response.data.eth_payment_address);
      } catch (error) {
        console.error('Failed to fetch payment address:', error);
        alert('Failed to load payment address. Please try again later.');
      }
    };
    fetchPaymentAddress();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Handle Stripe subscription (Your original implementation)
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

  // --- New Helper Functions for ETH Subscription ---

  // Send ETH transaction via MetaMask
  const sendEthTransaction = async (plan) => {
    const ethAmount = plan === 'basic' ? '0.005' : '0.025'; // Test amounts in ETH
    if (!ethPaymentAddress) throw new Error('Payment address not loaded yet.'); // Ensure address is loaded
    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: ethPaymentAddress, // Use the dynamically fetched address instead of hardcoded ETH_PAYMENT_ADDRESS
          value: (parseFloat(ethAmount) * 1e18).toString(16), // Convert ETH to Wei, hex
        }],
      });
      return txHash;
    } catch (error) {
      // Enhanced error handling for MetaMask-specific errors
      if (error.code === 4001) {
        throw new Error('Transaction rejected by user.');
      } else {
        throw new Error('Failed to send ETH transaction.');
      }
    }
  };

  // Notify backend of the ETH transaction
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
      throw new Error(response.data.error || 'Unknown error from backend.');
    }
  };

  // Poll subscription status with recursive setTimeout (Improved polling mechanism)
  const pollSubscriptionStatus = (plan) => {
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes total (5 seconds * 24 = 120 seconds)

    const checkStatus = async () => {
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/subscription_status`, {
          withCredentials: true,
        });
        if (statusResponse.data.subscription === plan) {
          // Subscription confirmed, update state and navigate
          setSubscription(plan);
          setIsLoading(false);
          navigate('/dashboard');
        } else if (attempts < maxAttempts) {
          // Continue polling if max attempts not reached
          attempts += 1;
          setTimeout(checkStatus, 5000); // Poll every 5 seconds
        } else {
          // Timeout reached
          setIsLoading(false);
          alert('Subscription update timed out - please check later or contact support');
        }
      } catch (pollError) {
        console.error('Polling error:', pollError);
        if (attempts < maxAttempts) {
          attempts += 1;
          setTimeout(checkStatus, 5000); // Retry on error
        } else {
          setIsLoading(false);
          alert('Failed to verify subscription - check console!');
        }
      }
    };

    // Start polling
    checkStatus();
  };

  // Handle ETH subscription (Refactored with helper functions)
  const handleEthSubscribe = async (plan) => {
    if (!account) return alert('Please log in!');
    if (!window.ethereum) return alert('MetaMask required for ETH payment!');

    setIsLoading(true); // Show loading state
    try {
      // Step 1: Send ETH transaction
      const txHash = await sendEthTransaction(plan);

      // Step 2: Notify backend
      await notifyBackend(plan, txHash);

      // Step 3: Poll subscription status (replaces original setInterval)
      pollSubscriptionStatus(plan);
    } catch (error) {
      console.error('ETH subscription error:', error);
      setIsLoading(false);
      alert(error.message || 'ETH payment failed - check console!');
    }
  };

  // JSX rendering (UI)
  return (
    <div className="bg-dark text-white min-h-screen p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-primary mb-4">Subscribe to BlockSpeak</h1>
      {isLoading && <p className="text-yellow-400 mb-4">Processing your subscription...</p>} {/* Loading feedback */}
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
              <button
                onClick={() => handleStripeSubscribe('basic')}
                className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                disabled={isLoading} // Disable while processing
              >
                Pay with Card
              </button>
              <button
                onClick={() => handleEthSubscribe('basic')}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                disabled={isLoading || !ethPaymentAddress} // Disable while processing or if address not loaded
              >
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
              <button
                onClick={() => handleStripeSubscribe('pro')}
                className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                disabled={isLoading} // Disable while processing
              >
                Pay with Card
              </button>
              <button
                onClick={() => handleEthSubscribe('pro')}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                disabled={isLoading || !ethPaymentAddress} // Disable while processing or if address not loaded
              >
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
