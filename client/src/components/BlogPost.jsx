// BlogPost.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios'; // NEW: For fetching post data from backend
import { DiscussionEmbed } from 'disqus-react'; // NEW: For adding comments section

function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null); // NEW: State to hold fetched post data

  // NEW: Fetch post data from backend on mount and when slug changes
  useEffect(() => {
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';
    axios.get(`${baseUrl}/api/blog-posts/${slug}`)
      .then((response) => setPost(response.data))
      .catch((error) => console.error('Error fetching blog post:', error));
  }, [slug]);

  // NEW: Show loading state while fetching
  if (!post) return <div className="bg-dark text-white min-h-screen p-4">Loading...</div>;

  return (
    <div className="bg-dark text-white min-h-screen p-4">
      <Helmet>
        <title>{post.title} - BlockSpeak</title>
      </Helmet>
      <h1 className="text-4xl font-bold text-primary mb-4">{post.title}</h1>
      <p className="text-accent max-w-2xl mx-auto mb-8">{post.content}</p>
      {/* NEW: Disqus comments section */}
      <div className="max-w-2xl mx-auto">
        <DiscussionEmbed
          shortname="blockspeak" // Replace with your Disqus shortname from disqus.com
          config={{
            url: window.location.href, // Current page URL for unique thread
            identifier: post.slug, // Unique identifier for this post
            title: post.title, // Thread title in Disqus
          }}
        />
      </div>
    </div>
  );
}

export default BlogPost;
