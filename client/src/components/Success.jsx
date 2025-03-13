// Success component: Confirms subscription and redirects
// Displays a success message after a subscription payment and redirects to the dashboard.
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Base URL switches between local testing and production
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function Success({ account, setAccount, setSubscription }) {
  const navigate = useNavigate();

  // Confirm subscription on load
  // Verifies the subscription with the backend and updates the subscription state.
  useEffect(() => {
    const confirmSubscription = async () => {
      try {
        const plan = new URLSearchParams(window.location.search).get('plan');
        const response = await axios.get(
          `${BASE_URL}/api/subscription_success?plan=${plan}`,
          { withCredentials: true },
        );
        if (response.data.success) {
          setSubscription(plan);
          const storedAccount = localStorage.getItem('account');
          if (storedAccount && !account) setAccount(storedAccount);
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          console.error('Subscription confirmation failed:', response.data);
        }
      } catch (error) {
        console.error('Success error:', error);
      }
    };
    confirmSubscription();
  }, [navigate, account, setAccount, setSubscription]);

  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-primary">Subscription Successful!</h1>
      <p className="text-accent mt-4">Redirecting to your dashboard...</p>
    </div>
  );
}

export default Success;
