// components/Home.jsx
// MetaMask login option landing page, a sneak peek of dashboard features, and a CTA to explore the dashboard.

import React from 'react';
import { Helmet } from 'react-helmet-async'; // Import Helmet for dynamic SEO tags

function Home({ loginWithMetaMask, loginMessage }) {
  return (
    <main className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      {/* SEO Tags: Dynamic title, meta description, and keywords for better Google ranking */}
      <Helmet>
        <title>BlockSpeak - Create Smart Contracts & Explore Blockchain</title>
        <meta
          name="description"
          content="BlockSpeak: Create smart contracts, ask crypto questions, and own your blockchain. Join the future of decentralized technology today."
        />
        <meta name="keywords" content="smart contracts, blockchain, crypto, DAO, MetaMask, decentralized" />
      </Helmet>

      {/* Main heading and branding */}
      <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold text-primary mb-6 tracking-wider">
        Block Speak
      </h1>
      {/* Rest of content */}
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
      {/* Display login feedback */}
      {loginMessage && <p className="text-red-400 mt-4">{loginMessage}</p>}

      {/* Sneak Peek Content */}
      <section className="mt-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">
          See the Dashboard in Action
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div>
            <img
              src="/creatingthedeao.png"
              alt="BlockSpeak DAO creation process"
              className="w-full rounded-lg object-cover"
              loading="lazy"
            />
            <p className="mt-2 text-sm sm:text-base">Create Your DAO in Seconds</p>
          </div>
          <div>
            <img
              src="/fulldashboard.png"
              alt="BlockSpeak full dashboard view"
              className="w-full rounded-lg object-cover"
              loading="lazy"
            />
            <p className="mt-2 text-sm sm:text-base">Manage Everything in One Place</p>
          </div>
          <div>
            <img
              src="/DAO-created.png"
              alt="BlockSpeak DAO successfully created"
              className="w-full rounded-lg object-cover"
              loading="lazy"
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
    </main>
  );
}

export default Home;
