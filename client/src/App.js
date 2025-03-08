import React, { useState } from 'react';
import Web3 from 'web3';
import './App.css';

function App() {
    const [account, setAccount] = useState(null);
    const [contractRequest, setContractRequest] = useState('');
    const [contractResult, setContractResult] = useState('');

    const loginWithMetaMask = async () => {
        if (!window.ethereum) {
            alert('Please install MetaMask!');
            return;
        }
        try {
            const web3 = new Web3(window.ethereum);
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            const nonce = await fetch('https://blockspeak.onrender.com/nonce').then(res => res.text());
            const message = `Log in to BlockSpeak: ${nonce}`;
            const signature = await web3.eth.personal.sign(message, address);
            const response = await fetch('https://blockspeak.onrender.com/login/metamask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, signature })
            });
            if (response.ok) {
                setAccount(address);
            } else {
                alert('Login failed');
            }
        } catch (error) {
            console.error('MetaMask login error:', error);
        }
    };

    const createContract = async (e) => {
        e.preventDefault();
        if (!account) {
            alert('Please log in first!');
            return;
        }
        try {
            const response = await fetch('https://blockspeak.onrender.com/create_contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ contract_request: contractRequest })
            });
            const text = await response.text();
            setContractResult(text); // For now, just display raw HTML; we'll parse it later
        } catch (error) {
            console.error('Contract creation error:', error);
            setContractResult('Error creating contract');
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold text-purple-500 mb-4">BlockSpeak</h1>
            {account ? (
                <p className="text-green-400 mb-4">Connected: {account}</p>
            ) : (
                <button
                    onClick={loginWithMetaMask}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mb-4"
                >
                    Login with MetaMask
                </button>
            )}
            {account && (
                <form onSubmit={createContract} className="w-full max-w-md">
                    <input
                        type="text"
                        value={contractRequest}
                        onChange={(e) => setContractRequest(e.target.value)}
                        placeholder="e.g., Send 1 ETH to Bob every Friday"
                        className="w-full p-2 mb-2 text-black rounded"
                    />
                    <button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Create Contract
                    </button>
                </form>
            )}
            {contractResult && (
                <div className="mt-4 text-left" dangerouslySetInnerHTML={{ __html: contractResult }} />
            )}
        </div>
    );
}

export default App;