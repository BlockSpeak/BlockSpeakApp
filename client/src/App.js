// App.js
// Purpose: BlockSpeak’s frontend—connects users to Web3 via MetaMask, creates smart contracts, and shows analytics/news.
// Notes:
// - Dependencies: npm install react react-dom react-router-dom (for routes later)
// - Tailwind: Uses custom colors from tailwind.config.js (primary: #8B5CF6, dark: #1F2937, accent: #D1D5DB)
// - Local Testing: BASE_URL = 'http://127.0.0.1:8080'—run Flask server locally first (python server/BlockSpeak.py)
// - Render Deploy: Switch BASE_URL to 'https://blockspeak.onrender.com', run 'npm run build', push client/build/ to GitHub
// - Env Setup: Ensure Render has NETWORK=sepolia, PRIVATE_KEY, ALCHEMY_API_KEY, OPENAI_API_KEY, STRIPE_SECRET_KEY
// - Future: Add routes (/about, /marketplace), DAO creation, LLM chat UI

import React, { useState, useEffect } from 'react';
import './index.css'; // Pulls in Tailwind from index.css (check @tailwind directives are there!)

function App() {
    // State variables to manage our app’s data
    const [account, setAccount] = useState(null);           // User’s MetaMask wallet address
    const [contractRequest, setContractRequest] = useState(''); // Text input for contract (e.g., "Send 1 ETH...")
    const [contractResult, setContractResult] = useState('');   // Result from contract creation
    const [analytics, setAnalytics] = useState(null);       // Wallet analytics from Flask backend
    const [news, setNews] = useState([]);                   // Crypto news feed from Flask

    // Base URL for backend API calls
    const BASE_URL = 'http://127.0.0.1:8080'; // Local testing—comment this out for Render
    // const BASE_URL = 'https://blockspeak.onrender.com'; // Uncomment for Render deploy

    // Log in with MetaMask—connects users wallet
    const loginWithMetaMask = async () => {
        if (!window.ethereum) {
            alert('Please install MetaMask!'); // Check if MetaMask is in browser
            return;
        }
        try {
            // Request wallet connection
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            console.log('Address:', address);

            // Get nonce from Flask for secure login
            const nonce = await fetch(`${BASE_URL}/nonce`, { credentials: 'include' })
                .then(res => res.text());
            if (!nonce) throw new Error('No nonce received');
            console.log('Nonce:', nonce);

            // Create message to sign
            const message = `Log in to BlockSpeak: ${nonce}`;
            console.log('Message to sign:', message);

            // User signs message with MetaMask
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address]
            });
            console.log('Signature:', signature);

            // Send signed message to Flask for verification
            const response = await fetch(`${BASE_URL}/login/metamask`, {
                method: 'POST',
                credentials: 'include', // Keep session alive
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, signature })
            });

            if (response.ok) {
                setAccount(address); // Login successful—store address
                console.log('Login successful:', address);
            } else {
                const errorText = await response.text();
                throw new Error(`Login failed: ${errorText}`);
            }
        } catch (error) {
            console.error('MetaMask login error:', error);
            alert('Login failed—check console for details');
        }
    };

    // Create a smart contract based on user input
    const createContract = async (e) => {
        e.preventDefault(); // Stop page from refreshing
        if (!account) {
            alert('Please log in first!');
            return;
        }
        try {
            // Send contract request to Flask backend
            const response = await fetch(`${BASE_URL}/create_contract`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ contract_request: contractRequest })
            });
            const text = await response.text();
            console.log('Contract created:', text);
            setContractResult(text); // Show result (e.g., contract address)
        } catch (error) {
            console.error('Contract creation error:', error);
            setContractResult('Error creating contract');
        }
    };

    // Fetch data from backend after login (analytics, news)
    useEffect(() => {
        if (account) {
            // Get wallet analytics
            fetch(`${BASE_URL}/analytics/${account}`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => setAnalytics(data))
                .catch(err => console.error('Analytics fetch error:', err));

            // Get crypto news
            fetch(`${BASE_URL}/news`)
                .then(res => res.json())
                .then(data => setNews(data))
                .catch(err => console.error('News fetch error:', err));
        }
    }, [account]); // Runs whenever account changes

    // UI—our apps look and feel with Tailwind
    return (
        <div className="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-4">
            {/* Header */}
            <h1 className="text-4xl font-bold text-primary mb-4">BlockSpeak</h1>

            {/* Login or account display */}
            {account ? (
                <p className="text-accent mb-4">Connected: {account}</p>
            ) : (
                <button
                    onClick={loginWithMetaMask}
                    className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mb-4"
                >
                    Login with MetaMask
                </button>
            )}

            {/* Contract creation form—shows after login */}
            {account && (
                <>
                    <form onSubmit={createContract} className="w-full max-w-md mb-4">
                        <input
                            type="text"
                            value={contractRequest}
                            onChange={(e) => setContractRequest(e.target.value)}
                            placeholder="e.g., Send 1 ETH to 0x123... every Friday"
                            className="w-full p-2 mb-2 text-dark rounded border border-accent"
                        />
                        <button
                            type="submit"
                            className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Create Contract
                        </button>
                    </form>

                    {/* Show contract result */}
                    {contractResult && (
                        <div className="mt-4 text-accent" dangerouslySetInnerHTML={{ __html: contractResult }} />
                    )}

                    {/* Wallet analytics section */}
                    {analytics && (
                        <div className="mt-4 bg-gray-800 p-4 rounded">
                            <h2 className="text-xl font-bold text-primary">Wallet Analytics</h2>
                            <p className="text-accent">Balance: {analytics.balance}</p>
                            <p className="text-accent">Transactions: {analytics.tx_count}</p>
                            <p className="text-accent">Top Tokens: {analytics.top_tokens}</p>
                        </div>
                    )}

                    {/* News feed section */}
                    <div className="mt-4">
                        <h2 className="text-xl font-bold text-primary">Latest News</h2>
                        {news.map((item, idx) => (
                            <p key={idx} className="text-accent">
                                <a
                                    href={item.link}
                                    className="text-blue-400 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.title}
                                </a>
                            </p>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default App;