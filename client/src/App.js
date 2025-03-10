// App.js
// Purpose: This is the heart of BlockSpeak's frontend - a single-page app (SPA) built with React.
// It connects users to Web3 via MetaMask, creates smart contracts, shows wallet analytics, crypto news,
// price graphs, lets users ask LLM questions, handles subscriptions, and collects emails for our list.
// Everything lives at https://blockspeak.co (or http://localhost:3000 locally). This file is the core
// of our UI, tying all features together for a seamless experience - think of it as the control room
// of the BlockSpeak spaceship where every button and screen lives!

// Dependencies:
// - react-router-dom: For navigation between pages like Home, Subscribe, Marketplace, etc.
// - chart.js & react-chartjs-2: For rendering pretty price graphs (like Bitcoin over 7 days).
// - axios: For clean HTTP requests to our Flask backend (fetching news, sending contracts, etc.).
// Run `npm install react-router-dom chart.js react-chartjs-2 axios` in `client/` to install these tools.
// If these aren't installed, you'll see "Module not found" errors - do this in C:\Users\brody\BlockchainQueryTool\BlockSpeak\client\!

import React, { useState, useEffect } from "react"; // Core React hooks for state and lifecycle management.
// useState holds data like account or contract requests; useEffect runs code when things change - these are React's magic wands for memory and updates.

import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from "react-router-dom"; // Routing tools for page switching.
// Router is the map, Routes are the paths, Link is the signpost, useNavigate is the GPS - lets us switch between pages like Home and Subscribe without reloading.

import axios from "axios"; // Makes HTTP requests to our backend simple and clean.
// Axios is how we talk to Flask - fetching news, sending contract requests, etc. It’s the comms system pinging BlockSpeak.py at http://127.0.0.1:8080 or https://blockspeak.onrender.com.

import { Line } from "react-chartjs-2"; // Component to draw line graphs.
// This draws the Bitcoin price graph - a cool visual for users, fed with data to show trends.

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js"; // Chart.js building blocks.
// These are the pieces for our graphs - scales, lines, labels - registered to make the Line component work right.

import "./index.css"; // Pulls in Tailwind CSS for styling (colors like primary: #8B5CF6).
// Tailwind makes it pretty - bg-dark, text-primary, etc. Edit index.css for custom colors or styles!

// Register Chart.js components so our graphs function properly.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
// This is like turning on the graph machine - without it, Line won't draw. If skipped, you’ll get a blank graph - it’s the setup glue.

// BASE_URL decides where the frontend talks to the backend:
// - Local testing: http://127.0.0.1:8080 (Flask running locally).
// - Production: https://blockspeak.onrender.com (Flask on Render).
// Switches automatically using window.location.hostname to detect localhost vs. blockspeak.co - super smart, no manual URL changes needed!
const BASE_URL = window.location.hostname === "localhost" ? "http://127.0.0.1:8080" : "https://blockspeak.onrender.com";

// Home Component: First page users see from Google - a welcome page with intro and login.
// This is the landing spot - big branding and a clear "Login" call-to-action (CTA) for new users.
// Originally the main dashboard, now it’s a static welcome page pushing users to log in.
function Home({ loginWithMetaMask }) {
    // No state here - just a simple welcome page; loginWithMetaMask comes from App as a prop.
    return (
        // bg-dark sets our dark theme, flex centers everything, min-h-screen fills the viewport, p-4 adds padding for breathing room.
        <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
            {/* Big title - text-5xl makes it pop (huge!), font-bold for emphasis, text-primary is #8B5CF6 (purple), mb-6 adds space below (Tailwind’s margin-bottom shorthand). */}
            <h1 className="text-5xl font-bold text-primary mb-6">BlockSpeak</h1>
            {/* Tagline - tells users what BlockSpeak is about, text-xl is medium-large, mb-8 spaces it from the button, max-w-2xl keeps it readable on wide screens. */}
            <p className="text-xl text-white mb-8 text-center max-w-2xl">
                Create Smart Contracts, Ask Crypto Questions, Own Your Blockchain
            </p>
            {/* Big green button - the first step for users, py-4 px-8 makes it chunky, hover:bg-green-600 darkens on hover, rounded-lg softens edges, text-xl for bold text. */}
            <button
                onClick={loginWithMetaMask}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl flex items-center"
            >
                {/* Text inside button - clear action for users. Could add <img src="metamask-icon.png" /> here for the fox logo to make it snazzy! */}
                <span>Login with MetaMask</span>
            </button>
        </div>
    );
}

// Dashboard Component: Where logged-in users land - the hub for contracts, analytics, queries, and more.
// This was originally the Home component - now it’s the logged-in interface packed with features, showing everything BlockSpeak can do post-login.
function Dashboard({ account, logout, subscription }) {
    // State variables - little boxes to store data that changes:
    const [contractRequest, setContractRequest] = useState(""); // Holds user input like "Send 1 ETH to 0x123...".
    const [contractResult, setContractResult] = useState(""); // Stores the result message after creating a contract (e.g., "Success! Sent 1 ETH..." or an error).
    const [analytics, setAnalytics] = useState(null); // Wallet stats fetched from /api/analytics/<address> - balance, transaction count, etc.
    const [news, setNews] = useState([]); // List of crypto news articles from /api/news - latest headlines for users.
    const [query, setQuery] = useState(""); // User input for LLM questions like "What’s Bitcoin price?".
    const [queryResult, setQueryResult] = useState(""); // Answer from the LLM via /api/query - displayed to users.
    const [topCoins, setTopCoins] = useState([]); // Top crypto coins data from /api/ - Bitcoin, Ethereum, etc.
    const [graphData, setGraphData] = useState(null); // Data for the Bitcoin price graph from /api/coin_graph/bitcoin - feeds the chart.

    // createContract: Sends the user’s contract request to the backend for processing.
    const createContract = async (e) => {
        e.preventDefault(); // Stops the page from refreshing when the form submits - keeps the SPA feel smooth with no reloads.
        if (!account) return alert("Please log in!"); // Safety check - no account means no contracts; alerts the user to log in first.
        try {
            // POST request to /api/create_contract with the user’s input - expects JSON back with a message.
            const response = await axios.post(
                `${BASE_URL}/api/create_contract`,
                new URLSearchParams({ contract_request: contractRequest }), // Form data format Flask expects - key-value pairs.
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true } // Keeps session alive with credentials - critical for Flask’s @login_required!
            );
            setContractResult(response.data.message); // Updates UI with the friendly success message (e.g., "Success! Sent 1 ETH...") - users see it instantly.
        } catch (error) {
            // If something goes wrong (e.g., Flask error), show the backend’s error message or a fallback - logs error for debugging in console (F12).
            setContractResult(error.response?.data?.message || "Contract failed - check console!");
            console.error("Contract error:", error); // Helps pinpoint issues - check this if contracts fail!
        }
    };

    // askQuery: Sends the user’s question to the LLM via the backend for an answer.
    const askQuery = async (e) => {
        e.preventDefault(); // No page refresh on form submit - keeps it smooth with no interruptions.
        if (!account) return alert("Please log in!"); // Login check - ensures queries are only for logged-in users, keeps features secure.
        try {
            // POST to /api/query with the question - sends to Flask, gets LLM answer back in JSON.
            const response = await axios.post(
                `${BASE_URL}/api/query`,
                new URLSearchParams({ question: query }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true }
            );
            setQueryResult(response.data.answer); // Displays the LLM’s answer right away - instant feedback for users!
        } catch (error) {
            // Catches errors (e.g., OpenAI down) and shows a message - logs help debug if Flask or the LLM is the issue.
            setQueryResult(error.response?.data?.message || "Query failed - check console!");
            console.error("Query error:", error);
        }
    };

    // useEffect: Runs when the component loads or account changes - fetches initial and user-specific data.
    useEffect(() => {
        // Get general data from /api/ (news and top coins) - available for everyone, even if not logged in.
        axios.get(`${BASE_URL}/api/`).then((res) => {
            setNews(res.data.news_items); // Fills news list with latest crypto headlines.
            setTopCoins(res.data.top_coins); // Loads top coins like Bitcoin, Ethereum - cool for all users to see!
        }).catch((err) => console.error("Home data error:", err)); // Logs if /api/ fails - check Flask logs too!

        // If logged in, fetch user-specific data - only runs when account exists.
        if (account) {
            // Fetch wallet analytics for this user from /api/analytics/<address>.
            axios.get(`${BASE_URL}/api/analytics/${account}`, { withCredentials: true })
                .then((res) => setAnalytics(res.data)) // Sets balance, tx count, tokens.
                .catch((err) => console.error("Analytics error:", err)); // Logs if this fails - check Flask!

            // Fetch Bitcoin price graph data from /api/coin_graph/bitcoin - could expand to other coins later.
            axios.get(`${BASE_URL}/api/coin_graph/bitcoin`, { withCredentials: true })
                .then((res) => {
                    setGraphData({
                        labels: res.data.dates, // X-axis dates for the graph.
                        datasets: [{
                            label: "Bitcoin Price", // Graph title shown in the legend.
                            data: res.data.prices, // Y-axis prices - the line’s data points.
                            borderColor: "#2ecc71", // Green line for Bitcoin - looks sharp!
                            fill: false, // No fill under the line - keeps it clean.
                        }],
                    }); // Sets up the graph with dates and prices from Flask.
                })
                .catch((err) => console.error("Graph error:", err)); // Logs if this fails - check /api/coin_graph/bitcoin in Flask!
        }
    }, [account]); // Runs when account changes (login/logout) - dependency array ensures it only reruns on login state change.

    // The UI - everything styled with Tailwind CSS for a crypto-cool look.
    return (
        // Dark theme, full height, padded - sets the stage for a sleek blockchain vibe.
        <div className="bg-dark text-white min-h-screen p-4">
            {/* Big header - text-4xl is bold and prominent, primary is purple (#8B5CF6), "Dashboard" clarifies this is the logged-in hub, mb-4 adds space below. */}
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">BlockSpeak Dashboard</h1>
            {/* Shows wallet address (shortened for readability, e.g., 0x123...4567) and subscription tier - logout button is handy and styled with a hover effect. */}
            <p className="text-accent mb-4 text-center">
                Connected: {account.slice(0, 6)}...{account.slice(-4)} ({subscription})
                <button onClick={logout} className="ml-2 text-blue-400 hover:underline">Logout</button>
            </p>
            {/* Two-column layout on medium screens and up - neat and organized, gap-4 adds spacing between sections. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column - contracts and analytics stacked vertically. */}
                <div>
                    <form onSubmit={createContract} className="mb-4">
                        {/* Input for contract requests - w-full stretches it across the column, p-2 adds padding, mb-2 spaces it from the button, rounded and bordered for style. */}
                        <input
                            type="text"
                            value={contractRequest}
                            onChange={(e) => setContractRequest(e.target.value)} // Updates state as the user types - live input tracking.
                            placeholder="e.g., Send 1 ETH to 0x123..."
                            className="w-full p-2 mb-2 text-dark rounded border border-accent"
                        />
                        {/* Submit button - purple (bg-primary), darkens on hover (hover:bg-purple-700), bold text, padded for a chunky feel. */}
                        <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                            Create Contract
                        </button>
                    </form>
                    {/* Shows the contract result below the form - only appears if there’s a result to display, text-accent is a light color for contrast. */}
                    {contractResult && <p className="text-accent mb-4">{contractResult}</p>}
                    {analytics && (
                        // Wallet stats in a gray box - only shows if analytics data is fetched, styled with padding and rounded corners for a clean look.
                        <div className="bg-gray-800 p-4 rounded">
                            <h2 className="text-xl font-bold text-primary">Wallet Analytics</h2>
                            <p>Balance: {analytics.balance}</p>
                            <p>Transactions: {analytics.tx_count}</p>
                            <p>Top Tokens: {analytics.top_tokens}</p>
                        </div>
                    )}
                </div>
                {/* Right column - LLM query form and graph stacked vertically. */}
                <div>
                    <form onSubmit={askQuery} className="mb-4">
                        {/* Query input - same style as contract input, w-full stretches it, placeholder hints at usage. */}
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)} // Updates state as the user types - live input tracking.
                            placeholder="Ask about crypto..."
                            className="w-full p-2 mb-2 text-dark rounded border border-accent"
                        />
                        {/* Ask button - triggers the LLM query, matches the contract button’s purple style. */}
                        <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                            Ask
                        </button>
                    </form>
                    {/* Shows the LLM answer below the form - appears only if there’s an answer, styled for readability. */}
                    {queryResult && <p className="text-accent mb-4">{queryResult}</p>}
                    {graphData && (
                        // Graph in a gray box - responsive means it fits any screen size, y-axis doesn’t start at zero to zoom in on price changes.
                        <div className="bg-gray-800 p-4 rounded">
                            <h2 className="text-xl font-bold text-primary">Bitcoin Price (7 Days)</h2>
                            <Line data={graphData} options={{ responsive: true, scales: { y: { beginAtZero: false } } }} />
                        </div>
                    )}
                </div>
            </div>
            {/* Top Coins section - margin-top (mt-4) spaces it from the grid above. */}
            <div className="mt-4">
                {/* Header for coins - bold and purple, text-xl for prominence. */}
                <h2 className="text-xl font-bold text-primary">Top Coins</h2>
                {/* Grid adjusts columns by screen size - 1 on small, 2 on medium, 4 on large, gap-4 for spacing. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {topCoins.map((coin) => (
                        // Loops through topCoins to show coin cards - green if price up, red if down, images add visual pop.
                        <div key={coin.id} className="bg-gray-800 p-4 rounded">
                            <img src={coin.image} alt={coin.name} className="w-8 h-8 mb-2" />
                            <p>{coin.name}: ${coin.price}</p>
                            <p>Market Cap: ${coin.market_cap}</p>
                            <p className={coin.change > 0 ? "text-green-400" : "text-red-400"}>{coin.change}%</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* News section - mt-4 adds space from coins above. */}
            <div className="mt-4">
                {/* Header for news - matches coins’ style. */}
                <h2 className="text-xl font-bold text-primary">Latest News</h2>
                {news.map((item, idx) => (
                    // News links - opens in new tabs, hover:underline adds interactivity, text-accent contrasts with blue links.
                    <p key={idx} className="text-accent">
                        <a href={item.link} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{item.title}</a>
                    </p>
                ))}
            </div>
        </div>
    );
}

// Subscribe Component: Lets users pick a subscription plan and pay with Stripe.
// This page handles subscription options - redirects to Stripe Checkout for payment.
function Subscribe({ account }) {
    // No useNavigate needed here - Stripe redirect uses window.location.href for external URLs.
    const handleSubscribe = async (plan) => {
        if (!account) return alert("Please log in!"); // Must be logged in to subscribe - safety check.
        try {
            // POST to /api/subscribe to get a Stripe checkout URL - sends the chosen plan (basic or pro).
            const response = await axios.post(
                `${BASE_URL}/api/subscribe`,
                new URLSearchParams({ plan }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true }
            );
            window.location.href = response.data.checkout_url; // Sends user to Stripe Checkout (external URL) - full redirect needed here.
        } catch (error) {
            // If Stripe fails, alert the user and log the error for debugging.
            alert("Subscription failed - check console!");
            console.error("Subscribe error:", error);
        }
    };

    // Dark theme, full height, centered layout - matches the app’s style.
    return (
        <div className="bg-dark text-white min-h-screen p-4 flex flex-col items-center">
            {/* Big header - tells users they’re on the subscription page. */}
            <h1 className="text-4xl font-bold text-primary mb-4">Subscribe to BlockSpeak</h1>
            {/* Two-column grid on medium screens - shows plan options side by side. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic plan card - gray box, purple button triggers subscription. */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-bold text-primary">Basic Plan - $10/month</h2>
                    <p className="text-accent">Unlimited contracts, basic analytics</p>
                    <button onClick={() => handleSubscribe("basic")} className="mt-2 bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                        Subscribe
                    </button>
                </div>
                {/* Pro plan card - same style, different plan passed to handleSubscribe. */}
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-bold text-primary">Pro Plan - $50/month</h2>
                    <p className="text-accent">Unlimited contracts, advanced analytics, priority support</p>
                    <button onClick={() => handleSubscribe("pro")} className="mt-2 bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                        Subscribe
                    </button>
                </div>
            </div>
        </div>
    );
}

// Success Component: Shows after a successful Stripe payment - confirms subscription.
// Redirects back to dashboard after a short delay.
function Success() {
    const navigate = useNavigate(); // Hook to redirect internally - used here to go back to dashboard.
    useEffect(() => {
        // Confirm subscription with backend and redirect to dashboard after 2 seconds.
        axios.get(`${BASE_URL}/api/subscription_success?plan=${new URLSearchParams(window.location.search).get("plan")}`, { withCredentials: true })
            .then(() => setTimeout(() => navigate("/dashboard"), 2000)) // Wait 2 seconds, then go to /dashboard.
            .catch((err) => console.error("Success error:", err)); // Logs if confirmation fails - check Flask!
    }, [navigate]); // Runs once on load, navigate in dependency array to keep React happy.

    // Centered success message - fills the screen.
    return (
        <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
            {/* Big, bold confirmation - purple text stands out. */}
            <h1 className="text-4xl font-bold text-primary">Subscription Successful!</h1>
            {/* Lets users know they’re heading back - mt-4 spaces it from the header. */}
            <p className="text-accent mt-4">Redirecting to dashboard...</p>
        </div>
    );
}

// Marketplace Component: Browse contracts (placeholder for now).
// This will eventually let users browse and deploy smart contract templates.
function Marketplace() {
    // Consistent dark theme and padding.
    return (
        <div className="bg-dark text-white min-h-screen p-4">
            {/* Big header - centered for emphasis. */}
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">Marketplace</h1>
            {/* Placeholder text - hints at future features. */}
            <p className="text-accent text-center">Coming soon: Browse and deploy smart contracts!</p>
        </div>
    );
}

// AboutUs Component: Mission and team info.
// Tells users who we are and why BlockSpeak exists.
function AboutUs() {
    // Matches app’s dark style.
    return (
        <div className="bg-dark text-white min-h-screen p-4">
            {/* Bold, centered header. */}
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">About Us</h1>
            {/* Mission statement - max-w-2xl keeps it readable, mx-auto centers it. */}
            <p className="text-accent text-center max-w-2xl mx-auto">
                BlockSpeak empowers you to harness blockchain with no-code contracts and crypto insights. Built by a team passionate about Web3 freedom.
            </p>
        </div>
    );
}

// HowItWorks Component: User guide with steps.
// Explains how to use BlockSpeak in simple terms.
function HowItWorks() {
    // Dark theme, full height.
    return (
        <div className="bg-dark text-white min-h-screen p-4">
            {/* Clear, bold header. */}
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">How It Works</h1>
            {/* Steps listed - centered and limited width for readability. */}
            <div className="text-accent max-w-2xl mx-auto">
                <p>1. Login with MetaMask to connect your wallet.</p>
                <p>2. Create smart contracts with simple text commands.</p>
                <p>3. Ask crypto questions and get instant answers.</p>
            </div>
        </div>
    );
}

// EmailSignup Component: Collects emails for our marketing list.
// Simple form to grow our user base - backend TBD.
function EmailSignup() {
    const [email, setEmail] = useState(""); // Holds the email input value.
    const handleSignup = async (e) => {
        e.preventDefault(); // Prevents page refresh on submit.
        alert(`Email ${email} added to list! (Backend TBD)`); // Placeholder - will add /api/email_signup later.
        setEmail(""); // Clears the input after submission.
    };
    // Margin-top spaces it from content above.
    return (
        <div className="mt-4">
            {/* Header for the form - centered and bold. */}
            <h2 className="text-xl font-bold text-primary text-center">Join Our Email List</h2>
            {/* Flex layout - stacks on small screens, row on medium+, gap-2 for spacing. */}
            <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-2 justify-center">
                {/* Email input - styled with padding, border, and rounded corners, required ensures an email is entered. */}
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} // Updates email state as user types.
                    placeholder="Enter your email"
                    className="p-2 text-dark rounded border border-accent"
                    required
                />
                {/* Submit button - purple, bold, hover effect matches other buttons. */}
                <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                    Sign Up
                </button>
            </form>
        </div>
    );
}

// Main App Component: Ties everything together with routing.
// This is the root - sets up the router and passes state to child components.
function App() {
    const [account, setAccount] = useState(null); // Tracks the logged-in wallet address - null if not logged in.
    const [subscription, setSubscription] = useState("free"); // User’s subscription tier - defaults to "free".

    // AppContent: Inner component to handle login logic and navigation within Router context.
    function AppContent() {
        const navigate = useNavigate(); // Hook to programmatically navigate - now safe inside Router!

        // loginWithMetaMask: Connects to MetaMask and logs in via backend.
        const loginWithMetaMask = async () => {
            if (!window.ethereum) return alert("Please install MetaMask!"); // Checks for MetaMask - alerts if missing.
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }); // Requests wallet connection - gets accounts.
                const address = accounts[0]; // Takes the first account - the user’s wallet.
                const nonce = await fetch(`${BASE_URL}/nonce`, { credentials: "include" }).then((res) => res.text()); // Gets a nonce from Flask for security.
                const message = `Log in to BlockSpeak: ${nonce}`; // Message to sign - includes nonce to prevent replay attacks.
                const signature = await window.ethereum.request({ method: "personal_sign", params: [message, address] }); // Signs the message with MetaMask.
                const response = await fetch(`${BASE_URL}/login/metamask`, {
                    method: "POST",
                    credentials: "include", // Keeps session alive with Flask.
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address, signature }), // Sends signed data to Flask.
                });
                if (response.ok) {
                    setAccount(address); // Sets the account if login succeeds - triggers useEffect updates.
                    const homeData = await axios.get(`${BASE_URL}/api/`, { withCredentials: true }); // Fetches home data to get subscription status.
                    setSubscription(homeData.data.subscription); // Updates subscription tier from Flask.
                    navigate("/dashboard"); // Redirects to dashboard after successful login - now works!
                } else throw new Error("Login failed"); // Throws if Flask rejects the login.
            } catch (error) {
                alert("Login failed - check console!"); // Alerts user if anything fails - logs details.
                console.error("Login error:", error); // Logs for debugging - check F12 console!
            }
        };

        // logout: Logs the user out via backend and resets state.
        const logout = async () => {
            await axios.get(`${BASE_URL}/api/logout`, { withCredentials: true }); // Calls Flask to end the session.
            setAccount(null); // Clears account - takes user back to Home.
            setSubscription("free"); // Resets subscription to default.
            navigate("/"); // Redirects back to home page after logout - keeps UI in sync.
        };

        // The app structure: Navigation bar + Routes for all pages, plus a footer with email signup.
        return (
            <>
                {/* Navigation bar - gray background, centered links, space-x-6 for even spacing. */}
                <nav className="bg-gray-800 p-4 flex justify-center space-x-6">
                    {/* Links to all pages - purple text, hover effect, text-lg for larger, readable links. */}
                    <Link to="/" className="text-primary hover:text-purple-400 text-lg">Home</Link>
                    {account && (
                        <Link to="/dashboard" className="text-primary hover:text-purple-400 text-lg">Dashboard</Link>
                    )} {/* Show Dashboard link only when logged in */}
                    <Link to="/marketplace" className="text-primary hover:text-purple-400 text-lg">Marketplace</Link>
                    <Link to="/about" className="text-primary hover:text-purple-400 text-lg">About Us</Link>
                    <Link to="/how-it-works" className="text-primary hover:text-purple-400 text-lg">How It Works</Link>
                    <Link to="/subscribe" className="text-primary hover:text-purple-400 text-lg">Subscribe</Link>
                </nav>
                {/* Defines what component shows at each URL path. */}
                <Routes>
                    <Route path="/" element={<Home loginWithMetaMask={loginWithMetaMask} />} />
                    {/* Root path - shows the welcome page with login button. */}
                    <Route path="/dashboard" element={<Dashboard account={account} logout={logout} subscription={subscription} />} />
                    {/* Dashboard path - logged-in users’ hub. */}
                    <Route path="/subscribe" element={<Subscribe account={account} />} />
                    {/* Subscribe path - payment options. */}
                    <Route path="/success" element={<Success />} />
                    {/* Success path - post-payment confirmation. */}
                    <Route path="/marketplace" element={<Marketplace />} />
                    {/* Marketplace path - contract browsing (placeholder). */}
                    <Route path="/about" element={<AboutUs />} />
                    {/* About Us path - mission and team info. */}
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    {/* How It Works path - user guide. */}
                </Routes>
                {/* Footer - gray background, mt-8 spaces it from content, holds the email signup form. */}
                <footer className="bg-gray-800 p-4 mt-8">
                    <EmailSignup />
                </footer>
            </>
        );
    }

    // Wrap AppContent in Router - keeps everything inside the routing context.
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

// Exports the App component - this is what gets rendered in index.js to kick off the app!
export default App;