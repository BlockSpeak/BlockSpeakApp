import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { DiscussionEmbed } from 'disqus-react';

// Empty line for ESLint spacing rule

function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);

  // Fetch post data from backend on mount and when slug changes
  useEffect(() => {
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';
    axios.get(`${baseUrl}/api/blog-posts/${slug}`)
      .then((response) => setPost(response.data))
      .catch((error) => console.error('Error fetching blog post:', error));
  }, [slug]);

  // Show loading state while fetching
  if (!post) return <div className="bg-dark text-white min-h-screen p-4">Loading...</div>;

  return (
    <div className="bg-dark text-white min-h-screen p-4">
      {/* SEO: Dynamic meta tags for the individual blog post */}
      <Helmet>
        <title>{post.title} - BlockSpeak</title>
        <meta
          name="description"
          content={post.teaser || 'Explore this blog post on blockchain and crypto at BlockSpeak.'}
        />
        <meta name="keywords" content={post.tags ? post.tags.join(', ') : 'blockchain, crypto'} />
        {/* Structured Data: Blog Post Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.teaser || 'A blog post on blockchain and crypto topics.',
            author: {
              '@type': 'Organization',
              name: 'BlockSpeak',
            },
            datePublished: post.created_at || new Date().toISOString(),
            keywords: post.tags ? post.tags.join(', ') : 'blockchain, crypto',
          })}
        </script>
      </Helmet>
      <h1 className="text-4xl font-bold text-primary mb-4">{post.title}</h1>
      <p className="text-accent max-w-2xl mx-auto mb-8">{post.content}</p>
      {/* Disqus comments section */}
      <div className="max-w-2xl mx-auto">
        <DiscussionEmbed
          shortname="blockspeak"
          config={{
            url: window.location.href,
            identifier: post.slug,
            title: post.title,
          }}
        />
      </div>
    </div>
  );
}

export default BlogPost;
