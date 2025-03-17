import React, { useState, useEffect, useRef } from 'react';
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
  const [disqusLoaded, setDisqusLoaded] = useState(false);
  const disqusRef = useRef(null);

  // Fetch post data and handle Disqus reset with loading state
  useEffect(() => {
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:8080'
      : 'https://blockspeak.onrender.com';

    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/blog-posts/${slug}`);
        setPost(response.data);

        // Function to reset Disqus comments with a placeholder
        const resetDisqus = () => {
          if (window.DISQUS && disqusRef.current) {
            console.log('Resetting Disqus for slug:', slug);
            try {
              window.DISQUS.reset({
                reload: true,
                config: () => ({
                  page: {
                    url: window.location.href,
                    identifier: slug,
                    title: response.data.title,
                  },
                }),
              });
            } catch (error) {
              console.error('Disqus reset failed:', error);
            }
          } else {
            console.log('Disqus not loaded yet, retrying...');
            setTimeout(resetDisqus, 500); // Retry after 500ms
          }
        };

        // Ensure Disqus script is loaded before resetting
        if (disqusLoaded) {
          resetDisqus();
        } else {
          console.log('Waiting for Disqus script to load...');
          const checkDisqusLoaded = () => {
            if (window.DISQUS) {
              setDisqusLoaded(true);
              resetDisqus();
            } else {
              setTimeout(checkDisqusLoaded, 500); // Retry every 500ms
            }
          };
          checkDisqusLoaded();
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
      }
    };

    fetchData();
    window.scrollTo(0, 0); // Reset scroll to top on mount
  }, [slug, disqusLoaded]);

  // Loading state with placeholder
  if (!post) {
    return (
      <div className="bg-dark text-white min-h-screen p-4 flex items-center justify-center">
        <div className="animate-pulse text-accent">Loading blog post...</div>
      </div>
    );
  }

  // Base URL for images
  const baseUrl = process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:8080'
    : 'https://blockspeak.onrender.com';
  const headerImageSrc = post.image && post.image !== 'blockspeakvert.svg'
    ? `${baseUrl}/images/${post.image}`
    : '/blockspeakvert.svg';
  const inlineImageSrc = post.inline_image && post.inline_image !== 'blockspeakvert.svg'
    ? `${baseUrl}/images/${post.inline_image}`
    : null;
  console.log('Raw post.inline_image:', post.inline_image);
  console.log('inlineImageSrc:', inlineImageSrc);

  // Parse content for inline images and sanitize HTML
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
          allowedTags: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'b'],
          allowedAttributes: {},
        }),
      };
    });
  } else {
    contentParts = [sanitizeHtml(post.content, {
      allowedTags: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'b'],
      allowedAttributes: {},
    })];
  }

  return (
    <div className="bg-dark text-white min-h-screen p-4">
      {/* SEO meta tags */}
      <Helmet>
        <title>{post.title} - BlockSpeak</title>
        <meta
          name="description"
          content={post.teaser || 'Explore this blog post on blockchain and crypto at BlockSpeak.'}
        />
        <meta name="keywords" content={post.tags ? post.tags.join(', ') : 'blockchain, crypto'} />
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

      {/* Blog post content with reserved space for images */}
      <div className="flex flex-col items-center">
        {post.image && (
          <img
            src={headerImageSrc}
            alt={post.title}
            className="w-full max-w-3xl md:w-1/2 h-auto mb-4 rounded-lg object-cover"
            loading="lazy"
            onError={(e) => setImageError(`Failed to load image: ${e.target.src}`)}
            style={{ minHeight: '200px' }}
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
                    style={{ minHeight: '150px' }} // Reserve space to prevent layout shift
                  />
                )}
                <div dangerouslySetInnerHTML={{ __html: part.text }} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Disqus comments with reserved space */}
      <div className="max-w-2xl mx-auto" ref={disqusRef}>
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
