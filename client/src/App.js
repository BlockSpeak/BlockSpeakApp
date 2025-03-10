// App.js
// Purpose: This is the heart of BlockSpeak's frontend - a single-page app (SPA) built with React.
// It connects users to Web3 via MetaMask, creates smart contracts, shows wallet analytics, crypto news,
// price graphs, lets users ask LLM questions, handles subscriptions (Stripe + ETH!), and collects emails.
// Everything lives at https://blockspeak.co (or http://localhost:3000 locally) - the control room of our crypto spaceship!

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import "./index.css";

// Register ChartJS components for graphs
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Base URL switches between local testing and production
const BASE_URL = window.location.hostname === "localhost" ? "http://127.0.0.1:8080" : "https://blockspeak.onrender.com";
// Your ETH wallet for payments - replace with your real one for live!
const ETH_PAYMENT_ADDRESS = "0x37558169d86748dA34eACC76eEa6b5AF787FF74c";

// Home component: Landing page with MetaMask login
function Home({ loginWithMetaMask }) {
    return (
        <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-5xl font-bold text-primary mb-6">BlockSpeak</h1>
            <p className="text-xl text-white mb-8 text-center max-w-2xl">
                Create Smart Contracts, Ask Crypto Questions, Own Your Blockchain
            </p>
            <button
                onClick={loginWithMetaMask}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl flex items-center"
            >
                <span>Login with MetaMask</span>
            </button>
        </div>
    );
}

// Dashboard component: Main user interface after login
function Dashboard({ account, logout, subscription }) {
    const [contractRequest, setContractRequest] = useState("");
    const [contractResult, setContractResult] = useState("");
    const [analytics, setAnalytics] = useState(null);
    const [news, setNews] = useState([]);
    const [query, setQuery] = useState("");
    const [queryResult, setQueryResult] = useState("");
    const [topCoins, setTopCoins] = useState([]);
    const [graphData, setGraphData] = useState(null);

    // Function to create a smart contract
    const createContract = async (e) => {
        e.preventDefault();
        if (!account) return alert("Please log in!");
        try {
            const response = await axios.post(
                `${BASE_URL}/api/create_contract`,
                new URLSearchParams({ contract_request: contractRequest }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true }
            );
            setContractResult(response.data.message);
        } catch (error) {
            setContractResult(error.response?.data?.message || "Contract failed - check console!");
            console.error("Contract error:", error);
        }
    };

    // Function to ask a crypto-related question
    const askQuery = async (e) => {
        e.preventDefault();
        if (!account) return alert("Please log in!");
        try {
            const response = await axios.post(
                `${BASE_URL}/api/query`,
                new URLSearchParams({ question: query }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true }
            );
            setQueryResult(response.data.answer);
        } catch (error) {
            setQueryResult(error.response?.data?.message || "Query failed - check console!");
            console.error("Query error:", error);
        }
    };

    // Load initial data (news, coins, analytics, graph) when account changes
    useEffect(() => {
        let mounted = true;
        axios.get(`${BASE_URL}/api/`).then((res) => {
            if (mounted) {
                setNews(res.data.news_items);
                setTopCoins(res.data.top_coins);
            }
        }).catch((err) => console.error("Home data error:", err));

        if (account) {
            axios.get(`${BASE_URL}/api/analytics/${account}`, { withCredentials: true })
                .then((res) => { if (mounted) setAnalytics(res.data); })
                .catch((err) => {
                    console.error("Analytics error:", err);
                    if (mounted) setAnalytics({ error: "Analytics unavailable" });
                });
            axios.get(`${BASE_URL}/api/coin_graph/bitcoin`, { withCredentials: true })
                .then((res) => {
                    if (mounted) {
                        setGraphData({
                            labels: res.data.dates,
                            datasets: [{
                                label: "Bitcoin Price",
                                data: res.data.prices,
                                borderColor: "#2ecc71",
                                fill: false
                            }]
                        });
                    }
                })
                .catch((err) => console.error("Graph error:", err));
        }
        return () => { mounted = false; };
    }, [account]);

    // Welcome banner for paid users
    const welcomeBanner = subscription !== "free" ? (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg mb-6 text-center">
            <p className="text-lg text-white">
                You're on the <span className="font-semibold capitalize">{subscription} Plan</span> -{" "}
                {subscription === "basic" ? "Unlimited contracts & basic analytics!" : "Unlimited contracts, advanced analytics, & priority support!"}
            </p>
        </div>
    ) : null;

    return (
        <div className="bg-dark text-white min-h-screen p-4">
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">
                {subscription !== "free" ? "Welcome to Your BlockSpeak Dashboard" : "BlockSpeak Dashboard"}
            </h1>
            <p className="text-accent mb-4 text-center">
                {account ? (
                    <>Connected: {account.slice(0, 6)}...{account.slice(-4)} ({subscription})</>
                ) : (
                    "Not connected - please log in!"
                )}
                {account && <button onClick={logout} className="ml-2 text-blue-400 hover:underline">Logout</button>}
            </p>
            {welcomeBanner}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <form onSubmit={createContract} className="mb-4">
                        <input
                            type="text"
                            value={contractRequest}
                            onChange={(e) => setContractRequest(e.target.value)}
                            placeholder="e.g., Send 1 ETH to 0x123..."
                            className="w-full p-2 mb-2 text-dark rounded border border-accent"
                        />
                        <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                            Create Contract
                        </button>
                    </form>
                    {contractResult && <p className="text-accent mb-4">{contractResult}</p>}
                    {analytics && (
                        <div className="bg-gray-800 p-4 rounded">
                            <h2 className="text-xl font-bold text-primary">Wallet Analytics</h2>
                            {analytics.error ? (
                                <p className="text-red-400">{analytics.error}</p>
                            ) : (
                                <>
                                    <p>Balance: {analytics.balance}</p>
                                    <p>Transactions: {analytics.tx_count}</p>
                                    <p>Top Tokens: {analytics.top_tokens}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <form onSubmit={askQuery} className="mb-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about crypto..."
                            className="w-full p-2 mb-2 text-dark rounded border border-accent"
                        />
                        <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                            Ask
                        </button>
                    </form>
                    {queryResult && <p className="text-accent mb-4">{queryResult}</p>}
                    {graphData && (
                        <div className="bg-gray-800 p-4 rounded">
                            <h2 className="text-xl font-bold text-primary">Bitcoin Price (7 Days)</h2>
                            <Line data={graphData} options={{ responsive: true, scales: { y: { beginAtZero: false } } }} />
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4">
                <h2 className="text-xl font-bold text-primary">Top Coins</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {topCoins.map((coin) => (
                        <div key={coin.id} className="bg-gray-800 p-4 rounded">
                            <img src={coin.image} alt={coin.name} className="w-8 h-8 mb-2" />
                            <p>{coin.name}: ${coin.price}</p>
                            <p>Market Cap: ${coin.market_cap}</p>
                            <p className={coin.change > 0 ? "text-green-400" : "text-red-400"}>{coin.change}%</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-4">
                <h2 className="text-xl font-bold text-primary">Latest News</h2>
                {news.map((item, idx) => (
                    <p key={idx} className="text-accent">
                        <a href={item.link} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{item.title}</a>
                    </p>
                ))}
            </div>
        </div>
    );
}

// Subscribe component: Handles subscription plans (Stripe and ETH)
function Subscribe({ account, subscription, setSubscription }) {
    const navigate = useNavigate();

    // Stripe payment handler
    const handleStripeSubscribe = async (plan) => {
        if (!account) return alert("Please log in!");
        try {
            const response = await axios.post(
                `${BASE_URL}/api/subscribe`,
                new URLSearchParams({ plan }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true }
            );
            window.location.href = response.data.checkout_url;
        } catch (error) {
            alert("Subscription failed - check console!");
            console.error("Stripe subscribe error:", error);
        }
    };

    // ETH payment handler - Basic: 0.005 ETH, Pro: 0.025 ETH (test values!)
    const handleEthSubscribe = async (plan) => {
        if (!account) return alert("Please log in!");
        if (!window.ethereum) return alert("MetaMask required for ETH payment!");
        const ethAmount = plan === "basic" ? "0.005" : "0.025"; // Rough USD match - tweak for live!
        try {
            const txHash = await window.ethereum.request({
                method: "eth_sendTransaction",
                params: [{
                    from: account,
                    to: ETH_PAYMENT_ADDRESS,
                    value: (parseFloat(ethAmount) * 1e18).toString(16) // ETH to Wei, hex for MetaMask
                }]
            });
            // Send txHash to backend to verify payment
            const response = await axios.post(
                `${BASE_URL}/api/subscribe_eth`,
                new URLSearchParams({ plan, tx_hash: txHash }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true }
            );
            if (response.data.success) {
                setSubscription(plan);
                navigate("/dashboard");
            } else {
                alert("ETH subscription failed - check console!");
                console.error("ETH subscribe failed:", response.data);
            }
        } catch (error) {
            alert("ETH payment failed - check console!");
            console.error("ETH subscribe error:", error);
        }
    };

    return (
        <div className="bg-dark text-white min-h-screen p-4 flex flex-col items-center">
            <h1 className="text-4xl font-bold text-primary mb-4">Subscribe to BlockSpeak</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-bold text-primary">Basic Plan - $10/month or 0.005 ETH</h2>
                    <p className="text-accent">Unlimited contracts, basic analytics</p>
                    {subscription === "basic" ? (
                        <p className="text-green-400 mt-2">You're already on this plan! <Link to="/subscribe" className="text-blue-400 hover:underline" onClick={() => handleStripeSubscribe("pro")}>Upgrade to Pro?</Link></p>
                    ) : (
                        <div className="mt-2 flex space-x-2">
                            <button onClick={() => handleStripeSubscribe("basic")} className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                                Pay with Card
                            </button>
                            <button onClick={() => handleEthSubscribe("basic")} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                                Pay with ETH
                            </button>
                        </div>
                    )}
                </div>
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl font-bold text-primary">Pro Plan - $50/month or 0.025 ETH</h2>
                    <p className="text-accent">Unlimited contracts, advanced analytics, priority support</p>
                    {subscription === "pro" ? (
                        <p className="text-green-400 mt-2">You're already on this plan!</p>
                    ) : (
                        <div className="mt-2 flex space-x-2">
                            <button onClick={() => handleStripeSubscribe("pro")} className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                                Pay with Card
                            </button>
                            <button onClick={() => handleEthSubscribe("pro")} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                                Pay with ETH
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Success component: Confirms subscription and redirects
function Success({ account, setAccount, subscription, setSubscription }) {
    const navigate = useNavigate();

    // Confirm subscription on load
    useEffect(() => {
        const confirmSubscription = async () => {
            try {
                const plan = new URLSearchParams(window.location.search).get("plan");
                const response = await axios.get(`${BASE_URL}/api/subscription_success?plan=${plan}`, { withCredentials: true });
                if (response.data.success) {
                    setSubscription(plan);
                    const storedAccount = localStorage.getItem("account");
                    if (storedAccount && !account) setAccount(storedAccount);
                    setTimeout(() => navigate("/dashboard"), 2000);
                } else {
                    console.error("Subscription confirmation failed:", response.data);
                }
            } catch (error) {
                console.error("Success error:", error);
            }
        };
        confirmSubscription();
    }, [navigate, account, setAccount, setSubscription]);

    return (
        <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold text-primary">Subscription Successful!</h1>
            <p className="text-accent mt-4">Redirecting to your dashboard...</p>
        </div>
    );
}

// Marketplace component: Placeholder for future features
function Marketplace() {
    return (
        <div className="bg-dark text-white min-h-screen p-4">
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">Marketplace</h1>
            <p className="text-accent text-center">Coming soon: Browse and deploy smart contracts!</p>
        </div>
    );
}

// AboutUs component: Info about BlockSpeak
function AboutUs() {
    return (
        <div className="bg-dark text-white min-h-screen p-4">
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">About Us</h1>
            <p className="text-accent text-center max-w-2xl mx-auto">
                BlockSpeak empowers you to harness blockchain with no-code contracts and crypto insights. Built by a team passionate about Web3 freedom.
            </p>
        </div>
    );
}

// HowItWorks component: Simple guide to using BlockSpeak
function HowItWorks() {
    return (
        <div className="bg-dark text-white min-h-screen p-4">
            <h1 className="text-4xl font-bold text-primary mb-4 text-center">How It Works</h1>
            <div className="text-accent max-w-2xl mx-auto">
                <p>1. Login with MetaMask to connect your wallet.</p>
                <p>2. Create smart contracts with simple text commands.</p>
                <p>3. Ask crypto questions and get instant answers.</p>
            </div>
        </div>
    );
}

// EmailSignup component: Collects emails for marketing
function EmailSignup() {
    const [email, setEmail] = useState("");
    const handleSignup = async (e) => {
        e.preventDefault();
        alert(`Email ${email} added to list! (Backend TBD)`);
        setEmail("");
    };
    return (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-lg shadow-lg text-center">
            <h2 className="text-xl font-bold text-white mb-2">Join Our Email List</h2>
            <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-2 justify-center">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="p-2 text-dark rounded border border-accent"
                    required
                />
                <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                    Sign Up
                </button>
            </form>
        </div>
    );
}

// Main App component: Sets up routing and state
function App() {
    const [account, setAccount] = useState(localStorage.getItem("account") || null);
    const [subscription, setSubscription] = useState("free");

    // Updates account state and localStorage
    const updateAccount = (newAccount) => {
        setAccount(newAccount);
        if (newAccount) localStorage.setItem("account", newAccount);
        else localStorage.removeItem("account");
    };

    // AppContent: Defines the layout and navigation
    function AppContent() {
        const navigate = useNavigate();

        // Login with MetaMask
        const loginWithMetaMask = async () => {
            if (!window.ethereum) return alert("Please install MetaMask!");
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                const address = accounts[0];
                const nonce = await fetch(`${BASE_URL}/nonce`, { credentials: "include" }).then((res) => res.text());
                const message = `Log in to BlockSpeak: ${nonce}`;
                const signature = await window.ethereum.request({ method: "personal_sign", params: [message, address] });
                const response = await fetch(`${BASE_URL}/login/metamask`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address, signature })
                });
                if (response.ok) {
                    updateAccount(address);
                    const homeData = await axios.get(`${BASE_URL}/api/`, { withCredentials: true });
                    setSubscription(homeData.data.subscription);
                    navigate("/dashboard");
                } else throw new Error("Login failed");
            } catch (error) {
                alert("Login failed - check console!");
                console.error("Login error:", error);
            }
        };

        // Logout function
        const logout = async () => {
            try {
                await axios.get(`${BASE_URL}/api/logout`, { withCredentials: true });
                updateAccount(null);
                setSubscription("free");
                setTimeout(() => navigate("/"), 0);
            } catch (error) {
                console.error("Logout error:", error);
                updateAccount(null);
                setSubscription("free");
                setTimeout(() => navigate("/"), 0);
            }
        };

        return (
            <div className="flex flex-col min-h-screen bg-dark">
                <nav className="bg-gray-800 p-4 flex flex-col sm:flex-row sm:justify-center gap-2 sm:gap-0 sm:space-x-6 text-center sm:text-left">
                    <Link to="/" className="text-primary hover:text-purple-400 text-lg">Home</Link>
                    {account && <Link to="/dashboard" className="text-primary hover:text-purple-400 text-lg">Dashboard</Link>}
                    <Link to="/marketplace" className="text-primary hover:text-purple-400 text-lg">Marketplace</Link>
                    <Link to="/about" className="text-primary hover:text-purple-400 text-lg">About Us</Link>
                    <Link to="/how-it-works" className="text-primary hover:text-purple-400 text-lg">How It Works</Link>
                    <Link to="/subscribe" className="text-primary hover:text-purple-400 text-lg">Subscribe</Link>
                </nav>
                <main className="flex-grow">
                    <Routes>
                        <Route path="/" element={<Home loginWithMetaMask={loginWithMetaMask} />} />
                        <Route path="/dashboard" element={<Dashboard account={account} logout={logout} subscription={subscription} />} />
                        <Route path="/subscribe" element={<Subscribe account={account} subscription={subscription} setSubscription={setSubscription} />} />
                        <Route path="/success" element={<Success account={account} setAccount={updateAccount} subscription={subscription} setSubscription={setSubscription} />} />
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route path="/about" element={<AboutUs />} />
                        <Route path="/how-it-works" element={<HowItWorks />} />
                    </Routes>
                </main>
                <footer className="bg-gray-800 p-4 w-full">
                    <EmailSignup />
                </footer>
            </div>
        );
    }

    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;