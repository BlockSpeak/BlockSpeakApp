import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { DiscussionEmbed } from 'disqus-react';
import sanitizeHtml from 'sanitize-html';

// Empty line for ESLint spacing rule

function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [imageError, setImageError] = useState(null);

  // Fetch post data from backend on mount and when slug changes
  useEffect(() => {
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';
    axios.get(`${baseUrl}/api/blog-posts/${slug}`)
      .then((response) => setPost(response.data))
      .catch((error) => console.error('Error fetching blog post:', error));
  }, [slug]);

  // Show loading state while fetching
  if (!post) return <div className="bg-dark text-white min-h-screen p-4">Loading...</div>;

  // Use the same base URL for images as the API
  const baseUrl = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';
  const headerImageSrc = post.image && post.image !== 'blockspeakvert.svg'
    ? `${baseUrl}/images/${post.image}`
    : '/blockspeakvert.svg';
  // NEW: Construct URL for inline image if it exists
  const inlineImageSrc = post.inline_image && post.inline_image !== 'blockspeakvert.svg'
    ? `${baseUrl}/images/${post.inline_image}`
    : null;

  // NEW: Parse content for inline images and sanitize HTML, bolding H2s
  let contentParts = post.content.split('[InlineImage:');
  if (contentParts.length > 1) {
    contentParts = contentParts.map((part, index) => {
      if (index === 0) return part;
      const endIndex = part.indexOf(']');
      const imageName = part.substring(0, endIndex);
      const rest = part.substring(endIndex + 1);
      return {
        image: imageName,
        text: sanitizeHtml(rest, {
          allowedTags: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'b'], // Allow bold tags
          allowedAttributes: {},
        }),
      };
    });
  } else {
    contentParts = [sanitizeHtml(post.content, {
      allowedTags: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'b'], // Allow bold tags
      allowedAttributes: {},
    })];
  }

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
            author: { '@type': 'Organization', name: 'BlockSpeak' },
            datePublished: post.created_at || new Date().toISOString(),
            keywords: post.tags ? post.tags.join(', ') : 'blockchain, crypto',
            image: headerImageSrc,
          }, null, 2)}
        </script>
      </Helmet>
      <div className="flex flex-col items-center">
        {post.image && (
          <img
            src={headerImageSrc}
            alt={post.title}
            className="w-1/2 h-auto mb-4 rounded-lg"
            loading="lazy"
            onError={(e) => setImageError(`Failed to load image: ${e.target.src}`)}
          />
        )}
        {imageError && <p className="text-red-400">{imageError}</p>}
        <h1 className="text-4xl font-bold text-primary mb-6 text-center">{post.title}</h1>
      </div>
      <div className="text-accent max-w-2xl mx-auto mb-8 prose prose-invert">
        {contentParts.map((part, index) => (
          <div key={index}>
            {typeof part === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: part }} />
            ) : (
              <>
                {inlineImageSrc && (
                  <img
                    src={inlineImageSrc}
                    alt="Inline content"
                    className="w-full h-auto my-4 rounded-lg"
                    loading="lazy"
                    onError={(e) => setImageError(`Failed to load inline image: ${e.target.src}`)}
                  />
                )}
                <div dangerouslySetInnerHTML={{ __html: part.text }} />
              </>
            )}
          </div>
        ))}
      </div>
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
