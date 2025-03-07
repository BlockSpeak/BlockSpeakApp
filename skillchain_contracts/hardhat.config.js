require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

module.exports = {
    solidity: "0.8.28", // Match your SkillNFT.sol version
    networks: {
        hardhat: {
            chainId: 31337
        }
    }
};