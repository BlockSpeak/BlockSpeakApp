// components/Home.jsx
// MetaMask login option landing page, a sneak peek of dashboard features, and a CTA to explore the dashboard.

import React from 'react';

function Home({ loginWithMetaMask, loginMessage }) {
  return (
    <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Main heading and branding */}
      <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold text-primary mb-6 tracking-wider">
        Block Speak
      </h1>
      <div className="text-sm text-gray-400 mb-4">
        Live Contracts: 123 <span className="pulse-dot" />
      </div>
      <p className="text-lg sm:text-xl text-white mb-8 text-center max-w-2xl">
        Create Smart Contracts, Ask Crypto Questions, Own Your Blockchain
      </p>
      {/* Login button */}
      <button
        onClick={loginWithMetaMask}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl w-full sm:w-auto transition-transform duration-200 hover:scale-105"
      >
        Login with MetaMask
      </button>
      {/* Display login feedback if there’s a message */}
      {loginMessage && <p className="text-red-400 mt-4">{loginMessage}</p>}

      {/* Sneak Peek Section: Responsive grid of dashboard screenshots */}
      <section className="mt-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">
          See the Dashboard in Action
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div>
            <img
              src="/creatingthedeao.png"
              alt="Creating a DAO"
              className="w-full rounded-lg object-cover"
            />
            <p className="mt-2 text-sm sm:text-base">Create Your DAO in Seconds</p>
          </div>
          <div>
            <img
              src="/fulldashboard.png"
              alt="Full Dashboard"
              className="w-full rounded-lg object-cover"
            />
            <p className="mt-2 text-sm sm:text-base">Manage Everything in One Place</p>
          </div>
          <div>
            <img
              src="/DAO-created.png"
              alt="DAO Created"
              className="w-full rounded-lg object-cover"
            />
            <p className="mt-2 text-sm sm:text-base">See Your DAO Come to Life</p>
          </div>
        </div>
        <button
          onClick={loginWithMetaMask}
          className="mt-8 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-200"
        >
          Explore the Dashboard
        </button>
      </section>
    </div>
  );
}

export default Home;
