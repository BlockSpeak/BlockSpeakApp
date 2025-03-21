// HowItWorks component: Comprehensive guide to using BlockSpeak
// Optimized for SEO with structured data, keywords, and user engagement features
import React from 'react';
import { Helmet } from 'react-helmet-async'; // For SEO tags
import { Link } from 'react-router-dom';

function HowItWorks() {
  const metaDescription = 'Discover how BlockSpeak simplifies smart contract creation and crypto questions. Follow this blockchain tutorial to get started today.';
  const metaKeywords = 'BlockSpeak guide, how to use BlockSpeak, smart contract creation guide, blockchain tutorial, crypto beginner tips, MetaMask login';

  // Define JSON-LD data as objects for cleaner formatting
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Use BlockSpeak',
    description: 'A detailed blockchain tutorial to use BlockSpeak for smart contracts and crypto queries.',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Login with MetaMask',
        text: 'Connect your MetaMask wallet to access BlockSpeak’s blockchain tools securely.',
      },
      {
        '@type': 'HowToStep',
        name: 'Create Smart Contracts',
        text: 'Use plain text commands to create and deploy smart contracts effortlessly.',
      },
      {
        '@type': 'HowToStep',
        name: 'Ask Crypto Questions',
        text: 'Leverage BlockSpeak’s AI to get instant answers to crypto and blockchain questions.',
      },
    ],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blockspeak.com/' },
      { '@type': 'ListItem', position: 2, name: 'How It Works', item: 'https://blockspeak.com/how-it-works' },
    ],
  };

  return (
    <>
      {/* SEO Tags: Enhanced with social sharing metadata */}
      <Helmet>
        <title>How BlockSpeak Works - Your Blockchain Tutorial Guide</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={metaKeywords} />
        {/* Structured Data: HowTo + BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify(howToSchema, null, 2)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema, null, 2)}
        </script>
        {/* Open Graph and Twitter Card Tags */}
        <meta property="og:title" content="How BlockSpeak Works - Blockchain Tutorial" />
        <meta property="og:description" content="Learn how to create smart contracts and ask crypto questions with BlockSpeak." />
        <meta property="og:image" content="/blockspeak-og-image.png" />
        <meta property="og:url" content="https://blockspeak.com/how-it-works" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="bg-dark text-white min-h-screen p-4">
        <h1 className="text-4xl font-bold text-primary mb-4 text-center">How BlockSpeak Works</h1>
        <div className="text-accent max-w-2xl mx-auto">
          {/* Step 1: Expanded with more detail */}
          <h2 className="text-2xl font-semibold mb-2">Step 1: Login with MetaMask</h2>
          <p>
            Begin your blockchain journey by connecting your MetaMask wallet to BlockSpeak
            This secure login process ensures you can interact with decentralized features safely.
            MetaMask acts as your gateway to the blockchain,
            making it a must-have tool for crypto beginners and experts alike.
          </p>

          {/* Step 2: More comprehensive */}
          <h2 className="text-2xl font-semibold mb-2 mt-4">Step 2: Create Smart Contracts</h2>
          <p>
            BlockSpeak revolutionizes smart contract creation by letting you use simple text commands
            no coding skills required. For example, type Create a token contract with 1000 supply,
            and our platform will generate and deploy it on the blockchain.
            This smart contract creation guide makes blockchain development accessible to everyone.
          </p>

          {/* Step 3: Added depth */}
          <h2 className="text-2xl font-semibold mb-2 mt-4">Step 3: Ask Crypto Questions</h2>
          <p>
            Curious about crypto prices, blockchain concepts, or DeFi trends? BlockSpeaks AI-powered assistant
            delivers instant, reliable answers. Whether you are a beginner asking
            What is a smart contract? or an expert
            exploring advanced topics, this feature is your go-to resource for crypto knowledge.
          </p>
        </div>

        {/* Image of BlockSpeak tutorial */}
        <img
          src="/fulldashboard.png"
          alt="Step-by-step blockchain tutorial for BlockSpeak smart contract creation"
          className="mt-8 mx-auto max-w-full"
        />

        {/* Internal Linking: Enhanced with styled buttons for better UX */}
        <div className="mt-8 max-w-2xl mx-auto flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0 items-center">
          <Link
            to="/dashboard"
            className="w-full lg:w-auto flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200 text-center"
          >
            Explore Your Dashboard
          </Link>
          <Link
            to="/faq"
            className="w-full lg:w-auto flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200 text-center"
          >
            Read Our FAQ
          </Link>
          <Link
            to="/blog"
            className="w-full lg:w-auto flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200 text-center"
          >
            Blockchain Blog
          </Link>
        </div>

        {/* FAQ Section */}
        <section className="mt-12">
          <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <div>
            <h3 className="text-xl font-semibold">What is BlockSpeak?</h3>
            <p>
              BlockSpeak is an innovative platform designed to simplify blockchain interactions.
              It is perfect for creating smart contracts and getting quick crypto insights,
              even if you are new to the space.
            </p>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold">How do I create a smart contract with BlockSpeak?</h3>
            <p>
              After logging in with MetaMask, enter your contract details in plain English like
              deploy an NFT contract and BlockSpeaks AI will build and deploy it for you. It is that simple!
            </p>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold">Is BlockSpeak good for crypto beginners?</h3>
            <p>
              Absolutely! Our step-by-step blockchain tutorial and AI assistant make it easy
              for beginners to explore crypto and smart contracts without technical expertise.
            </p>
          </div>
        </section>

        {/* Call-to-Action */}
        <section className="mt-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
          <p>Try BlockSpeak today and master smart contract creation with our blockchain tutorial.</p>
          {/* Replace the old <a href="/signup"> with a <Link> to an existing route */}
          <Link
            to="/login?return=/subscribe"
            className="inline-block bg-primary text-dark px-6 py-3 mt-4 rounded hover:bg-accent"
          >
            Get Started with BlockSpeak
          </Link>
        </section>

        {/* Comments Section */}
        <section className="mt-12">
          <h2 className="text-3xl font-bold mb-4">What Users Are Saying</h2>
          <p><strong>Jane D.:</strong> This blockchain tutorial made smart contracts so easy!</p>
          <p className="mt-2"><strong>Mike S.:</strong> Perfect for crypto beginners like me.</p>
        </section>
      </div>
    </>
  );
}

export default HowItWorks;
