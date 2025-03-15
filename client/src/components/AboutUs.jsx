// AboutUs.jsx
// Purpose: Show information about BlockSpeak's mission, approach, and values.
//          Showcase how simple it is to create a DAO, with a visual and brand logo.
// We use React Helmet to enhance SEO with relevant meta tags, titles, and structured data.

import React from 'react';
import { Helmet } from 'react-helmet-async'; // For SEO
import { Link } from 'react-router-dom'; // For in-app routing

function AboutUs() {
  return (
    <div className="bg-dark text-white min-h-screen p-4">
      {/* SEO and meta tags */}
      <Helmet>
        <title>BlockSpeak | About Us - No-Code Smart Contracts - Crypto Insights</title>
        <meta
          name="description"
          content="Discover BlockSpeak's mission to simplify blockchain for everyone. Learn how we enable no-code smart contract creation and crypto insights to empower individuals, businesses, and DAOs."
        />
        <meta
          name="keywords"
          content="BlockSpeak, About BlockSpeak, No-Code Smart Contracts, Crypto Insights, Blockchain, Web3, DAOs"
        />
        <link rel="canonical" href="https://blockspeak.co/about" />

        {/* Open Graph / Facebook */}
        <meta property="og:title" content="BlockSpeak | About Us" />
        <meta
          property="og:description"
          content="BlockSpeak offers no-code smart contract creation, DAOs, and powerful crypto insights to bring Web3 to everyone."
        />
        <meta property="og:image" content="https://blockspeak.co/blockspeakvert.svg" />
        <meta property="og:url" content="https://blockspeak.co/about" />
        <meta property="og:type" content="website" />

        {/* Twitter Card (summary_large_image) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BlockSpeak | About Us" />
        <meta
          name="twitter:description"
          content="BlockSpeak simplifies blockchain via no-code smart contracts and expert crypto insights."
        />
        <meta name="twitter:image" content="https://blockspeak.co/blockspeakvert.svg" />

        {/* JSON-LD Structured Data for Organization schema (helps SEO) */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'BlockSpeak',
            url: 'https://blockspeak.co/',
            logo: 'https://blockspeak.co/blockspeakvert.svg',
            description:
              'BlockSpeak simplifies blockchain with no-code smart contracts and insights, empowering individuals and businesses.',
            sameAs: [
              'https://x.com/BlockSpeakHQ',
            ],
          })}
        </script>
      </Helmet>

      {/* Actual page content */}
      <h1 className="text-4xl font-bold text-primary mb-4 text-center">About Us</h1>

      <p className="text-accent text-center max-w-2xl mx-auto mb-6">
        BlockSpeak empowers you to harness blockchain with no-code contracts and
        crypto insights. Whether you are an individual exploring Web3 for the first time,
        or a business aiming to launch decentralized solutions, we streamline the process
        so you can focus on what matters growing your ideas.
      </p>

      <p className="text-accent text-center max-w-2xl mx-auto mb-8">
        Our platform is built on the principle that blockchain should be accessible,
        secure, and easy to navigate. From launching smart contracts without a single
        line of code to analyzing real-time crypto market data, we strive to make
        advanced Web3 functionality simple enough for anyone.
      </p>

      {/* Brand logo + DAO creation image section */}
      <div className="flex flex-col items-center md:flex-row md:justify-center gap-6 md:gap-10 mt-4 mb-8">
        <img
          src="/blockspeakvert.svg"
          alt="BlockSpeak Logo"
          className="w-32 h-auto"
        />
        <img
          src="/DAO-created.png"
          alt="DAO Creation Example"
          className="w-64 md:w-80 h-auto rounded-lg shadow-lg"
        />
      </div>

      <p className="text-accent text-center max-w-2xl mx-auto mb-12">
        Creating a DAO is just a few clicks away with BlockSpeaks user-friendly interface.
        From simple governance tokens to advanced voting mechanisms, our no-code approach
        ensures anyone can spin up a DAO without deep technical knowledge.
      </p>

      {/* Call-to-action button: Link to home or login */}
      <div className="flex justify-center">
        <Link
          to="/"
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-200"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

export default AboutUs;
