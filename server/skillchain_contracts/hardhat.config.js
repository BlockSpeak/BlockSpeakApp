require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

module.exports = {
    solidity: "0.8.28", // Matches SkillNFT.sol, works with ^0.8.0
    networks: {
        hardhat: {
            chainId: 31337
        }
    },
    paths: {
        sources: "./contracts",    // Look here for .sol files
        artifacts: "./artifacts"   // Output here
    }
};