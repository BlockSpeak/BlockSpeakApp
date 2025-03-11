require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

module.exports = {
    solidity: "0.8.28", // Matches SkillNFT.sol and DAO.sol
    defaultNetwork: process.env.NETWORK || "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            accounts: [
                {
                    privateKey: process.env.HARDHAT_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
                    balance: "10000000000000000000000" // 10,000 ETH in wei for testing
                }
            ]
        },
        sepolia: {
            url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: [process.env.MAINNET_PRIVATE_KEY],
            chainId: 11155111
        },
        mainnet: {
            url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: [process.env.MAINNET_PRIVATE_KEY],
            chainId: 1
        }
    },
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts"
    }
};