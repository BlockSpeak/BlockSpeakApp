const hre = require("hardhat");

async function main() {
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update with new address
    const SkillNFT = await hre.ethers.getContractFactory("SkillNFT");
    const skillNFT = await SkillNFT.attach(contractAddress);

    console.log("Checking contract at:", contractAddress);
    for (let i = 1; i <= 3; i++) {
        try {
            const name = await skillNFT.skillNames(i);
            const price = await skillNFT.skillPrices(i);
            const owner = await skillNFT.ownerOf(i);
            console.log(`ID: ${i}, Name: ${name}, Price: ${hre.ethers.formatEther(price)} ETH, Owner: ${owner}`);
        } catch (error) {
            console.log(`ID: ${i} failed:`, error.message);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});