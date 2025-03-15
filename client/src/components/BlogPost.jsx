import React from 'react';
import { useParams } from 'react-router-dom';

function BlogPost() {
  const { slug } = useParams();
  // Placeholder: Replace with CMS or backend fetch later
  const posts = [
    { title: 'How to Create a Smart Contract', slug: 'smart-contract-guide', content: 'Full content here...' },
    { title: 'Crypto Wallet Security Tips', slug: 'wallet-security', content: 'Full content here...' },
  ];
  const post = posts.find((p) => p.slug === slug) || { title: 'Not Found', content: 'Post not found.' };

  return (
    <div className="bg-dark text-white min-h-screen p-4">
      <h1 className="text-4xl font-bold text-primary mb-4">{post.title}</h1>
      <p className="text-accent max-w-2xl mx-auto">{post.content}</p>
    </div>
  );
}

export default BlogPost;
