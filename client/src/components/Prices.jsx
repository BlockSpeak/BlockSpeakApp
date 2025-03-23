import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Prices() {
  const [topCoins, setTopCoins] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Switch between localhost and Render based on environment
    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://127.0.0.1:8080/api/prices'
      : 'https://blockspeak.onrender.com/api/prices';

    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => setTopCoins(data.top_coins))
      .catch((err) => console.error('Error fetching prices:', err));
  }, []);

  const handleTrade = (coinName) => {
    // Navigate to dashboard and pass the coin name for graph selection, no auto-fill
    navigate('/dashboard', { state: { selectedCoin: coinName.toLowerCase() } });
  };

  return (
    <div className="prices-page p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-purple-400">Cryptocurrency Prices</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {topCoins.map((coin) => (
          <div key={coin.id} className="coin-card bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img src={coin.image} alt={coin.name} className="w-10 h-10 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-purple-400">{coin.name}</h2>
                  <p className="text-gray-400">{coin.symbol}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-lg">Price: ${coin.price}</p>
            <p className="text-lg">Market Cap: ${coin.market_cap}</p>
            <p className={`text-lg ${coin.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
              24h Change: {coin.change}%
            </p>
            <button
              onClick={() => handleTrade(coin.name)}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Trade
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Prices;
