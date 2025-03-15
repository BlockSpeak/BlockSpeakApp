// client/src/components/Faq.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

function Faq() {
  return (
    <>
      <Helmet>
        <title>BlockSpeak - Frequently Asked Questions</title>
        <meta
          name="description"
          content="Find answers to common questions about BlockSpeak, smart contracts, and blockchain technology."
        />
      </Helmet>
      <div className="bg-dark text-white min-h-screen p-4">
        <h1 className="text-4xl font-bold text-primary mb-4 text-center">Frequently Asked Questions</h1>
        <div className="text-accent max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-2">What is BlockSpeak?</h2>
          <p>BlockSpeak is a platform that allows users to create smart contracts, ask crypto questions, and more.</p>
          <h2 className="text-2xl font-semibold mb-2 mt-4">How do I get started?</h2>
          <p>Simply login with MetaMask and follow the on-screen instructions.</p>
          {/* Add more FAQs as needed */}
        </div>
      </div>
    </>
  );
}

export default Faq;
