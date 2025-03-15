import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import useAuth from '../hooks/useAuth';

// Empty line added for ESLint

function Blog() {
  const { account } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false); // Using ref instead of state for isLoading

  const fetchPosts = useCallback(() => {
    if (isLoadingRef.current || !hasMore) return; // Prevent redundant fetches
    isLoadingRef.current = true;
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';
    axios.get(`${baseUrl}/api/blog-posts?page=${page}`)
      .then((response) => {
        setPosts((prevPosts) => [...prevPosts, ...response.data.posts]);
        setHasMore(response.data.hasMore);
        if (response.data.hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      })
      .catch((error) => console.error('Error fetching blog posts:', error))
      .finally(() => {
        isLoadingRef.current = false;
      });
  }, [page, hasMore]); // Removed isLoading from dependencies

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!account) setShowLoginPrompt(true);
    }, 60000);
    return () => clearTimeout(timer);
  }, [account]);

  const renderPostLink = (post) => {
    if (post.isFree) {
      return <Link to={`/blog/${post.slug}`} className="text-primary hover:underline">Read More</Link>;
    }
    if (account) {
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
        <h1 className="text-4xl font-bold text-primary mb-8 text-center">Blockchain Blog</h1>
        <InfiniteScroll
          dataLength={posts.length}
          next={fetchPosts}
          hasMore={hasMore}
          loader={<h4 className="text-center text-accent">Loading...</h4>}
          endMessage={<p className="text-center text-accent">No more posts to load.</p>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {posts.map((post) => (
              <div key={post.slug} className="bg-gray-800 p-4 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-primary">{post.title}</h2>
                <p className="text-accent">{post.teaser}</p>
                {renderPostLink(post)}
              </div>
            ))}
          </div>
        </InfiniteScroll>
        <div className="mt-4 text-center">
          <p className="text-gray-400">[Ad] Discover crypto tools with Coinzilla</p>
        </div>
      </div>
    </>
  );
}

export default Blog;
