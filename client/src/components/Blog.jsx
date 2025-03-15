import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth'; // Fixed import

function Blog() {
  const { account } = useAuth(); // Changed from 'user' to 'account'
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const posts = [
    { title: 'How to Create a Smart Contract', slug: 'smart-contract-guide', isFree: true, teaser: 'Learn the basics...' },
    { title: 'Crypto Wallet Security Tips', slug: 'wallet-security', isFree: true, teaser: 'Secure your funds...' },
    { title: 'Blockchain for Beginners', slug: 'blockchain-basics', isFree: true, teaser: 'Start here...' },
    { title: 'Understanding DAOs', slug: 'understanding-daos', isFree: false, teaser: 'What are DAOs?...' },
    { title: 'Latest DeFi Trends', slug: 'defi-trends', isFree: false, teaser: 'Explore DeFi...' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!account) setShowLoginPrompt(true); // Changed from 'user' to 'account'
    }, 60000); // 1 minute
    return () => clearTimeout(timer);
  }, [account]); // Changed from 'user' to 'account'

  const renderPostLink = (post) => {
    if (post.isFree) {
      return <Link to={`/blog/${post.slug}`} className="text-primary hover:underline">Read More</Link>;
    }
    if (account) { // Changed from 'user' to 'account'
      return <Link to={`/blog/${post.slug}`} className="text-primary hover:underline">Read Premium</Link>;
    }
    if (showLoginPrompt) {
      return (
        <p>
          Login with MetaMask to read more: <Link to="/login" className="text-primary">Login</Link>
        </p>
      );
    }
    return <p>Premium content unlocking soon...</p>;
  };

  return (
    <>
      <Helmet>
        <title>BlockSpeak - Blockchain Blog</title>
        <meta
          name="description"
          content="Explore blockchain, smart contracts, and crypto insights with BlockSpeak’s blog."
        />
      </Helmet>
      <div className="bg-dark text-white min-h-screen p-4">
        <h1 className="text-4xl font-bold text-primary mb-4 text-center">Blockchain Blog</h1>
        <div className="text-accent max-w-2xl mx-auto">
          {posts.map((post) => (
            <div key={post.slug} className="mb-6">
              <h2 className="text-2xl font-semibold">{post.title}</h2>
              <p>{post.teaser}</p>
              {renderPostLink(post)}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-gray-400">[Ad] Discover crypto tools with Coinzilla</p>
        </div>
      </div>
    </>
  );
}

export default Blog;
