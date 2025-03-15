// client/src/components/Blog.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

function Blog() {
  return (
    <>
      <Helmet>
        <title>BlockSpeak - Blockchain Blog</title>
        <meta
          name="description"
          content="Read the latest articles and insights on blockchain, smart contracts, and crypto from BlockSpeak."
        />
      </Helmet>
      <div className="bg-dark text-white min-h-screen p-4">
        <h1 className="text-4xl font-bold text-primary mb-4 text-center">Blockchain Blog</h1>
        <div className="text-accent max-w-2xl mx-auto">
          <p>Stay tuned for our upcoming blog posts on blockchain and crypto topics.</p>
        </div>
      </div>
    </>
  );
}

export default Blog;
