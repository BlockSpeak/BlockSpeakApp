require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

module.exports = {
    solidity: "0.8.28", // Matches SkillNFT.sol
    networks: {
        hardhat: {
            chainId: 31337
        },
        sepolia: {
            url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 11155111
        }
    },
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts"
    }
};