// components/Home.jsx
// landing page with a MetaMask login option, a sneak peek of dashboard features, and a CTA to explore the dashboard.

import React from 'react';

function Home({ loginWithMetaMask }) {
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
        onClick={loginWithMetaMask} // Calls the passed login function
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl flex items-center transition-transform duration-200 hover:scale-105"
      >
        <span>Login with MetaMask</span>
      </button>

      {/* Sneak Peek Section: Responsive grid of dashboard screenshots */}
      <section style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>
          See the Dashboard in Action
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', // Responsive: stacks on mobile, side-by-side on desktop
            gap: '20px', // Space between grid items
            maxWidth: '1200px', // Limits width on large screens
            margin: '0 auto', // Centers the grid
          }}
        >
          {/* Screenshot 1: Creating the DAO */}
          <div>
            <img
              src="/creatingthedeao.png" // Path relative to public folder
              alt="Creating a DAO"
              style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }} // Scales image nicely
            />
            <p style={{ marginTop: '10px' }}>Create Your DAO in Seconds</p>
          </div>
          {/* Screenshot 2: Full Dashboard */}
          <div>
            <img
              src="/fulldashboard.png"
              alt="Full Dashboard"
              style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
            />
            <p style={{ marginTop: '10px' }}>Manage Everything in One Place</p>
          </div>
          {/* Screenshot 3: DAO Created */}
          <div>
            <img
              src="/DAO-created.png"
              alt="DAO Created"
              style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
            />
            <p style={{ marginTop: '10px' }}>See Your DAO Come to Life</p>
          </div>
        </div>
        {/* CTA Button: Encourages users to explore the dashboard after seeing the sneak peek */}
        <button
          onClick={loginWithMetaMask} // Reuses the login function for consistency
          style={{
            padding: '15px 30px', // Makes the button big enough to tap easily
            fontSize: '18px', // Readable text size
            backgroundColor: '#007BFF', // Bright blue to stand out
            color: 'white', // White text for contrast
            borderRadius: '5px', // Rounded corners
            marginTop: '30px', // Space above the button to separate it from the grid
            cursor: 'pointer', // Hand icon on hover
            border: 'none', // No border for a clean look
            transition: 'background-color 0.3s ease', // Smooth color change on hover
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#0056b3'; }} // Darker blue when hovering
          onMouseLeave={(e) => { e.target.style.backgroundColor = '#007BFF'; }} // Back to original blue when not hovering
        >
          Explore the Dashboard
        </button>
      </section>
    </div>
  );
}

export default Home;
