import React from 'react';

// Home component: Landing page with MetaMask login
function Home({ loginWithMetaMask }) {
  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-8xl font-bold text-primary mb-6 tracking-wider">
        Block Speak
      </h1>
      <div className="text-sm text-gray-400 mb-4">
        Live Contracts: 123 <span className="pulse-dot" />
      </div>
      <p className="text-xl text-white mb-8 text-center max-w-2xl">
        Create Smart Contracts, Ask Crypto Questions, Own Your Blockchain
      </p>
      <button
        onClick={loginWithMetaMask}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl flex items-center transition-transform duration-200 hover:scale-105"
      >
        <span>Login with MetaMask</span>
      </button>
    </div>
  );
}

export default Home;
