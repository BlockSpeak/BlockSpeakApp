const { ethers } = require("hardhat");

async function main() {
  const accounts = await ethers.getSigners();
  for (let i = 0; i < accounts.length; i++) {
    const address = await accounts[i].getAddress();
    const balance = await ethers.provider.getBalance(address);
    const privateKey = ethers.Wallet.fromAddress(address).privateKey;
    console.log(`Account #${i}: ${address} (Balance: ${ethers.utils.formatEther(balance)} ETH)`);
    console.log(`Private Key: ${privateKey}`);
    console.log("---");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});