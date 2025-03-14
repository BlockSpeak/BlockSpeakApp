// components/Home.jsx
// MetaMask login option landing page, a sneak peek of dashboard features, and a CTA to explore the dashboard.

import React from 'react';

function Home({ loginWithMetaMask, loginMessage }) {
  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
      {/* Main heading and branding */}
      <h1 className="text-8xl font-bold text-primary mb-6 tracking-wider">Block Speak</h1>
      <div className="text-sm text-gray-400 mb-4">
        Live Contracts: 123 <span className="pulse-dot" />
      </div>
      <p className="text-xl text-white mb-8 text-center max-w-2xl">
        Create Smart Contracts, Ask Crypto Questions, Own Your Blockchain
      </p>
      {/* Login button */}
      <button
        onClick={loginWithMetaMask} // Calls the login function from useAuth
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl flex items-center transition-transform duration-200 hover:scale-105"
      >
        <span>Login with MetaMask</span>
      </button>
      {/* Display login feedback if there’s a message */}
      {loginMessage && <p className="text-red-400 mt-4">{loginMessage}</p>}

      {/* Sneak Peek Section: Responsive grid of dashboard screenshots */}
      <section style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>
          See the Dashboard in Action
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <div>
            <img
              src="/creatingthedeao.png"
              alt="Creating a DAO"
              style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
            />
            <p style={{ marginTop: '10px' }}>Create Your DAO in Seconds</p>
          </div>
          <div>
            <img
              src="/fulldashboard.png"
              alt="Full Dashboard"
              style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
            />
            <p style={{ marginTop: '10px' }}>Manage Everything in One Place</p>
          </div>
          <div>
            <img
              src="/DAO-created.png"
              alt="DAO Created"
              style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
            />
            <p style={{ marginTop: '10px' }}>See Your DAO Come to Life</p>
          </div>
        </div>
        <button
          onClick={loginWithMetaMask}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#007BFF',
            color: 'white',
            borderRadius: '5px',
            marginTop: '30px',
            cursor: 'pointer',
            border: 'none',
            transition: 'background-color 0.3s ease',
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#0056b3'; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = '#007BFF'; }}
        >
          Explore the Dashboard
        </button>
      </section>
    </div>
  );
}

export default Home;
