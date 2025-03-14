// Dashboard.jsx
// Purpose: Main user interface after login, displaying forms for smart contracts, DAOs, and crypto queries.
// wallet analytics, price graphs, top coins, and news. Includes DAO voting: join, propose, and vote on ideas.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register ChartJS components for graphs
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Base URL switches between local testing and production
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

function Dashboard({ account, logout, subscription }) {
  const navigate = useNavigate(); // For redirecting to login or subscribe pages

  // State variables for various dashboard functionalities
  const [contractRequest, setContractRequest] = useState(''); // Input for creating a smart contract
  const [contractResult, setContractResult] = useState(''); // Result message from contract creation
  const [analytics, setAnalytics] = useState(null); // Wallet analytics data (balance, tx count, tokens)
  const [news, setNews] = useState([]); // Latest crypto news items
  const [query, setQuery] = useState(''); // Input for asking crypto-related questions
  const [queryResult, setQueryResult] = useState(''); // Result message from query
  const [topCoins, setTopCoins] = useState([]); // Top cryptocurrencies data
  const [graphData, setGraphData] = useState(null); // Bitcoin price graph data
  const [daoName, setDaoName] = useState(''); // Input for DAO name
  const [daoDescription, setDaoDescription] = useState(''); // Input for DAO description
  const [daoResult, setDaoResult] = useState(''); // Result message from DAO creation
  const [daoAddress, setDaoAddress] = useState(''); // Input for DAO address to join/vote
  const [joinResult, setJoinResult] = useState(''); // Result message from joining DAO
  const [proposalDescription, setProposalDescription] = useState(''); // Input for proposal description
  const [proposalResult, setProposalResult] = useState(''); // Result message from creating proposal
  const [proposals, setProposals] = useState([]); // List of proposals for the DAO
  const [voteResult, setVoteResult] = useState(''); // Result message from voting

  // requireLoginOrSubscription: Checks if the user is logged in and has a subscription
  // Redirects to login or subscribe page based on user status.
  const requireLoginOrSubscription = (returnPath = '/dashboard') => {
    if (!account) {
      navigate(`/login?return=${returnPath}`); // Redirect to login with return URL
      return true;
    }
    if (subscription === 'free') {
      navigate('/subscribe'); // Redirect to subscribe if on free plan
      return true;
    }
    return false; // User is authenticated and subscribed
  };

  // Function to create a smart contract
  // Sends a contract request to the backend (/api/create_contract) and displays the result.
  const createContract = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return; // Check login and subscription
    try {
      const response = await axios.post(
        `${BASE_URL}/api/create_contract`,
        new URLSearchParams({ contract_request: contractRequest }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setContractResult(response.data.message);
    } catch (error) {
      setContractResult(error.response?.data?.message || 'Contract failed - check console!');
      console.error('Contract error:', error);
    }
  };

  // Function to create a DAO
  // Sends DAO name and description to the backend (/api/create_dao) to deploy a DAO contract.
  const createDao = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return; // Check login and subscription
    try {
      const response = await axios.post(
        `${BASE_URL}/api/create_dao`,
        new URLSearchParams({ dao_name: daoName, dao_description: daoDescription }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setDaoResult(response.data.message);
      const addressMatch = response.data.message.match(/Address: (0x[a-fA-F0-9]{40})/);
      if (addressMatch) setDaoAddress(addressMatch[1]);
    } catch (error) {
      setDaoResult(error.response?.data?.error || 'Oops! Something went wrong. Try again later.');
      console.error('DAO error:', error);
    }
  };

  // Function to join a DAO
  // Sends the DAO address to the backend (/api/join_dao) to join as a member.
  const joinDao = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return; // Check login and subscription
    if (!daoAddress) return alert('Please enter a DAO address!');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/join_dao`,
        new URLSearchParams({ dao_address: daoAddress }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setJoinResult(response.data.message);
      fetchProposals();
    } catch (error) {
      setJoinResult(error.response?.data?.error || 'Sorry, we couldn’t join the DAO. Try again!');
      console.error('Join DAO error:', error);
    }
  };

  // Function to create a proposal
  // Sends the DAO address and proposal description to the backend (/api/create_proposal).
  const createProposal = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return; // Check login and subscription
    if (!daoAddress) return alert('Please enter a DAO address!');
    if (!proposalDescription) return alert('Please enter a proposal description!');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/create_proposal`,
        new URLSearchParams({ dao_address: daoAddress, description: proposalDescription }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setProposalResult(response.data.message);
      setProposalDescription('');
      fetchProposals();
    } catch (error) {
      setProposalResult(error.response?.data?.error || 'Sorry, we couldn’t create your proposal. Try again!');
      console.error('Create proposal error:', error);
    }
  };

  // Function to vote on a proposal
  // Sends the DAO address, proposal ID, and vote choice to the backend (/api/vote).
  const voteOnProposal = async (proposalId, voteChoice) => {
    if (requireLoginOrSubscription()) return; // Check login and subscription
    if (!daoAddress) return alert('Please enter a DAO address!');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/vote`,
        new URLSearchParams({ dao_address: daoAddress, proposal_id: proposalId, vote: voteChoice }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setVoteResult(response.data.message);
      fetchProposals();
    } catch (error) {
      setVoteResult(error.response?.data?.error || 'Sorry, we couldn’t record your vote. Try again!');
      console.error('Vote error:', error);
    }
  };

  // Function to fetch proposals for a DAO
  // Calls the backend (/api/get_proposals) to retrieve all proposals.
  const fetchProposals = async () => {
    if (!daoAddress || requireLoginOrSubscription()) return; // Check login and subscription
    try {
      const response = await axios.post(
        `${BASE_URL}/api/get_proposals`,
        new URLSearchParams({ dao_address: daoAddress }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setProposals(response.data.proposals || []);
    } catch (error) {
      console.error('Fetch proposals error:', error);
      setProposals([]);
    }
  };

  // Function to ask a crypto-related question
  // Sends a question to the backend (/api/query) and displays the LLM's answer.
  const askQuery = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return; // Check login and subscription
    try {
      const response = await axios.post(
        `${BASE_URL}/api/query`,
        new URLSearchParams({ question: query }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setQueryResult(response.data.answer);
    } catch (error) {
      setQueryResult(error.response?.data?.message || 'Query failed - check console!');
      console.error('Query error:', error);
    }
  };

  // Load initial data (news, coins, analytics, graph) when account changes
  // Fetches data from the backend to populate the dashboard with news, top coins, analytics, and Bitcoin price graph.
  useEffect(() => {
    let mounted = true;
    axios.get(`${BASE_URL}/api/`).then((res) => {
      if (mounted) {
        setNews(res.data.news_items);
        setTopCoins(res.data.top_coins);
      }
    }).catch((err) => console.error('Home data error:', err));

    if (account) {
      axios.get(`${BASE_URL}/api/analytics/${account}`, { withCredentials: true })
        .then((res) => { if (mounted) setAnalytics(res.data); })
        .catch((err) => {
          console.error('Analytics error:', err);
          if (mounted) setAnalytics({ error: 'Analytics unavailable' });
        });
      axios.get(`${BASE_URL}/api/coin_graph/bitcoin`, { withCredentials: true })
        .then((res) => {
          if (mounted) {
            setGraphData({
              labels: res.data.dates,
              datasets: [{
                label: 'Bitcoin Price',
                data: res.data.prices,
                borderColor: '#2ecc71',
                fill: false,
              }],
            });
          }
        })
        .catch((err) => console.error('Graph error:', err));
    }
    return () => { mounted = false; };
  }, [account]);

  // Welcome banner for paid users
  // Displays a banner for Basic or Pro plan users with their plan benefits.
  const welcomeBanner = subscription !== 'free' ? (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg mb-6 text-center">
      <p className="text-lg text-white">
        You are on the <span className="font-semibold capitalize">{subscription} Plan</span> -{' '}
        {subscription === 'basic' ? 'Unlimited contracts & basic analytics!' : 'Unlimited contracts, advanced analytics, & priority support!'}
      </p>
    </div>
  ) : null;

  return (
    <div className="bg-dark text-white min-h-screen p-4">
      <h1 className="text-4xl font-bold text-primary mb-4 text-center">
        {subscription !== 'free' ? 'Welcome to Your BlockSpeak Dashboard' : 'BlockSpeak Dashboard'}
      </h1>
      <p className="text-accent mb-4 text-center">
        {account ? (
          <>
            Connected: {account.slice(0, 6)}...{account.slice(-4)} ({subscription})
            <button onClick={logout} className="ml-2 text-blue-400 hover:underline">Logout</button>
          </>
        ) : (
          'Not connected - log in to unlock all features!'
        )}
      </p>
      {welcomeBanner}
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
              disabled={!account || subscription === 'free'} // Disable for unauthenticated or free users
            />
            <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
              Create Contract
            </button>
          </form>
          {contractResult && <p className="text-accent mb-4">{contractResult}</p>}

          {/* Section explaining DAOs and form to create a DAO */}
          <div className="bg-gray-800 p-4 rounded mb-4">
            <h2 className="text-xl font-bold text-primary">What is a DAO?</h2>
            <p className="text-accent">
              A Decentralized Autonomous Organization is like an online club you control with blockchain!
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

          {/* Section to join a DAO and manage proposals */}
          <div className="bg-gray-800 p-4 rounded mb-4">
            <h2 className="text-xl font-bold text-primary">Join & Manage Your Group</h2>
            <p className="text-accent">
              Enter your DAO address to join as a member, propose ideas, and vote on decisions!
            </p>
            <form onSubmit={joinDao} className="mt-4">
              <label className="block text-accent mb-1">DAO Address (e.g., 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853)</label>
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
                {/* Form to create a proposal */}
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
                {/* List of proposals */}
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

          {/* Bitcoin price graph */}
          {graphData && (
            <div className="bg-gray-800 p-4 rounded">
              <h2 className="text-xl font-bold text-primary">Bitcoin Price (7 Days)</h2>
              <Line data={graphData} options={{ responsive: true, scales: { y: { beginAtZero: false } } }} />
            </div>
          )}
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
