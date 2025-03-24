// Dashboard.jsx
// Purpose: Main user interface after login, displaying forms for smart contracts, DAOs, and crypto queries.
// Features: Price graphs, top coins, news, and DAO voting (join, propose, vote on ideas).
// Note: Wallet analytics is commented out as it’s not applicable with MetaMask-only authentication.

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Set default credentials for Axios to include cookies in requests (important for authentication)
axios.defaults.withCredentials = true;

// Register ChartJS components to enable graph rendering (e.g., scales, lines, tooltips)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Base URL: Switches between local testing and production environments
const BASE_URL = window.location.hostname === 'localhost' ? 'http://127.0.0.1:8080' : 'https://blockspeak.onrender.com';

// Array of coin options for the dropdown and graph, with IDs, labels, and colors
// Moved outside the component to ensure a stable reference and fix ESLint dependency warning
const coinOptions = [
  { id: 'bitcoin', label: 'Bitcoin (BTC)', color: '#2ecc71' },
  { id: 'ethereum', label: 'Ethereum (ETH)', color: '#3498db' },
  { id: 'solana', label: 'Solana (SOL)', color: '#9b59b6' },
];

// Main Dashboard component: Displays the user interface after login
// Props: account (user’s wallet address), logout (function to log out), subscription (user’s plan: free, basic, pro)
function Dashboard({ account, logout, subscription }) {
  const navigate = useNavigate();
  const location = useLocation();

  // State variables for managing dashboard data and UI interactions
  const [selectedCoin, setSelectedCoin] = useState(location.state?.selectedCoin || 'bitcoin');
  const [contractRequest, setContractRequest] = useState('');
  const [contractResult, setContractResult] = useState('');
  const [txStatus, setTxStatus] = useState(''); // 'confirmed', 'done', or 'failed'
  const [contracts, setContracts] = useState([]); // Track deployed contracts
  const [news, setNews] = useState([]);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const [topCoins, setTopCoins] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [daoName, setDaoName] = useState('');
  const [daoDescription, setDaoDescription] = useState('');
  const [daoResult, setDaoResult] = useState('');
  const [daoAddress, setDaoAddress] = useState('');
  const [joinResult, setJoinResult] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalResult, setProposalResult] = useState('');
  const [proposals, setProposals] = useState([]);
  const [voteResult, setVoteResult] = useState('');
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(null);

  // Fetch existing contracts
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/user_contracts`, { withCredentials: true });
        setContracts(response.data.contracts || []);
      } catch (error) {
        console.error('Fetch contracts error:', error);
      }
    };
    if (account) fetchContracts();
  }, [account]);

  // Load initial dashboard data
  useEffect(() => {
    let mounted = true;
    setGraphLoading(true);
    setGraphError(null);

    axios.get(`${BASE_URL}/api/`)
      .then((res) => {
        if (mounted) {
          setNews(res.data.news_items);
          setTopCoins(res.data.top_coins);
        }
      })
      .catch((err) => console.error('Home data error:', err));

    if (account) {
      const fetchGraph = async () => {
        setGraphLoading(true);
        setGraphError(null);
        try {
          const response = await axios.get(`${BASE_URL}/api/coin_graph/${selectedCoin}`, { withCredentials: true });
          if (mounted) {
            setGraphData({
              labels: response.data.dates,
              datasets: [{
                label: `${selectedCoin.charAt(0).toUpperCase() + selectedCoin.slice(1)} Price`,
                data: response.data.prices,
                borderColor: coinOptions.find((c) => c.id === selectedCoin)?.color || '#ffffff',
                fill: false,
                tension: 0.4,
              }],
            });
          }
        } catch (error) {
          console.error('Graph error:', error);
          if (mounted) setGraphError('Failed to load graph data. Please try again later.');
        } finally {
          if (mounted) setGraphLoading(false);
        }
      };
      fetchGraph();
    }
    return () => { mounted = false; };
  }, [account, selectedCoin]);

  const requireLoginOrSubscription = (returnPath = '/dashboard') => {
    if (!account) {
      navigate(`/login?return=${returnPath}`);
      return true;
    }
    if (subscription === 'free') {
      navigate('/subscribe');
      return true;
    }
    return false;
  };

  const createContract = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return;
    try {
      const response = await axios.post(
        `${BASE_URL}/api/create_contract`,
        new URLSearchParams({ contract_request: contractRequest }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setContractResult(response.data.message);
      setTxStatus('confirmed');
      // Refresh contracts list after successful creation
      const contractsResponse = await axios.get(`${BASE_URL}/api/user_contracts`, { withCredentials: true });
      setContracts(contractsResponse.data.contracts || []);
      setContractRequest(''); // Clear input field
    } catch (error) {
      setContractResult(error.response?.data?.message || 'Contract failed - check console!');
      setTxStatus('failed');
      console.error('Contract error:', error);
    }
  };

  const sendPayment = async (contractAddress) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/send_payment`,
        new URLSearchParams({ contract_address: contractAddress }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
      );
      setContractResult(response.data.message);
      setTxStatus('confirmed');
      // Refresh contracts list
      const contractsResponse = await axios.get(`${BASE_URL}/api/user_contracts`, { withCredentials: true });
      setContracts(contractsResponse.data.contracts || []);
    } catch (error) {
      setContractResult(error.response?.data?.message || 'Payment failed - check console!');
      setTxStatus('failed');
      console.error('Payment error:', error);
    }
  };

  const cancelContract = async (contractAddress) => {
    if (window.confirm('Are you sure you want to cancel this recurring payment?')) {
      try {
        const response = await axios.post(
          `${BASE_URL}/api/cancel_contract`,
          new URLSearchParams({ contract_address: contractAddress, confirmation: 'true' }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true },
        );
        setContractResult(response.data.message);
        setTxStatus('confirmed');
        // Refresh contracts list after cancellation
        const contractsResponse = await axios.get(`${BASE_URL}/api/user_contracts`, { withCredentials: true });
        setContracts(contractsResponse.data.contracts || []);
      } catch (error) {
        setContractResult(error.response?.data?.message || 'Cancellation failed - check console!');
        setTxStatus('failed');
        console.error('Cancel error:', error);
      }
    }
  };

  const createDao = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return;
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
      setJoinResult(response.data.message);
      fetchProposals();
    } catch (error) {
      setJoinResult(error.response?.data?.error || 'Sorry, we couldn’t join the DAO. Try again!');
      console.error('Join DAO error:', error);
    }
  };

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
      setProposalResult(response.data.message);
      setProposalDescription('');
      fetchProposals();
    } catch (error) {
      setProposalResult(error.response?.data?.error || 'Sorry, we couldn’t create your proposal. Try again!');
      console.error('Create proposal error:', error);
    }
  };

  const voteOnProposal = async (proposalId, voteChoice) => {
    if (requireLoginOrSubscription()) return;
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

  const fetchProposals = async () => {
    if (!daoAddress || requireLoginOrSubscription()) return;
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

  const askQuery = async (e) => {
    e.preventDefault();
    if (requireLoginOrSubscription()) return;
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

  const welcomeBanner = subscription !== 'free' ? (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg mb-6 text-center">
      <p className="text-lg text-white">
        You are on the <span className="font-semibold capitalize">{subscription} Plan</span> -{' '}
        {subscription === 'basic' ? 'Unlimited contracts & basic features!' : 'Unlimited contracts, advanced features, & priority support!'}
      </p>
    </div>
  ) : null;

  let graphContent;
  if (graphLoading) {
    graphContent = <p className="text-accent">Loading graph...</p>;
  } else if (graphError) {
    graphContent = <p className="text-red-400">{graphError}</p>;
  } else if (graphData) {
    graphContent = (
      <Line data={graphData} options={{ responsive: true, scales: { y: { beginAtZero: false } } }} />
    );
  } else {
    graphContent = <p className="text-accent">No graph data available.</p>;
  }

  const getContractResultClasses = () => {
    let classes = 'text-accent mb-4';
    if (txStatus === 'confirmed') {
      classes += ' animate-pulse text-green-400';
    } else if (txStatus === 'failed') {
      classes += ' text-red-400';
    }
    return classes;
  };

  return (
    <div className="bg-dark text-white min-h-screen p-4 overflow-hidden">
      <h1 className="text-4xl font-bold text-primary mb-4 text-center">
        {subscription !== 'free' ? 'Welcome to Your BlockSpeak Dashboard' : 'BlockSpeak Dashboard'}
      </h1>
      <p className="text-accent mb-4 text-center">
        {account ? (
          <>
            Connected: {account.slice(0, 6)}...{account.slice(-4)} ({subscription})
            <button onClick={async () => { await logout(); navigate('/'); }} className="ml-2 text-blue-400 hover:underline">
              Logout
            </button>
          </>
        ) : (
          'Not connected - log in to unlock all features!'
        )}
      </p>
      {welcomeBanner}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <form onSubmit={createContract} className="mb-4">
            <input
              type="text"
              value={contractRequest}
              onChange={(e) => setContractRequest(e.target.value)}
              placeholder="e.g., Send 1 ETH to 0x123 every month on the 30th"
              className="w-full p-2 mb-2 text-dark rounded border border-accent"
              disabled={!account || subscription === 'free'}
            />
            <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
              Create Recurring Payment
            </button>
          </form>
          {contractResult && (
            <p className={getContractResultClasses()}>
              {contractResult}
              {txStatus === 'confirmed' && setTimeout(() => setTxStatus('done'), 2000) && null}
            </p>
          )}
          {txStatus === 'done' && <p className="text-green-400 mb-4">Success</p>}

          {/* Display existing contracts */}
          <div className="bg-gray-800 p-4 rounded mb-4">
            <h2 className="text-xl font-bold text-primary">Your Recurring Payments</h2>
            {contracts.length > 0 ? (
              contracts.map((contract) => (
                <div key={contract.address} className="bg-gray-700 p-3 rounded mt-2">
                  <p>Recipient: {contract.recipient.slice(0, 6)}...{contract.recipient.slice(-4)}</p>
                  <p>Amount: {contract.amount} ETH</p>
                  <p>Next Payment: {new Date(contract.next_payment * 1000).toLocaleDateString()}</p>
                  <p>Status: {contract.is_active ? 'Active' : 'Cancelled'}</p>
                  {contract.is_active && (
                    <div className="mt-2">
                      <button
                        onClick={() => sendPayment(contract.address)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded mr-2"
                      >
                        Send Now
                      </button>
                      <button
                        onClick={() => cancelContract(contract.address)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-accent">No recurring payments yet—create one above!</p>
            )}
          </div>

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
        </div>
        <div>
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

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold text-primary">{selectedCoin.toUpperCase()} Price (7 Days)</h2>
            {graphContent}
          </div>
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
              <p className={coin.change > 0 ? 'text-green-400' : 'text-red-400'}>{coin.change}%</p>
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

export default Dashboard;
