// Dashboard.jsx
// Purpose: Main user interface after login, displaying forms for smart contracts, DAOs, and crypto queries.
// Features wallet analytics, price graphs, top coins, and news. Includes DAO voting: join, propose, and vote on ideas.

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Set default credentials for Axios to include cookies in requests (important for authentication)
axios.defaults.withCredentials = true;

// Register ChartJS components to enable graph rendering (e.g., scales, lines, tooltips)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Base URL switches between local testing and production environments
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

// Array of coin options for the dropdown and graph, with IDs, labels, and colors
// Moved outside the component to ensure a stable reference and fix ESLint dependency warning
const coinOptions = [
  { id: 'bitcoin', label: 'Bitcoin (BTC)', color: '#2ecc71' },
  { id: 'ethereum', label: 'Ethereum (ETH)', color: '#3498db' },
  { id: 'solana', label: 'Solana (SOL)', color: '#9b59b6' },
];

// Dashboard component receives account, logout function, and subscription status as props
function Dashboard({ account, logout, subscription }) {
  const navigate = useNavigate(); // Hook for redirecting to other pages (e.g., login or subscribe)
  const location = useLocation(); // Hook to get navigation state (e.g., selected coin from previous page)

  // State variables for managing dashboard data and UI interactions
  const [selectedCoin, setSelectedCoin] = useState(location.state?.selectedCoin || 'bitcoin'); // Coin selected for price graph
  const [contractRequest, setContractRequest] = useState(''); // User input for smart contract creation
  const [contractResult, setContractResult] = useState(''); // Result message from contract creation
  const [analytics, setAnalytics] = useState(null); // Wallet analytics data (balance, transactions, tokens)
  const [news, setNews] = useState([]); // Array of latest crypto news items
  const [query, setQuery] = useState(''); // User input for crypto-related questions
  const [queryResult, setQueryResult] = useState(''); // Answer to the crypto query from backend
  const [topCoins, setTopCoins] = useState([]); // Array of top cryptocurrency data
  const [graphData, setGraphData] = useState(null); // Data for rendering the price graph
  const [daoName, setDaoName] = useState(''); // User input for DAO name
  const [daoDescription, setDaoDescription] = useState(''); // User input for DAO description
  const [daoResult, setDaoResult] = useState(''); // Result message from DAO creation
  const [daoAddress, setDaoAddress] = useState(''); // DAO address for joining or voting
  const [joinResult, setJoinResult] = useState(''); // Result message from joining a DAO
  const [proposalDescription, setProposalDescription] = useState(''); // User input for proposal description
  const [proposalResult, setProposalResult] = useState(''); // Result message from proposal creation
  const [proposals, setProposals] = useState([]); // Array of DAO proposals
  const [voteResult, setVoteResult] = useState(''); // Result message from voting on a proposal
  const [graphLoading, setGraphLoading] = useState(true); // Loading state for price graph
  const [graphError, setGraphError] = useState(null); // Error message for graph loading failures

  // Automatically pre-fill the contract request input when a coin is selected
  useEffect(() => {
    if (selectedCoin) {
      setContractRequest(`Send 1 ETH for ${selectedCoin}`);
    }
  }, [selectedCoin]);

  // Check if user is logged in and subscribed; redirect if not
  const requireLoginOrSubscription = (returnPath = '/dashboard') => {
    if (!account) {
      navigate(`/login?return=${returnPath}`); // Redirect to login if no account
      return true;
    }
    if (subscription === 'free') {
      navigate('/subscribe'); // Redirect to subscription page if on free plan
      return true;
    }
    return false; // Proceed if logged in and subscribed
  };

  // Load initial dashboard data (news, top coins, analytics, graph) when account or selectedCoin changes
  useEffect(() => {
    let mounted = true; // Flag to prevent state updates after unmount
    setGraphLoading(true); // Start loading graph
    setGraphError(null); // Clear previous graph errors

    // Fetch news and top coins from the homepage API
    axios.get(`${BASE_URL}/api/`)
      .then((res) => {
        if (mounted) {
          setNews(res.data.news_items);
          setTopCoins(res.data.top_coins);
        }
      })
      .catch((err) => console.error('Home data error:', err));

    if (account) {
      // Fetch wallet analytics for the logged-in user
      axios.get(`${BASE_URL}/api/analytics/${account}`, { withCredentials: true })
        .then((res) => { if (mounted) setAnalytics(res.data); })
        .catch((err) => {
          console.error('Analytics error:', err);
          if (mounted) setAnalytics({ error: 'Analytics unavailable' });
        });

      // Fetch graph data for the selected coin directly inside useEffect
      const fetchGraph = async () => {
        setGraphLoading(true); // Indicate graph is loading
        setGraphError(null); // Clear any previous errors
        try {
          const response = await axios.get(`${BASE_URL}/api/coin_graph/${selectedCoin}`, { withCredentials: true });
          if (mounted) {
            setGraphData({
              labels: response.data.dates, // Dates for x-axis
              datasets: [
                {
                  label: `${selectedCoin.charAt(0).toUpperCase() + selectedCoin.slice(1)} Price`, // Coin name
                  data: response.data.prices, // Price data for y-axis
                  borderColor: coinOptions.find((c) => c.id === selectedCoin)?.color || '#ffffff', // Coin-specific color
                  fill: false, // No fill under the line
                  tension: 0.4, // Smooth the graph line
                },
              ],
            });
          }
        } catch (error) {
          console.error('Graph error:', error);
          if (mounted) setGraphError('Failed to load graph data. Please try again later.'); // Display error to user
        } finally {
          if (mounted) setGraphLoading(false); // Stop loading indicator
        }
      };
      fetchGraph(); // Execute the graph fetching logic
    }
    return () => { mounted = false; }; // Cleanup to prevent memory leaks
  }, [account, selectedCoin]); // Dependencies: re-run when account or selectedCoin changes

  // Create a smart contract by sending the request to the backend
  const createContract = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return; // Check login/subscription
    try {
      const response = await axios.post(
        `${BASE_URL}/api/create_contract`,
        new URLSearchParams({ contract_request: contractRequest }), // Form-encoded data
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setContractResult(response.data.message); // Display success message
    } catch (error) {
      setContractResult(error.response?.data?.message || 'Contract failed - check console!');
      console.error('Contract error:', error);
    }
  };

  // Create a DAO by sending name and description to the backend
  const createDao = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return;
    try {
      const response = await axios.post(
        `${BASE_URL}/api/create_dao`,
        new URLSearchParams({ dao_name: daoName, dao_description: daoDescription }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setDaoResult(response.data.message); // Display DAO creation result
      const addressMatch = response.data.message.match(/Address: (0x[a-fA-F0-9]{40})/); // Extract DAO address
      if (addressMatch) setDaoAddress(addressMatch[1]); // Set address for joining/voting
    } catch (error) {
      setDaoResult(error.response?.data?.error || 'Oops! Something went wrong. Try again later.');
      console.error('DAO error:', error);
    }
  };

  // Join a DAO by sending its address to the backend
  const joinDao = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return;
    if (!daoAddress) return alert('Please enter a DAO address!');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/join_dao`,
        new URLSearchParams({ dao_address: daoAddress }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setJoinResult(response.data.message); // Display join result
      fetchProposals(); // Load proposals after joining
    } catch (error) {
      setJoinResult(error.response?.data?.error || 'Sorry, we couldn’t join the DAO. Try again!');
      console.error('Join DAO error:', error);
    }
  };

  // Create a proposal for a DAO
  const createProposal = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return;
    if (!daoAddress) return alert('Please enter a DAO address!');
    if (!proposalDescription) return alert('Please enter a proposal description!');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/create_proposal`,
        new URLSearchParams({ dao_address: daoAddress, description: proposalDescription }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setProposalResult(response.data.message); // Display proposal result
      setProposalDescription(''); // Clear input
      fetchProposals(); // Refresh proposal list
    } catch (error) {
      setProposalResult(error.response?.data?.error || 'Sorry, we couldn’t create your proposal. Try again!');
      console.error('Create proposal error:', error);
    }
  };

  // Vote on a DAO proposal
  const voteOnProposal = async (proposalId, voteChoice) => {
    if (requireLoginOrSubscription()) return;
    if (!daoAddress) return alert('Please enter a DAO address!');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/vote`,
        new URLSearchParams({ dao_address: daoAddress, proposal_id: proposalId, vote: voteChoice }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setVoteResult(response.data.message); // Display vote result
      fetchProposals(); // Refresh proposals after voting
    } catch (error) {
      setVoteResult(error.response?.data?.error || 'Sorry, we couldn’t record your vote. Try again!');
      console.error('Vote error:', error);
    }
  };

  // Fetch all proposals for the current DAO
  const fetchProposals = async () => {
    if (!daoAddress || requireLoginOrSubscription()) return;
    try {
      const response = await axios.post(
        `${BASE_URL}/api/get_proposals`,
        new URLSearchParams({ dao_address: daoAddress }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setProposals(response.data.proposals || []); // Update proposal list
    } catch (error) {
      console.error('Fetch proposals error:', error);
      setProposals([]); // Clear proposals on error
    }
  };

  // Ask a crypto-related question and get an answer from the backend
  const askQuery = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return;
    try {
      const response = await axios.post(
        `${BASE_URL}/api/query`,
        new URLSearchParams({ question: query }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setQueryResult(response.data.answer); // Display query answer
    } catch (error) {
      setQueryResult(error.response?.data?.message || 'Query failed - check console!');
      console.error('Query error:', error);
    }
  };

  // Welcome banner for paid users (Basic or Pro plans)
  const welcomeBanner = subscription !== 'free' ? (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg mb-6 text-center">
      <p className="text-lg text-white">
        You are on the <span className="font-semibold capitalize">{subscription} Plan</span> -{' '}
        {subscription === 'basic' ? 'Unlimited contracts & basic analytics!' : 'Unlimited contracts, advanced analytics, & priority support!'}
      </p>
    </div>
  ) : null;

  // Determine what to display in the graph section based on loading, error, or data
  let graphContent;
  if (graphLoading) {
    graphContent = <p className="text-accent">Loading graph...</p>;
  } else if (graphError) {
    graphContent = <p className="text-red-400">{graphError}</p>;
  } else if (graphData) {
    graphContent = (
      <Line data={graphData} options={{ responsive: true, scales: { y: { beginAtZero: false } } }} /> // Render graph
    );
  } else {
    graphContent = <p className="text-accent">No graph data available.</p>;
  }

  // Render the dashboard UI
  return (
    <div className="bg-dark text-white min-h-screen p-4 overflow-hidden">
      {/* Header with welcome message */}
      <h1 className="text-4xl font-bold text-primary mb-4 text-center">
        {subscription !== 'free' ? 'Welcome to Your BlockSpeak Dashboard' : 'BlockSpeak Dashboard'}
      </h1>
      {/* Connection status and logout button */}
      <p className="text-accent mb-4 text-center">
        {account ? (
          <>
            Connected: {account.slice(0, 6)}...{account.slice(-4)} ({subscription})
            <button
              onClick={async () => {
                await logout(); // Logout user
                navigate('/'); // Redirect to homepage
              }}
              className="ml-2 text-blue-400 hover:underline"
            >
              Logout
            </button>
          </>
        ) : (
          'Not connected - log in to unlock all features!'
        )}
      </p>
      {welcomeBanner} {/* Display welcome banner for paid users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {/* Form to create a smart contract */}
          <form onSubmit={createContract} className="mb-4">
            <input
              type="text"
              value={contractRequest}
              onChange={(e) => setContractRequest(e.target.value)}
              placeholder="e.g., Send 1 ETH to 0x123..."
              className="w-full p-2 mb-2 text-dark rounded border border-accent"
              disabled={!account || subscription === 'free'} // Disable if not logged in or on free plan
            />
            <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
              Create Contract
            </button>
          </form>
          {contractResult && <p className="text-accent mb-4">{contractResult}</p>}

          {/* DAO creation section */}
          <div className="bg-gray-800 p-4 rounded mb-4">
            <h2 className="text-xl font-bold text-primary">What is a DAO?</h2>
            <p className="text-accent">
              It is an online club you control with blockchain! Start now, it is so easy.
            </p>
            <p className="text-accent mt-2">
              Just pick a name and describe what your group is for!
            </p>
            <form onSubmit={createDao} className="mt-4">
              <label className="block text-accent mb-1">Group Name (e.g., MyArtClub or FamilyFund)</label>
              <input
                type="text"
                value={daoName}
                onChange={(e) => setDaoName(e.target.value)}
                placeholder="e.g., MyArtClub"
                className="w-full p-2 mb-2 text-dark rounded border border-accent"
                disabled={!account || subscription === 'free'}
              />
              <label className="block text-accent mb-1">What is Your Group About? (e.g., A group for artists)</label>
              <textarea
                value={daoDescription}
                onChange={(e) => setDaoDescription(e.target.value)}
                placeholder="e.g., A group for artists to share work"
                className="w-full p-2 mb-2 text-dark rounded border border-accent"
                disabled={!account || subscription === 'free'}
              />
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Start My Group
              </button>
            </form>
            {daoResult && (
              <p className={daoResult.includes('DAO Created!') ? 'text-green-400' : 'text-red-400'}>{daoResult}</p>
            )}
            {daoResult.includes('DAO Created!') && (
              <p className="text-accent mt-2">
                Great job! Your group is live at {daoResult.split('Address: ')[1]}. Share this with friends to join!
              </p>
            )}
          </div>

          {/* DAO joining and proposal management */}
          <div className="bg-gray-800 p-4 rounded mb-4">
            <h2 className="text-xl font-bold text-primary">Join & Manage Your Group</h2>
            <p className="text-accent">
              Enter your DAO address to join as a member, propose ideas, and vote on decisions!
            </p>
            <form onSubmit={joinDao} className="mt-4">
              <label className="block text-accent mb-1">DAO Address</label>
              <input
                type="text"
                value={daoAddress}
                onChange={(e) => setDaoAddress(e.target.value)}
                placeholder="e.g., 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
                className="w-full p-2 mb-2 text-dark rounded border border-accent"
                disabled={!account || subscription === 'free'}
              />
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Join Group
              </button>
            </form>
            {joinResult && (
              <p className={joinResult.includes('Joined DAO') ? 'text-green-400' : 'text-red-400'}>{joinResult}</p>
            )}
            {joinResult.includes('Joined DAO') && (
              <>
                {/* Form to propose an idea */}
                <form onSubmit={createProposal} className="mt-4">
                  <label className="block text-accent mb-1">Propose an Idea (e.g., Host an art event)</label>
                  <input
                    type="text"
                    value={proposalDescription}
                    onChange={(e) => setProposalDescription(e.target.value)}
                    placeholder="e.g., Host an art event"
                    className="w-full p-2 mb-2 text-dark rounded border border-accent"
                    disabled={!account || subscription === 'free'}
                  />
                  <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                    Propose Idea
                  </button>
                </form>
                {proposalResult && (
                  <p className={proposalResult.includes('Proposal created!') ? 'text-green-400' : 'text-red-400'}>{proposalResult}</p>
                )}
                {/* Display list of proposals */}
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-primary">Group Ideas</h3>
                  {proposals.length > 0 ? (
                    proposals.map((proposal) => (
                      <div key={proposal.id} className="bg-gray-700 p-3 rounded mt-2">
                        <p><strong>Idea #{proposal.id}:</strong> {proposal.description}</p>
                        <p>Proposed by: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</p>
                        <p>Votes: Yes ({proposal.yesVotes}) | No ({proposal.noVotes})</p>
                        <p>Status: {proposal.active ? 'Voting Open' : 'Voting Closed'}</p>
                        {proposal.active && (
                          <div className="mt-2">
                            <button
                              onClick={() => voteOnProposal(proposal.id, true)}
                              className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded mr-2"
                            >
                              Vote Yes
                            </button>
                            <button
                              onClick={() => voteOnProposal(proposal.id, false)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded"
                            >
                              Vote No
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-accent">No ideas yet—propose one above!</p>
                  )}
                </div>
                {voteResult && (
                  <p className={voteResult.includes('Voted') ? 'text-green-400' : 'text-red-400'}>{voteResult}</p>
                )}
              </>
            )}
          </div>

          {/* Wallet analytics display */}
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
          {/* Form to ask crypto-related questions */}
          <form onSubmit={askQuery} className="mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about crypto..."
              className="w-full p-2 mb-2 text-dark rounded border border-accent"
              disabled={!account || subscription === 'free'}
            />
            <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
              Ask
            </button>
          </form>
          {queryResult && <p className="text-accent mb-4">{queryResult}</p>}

          {/* Dropdown to select a coin for the price graph */}
          <div className="flex justify-center mb-4">
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded border border-accent"
            >
              {coinOptions.map((coin) => (
                <option key={coin.id} value={coin.id}>{coin.label}</option>
              ))}
            </select>
          </div>

          {/* Price graph display */}
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold text-primary">{selectedCoin.toUpperCase()} Price (7 Days)</h2>
            {graphContent}
          </div>
        </div>
      </div>

      {/* Top coins section */}
      <div className="mt-4">
        <h2 className="text-xl font-bold text-primary">Top Coins</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {topCoins.map((coin) => (
            <div key={coin.id} className="bg-gray-800 p-4 rounded">
              <img src={coin.image} alt={coin.name} className="w-8 h-8 mb-2" />
              <p>{coin.name}: ${coin.price}</p>
              <p>Market Cap: ${coin.market_cap}</p>
              <p className={coin.change > 0 ? 'text-green-400' : 'text-red-400'}>{coin.change}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Latest news section */}
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

export default Dashboard;
