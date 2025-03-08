const hre = require("hardhat");

async function main() {
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const SkillNFT = await hre.ethers.getContractFactory("SkillNFT");
    const skillNFT = await SkillNFT.attach(contractAddress);

    console.log("Checking skills...");
    for (let i = 1; i <= 3; i++) {
        const name = await skillNFT.skillNames(i);
        const price = await skillNFT.skillPrices(i);
        console.log(`ID: ${i}, Name: ${name}, Price: ${hre.ethers.formatEther(price)} ETH`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});