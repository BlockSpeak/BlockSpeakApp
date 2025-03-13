// HowItWorks component: Simple guide to using BlockSpeak
// Provides a brief guide on how to use BlockSpeak's features.
import React from 'react';

function HowItWorks() {
  return (
    <div className="bg-dark text-white min-h-screen p-4">
      <h1 className="text-4xl font-bold text-primary mb-4 text-center">How It Works</h1>
      <div className="text-accent max-w-2xl mx-auto">
        <p>1. Login with MetaMask to connect your wallet.</p>
        <p>2. Create smart contracts with simple text commands.</p>
        <p>3. Ask crypto questions and get instant answers.</p>
      </div>
    </div>
  );
}

export default HowItWorks;
