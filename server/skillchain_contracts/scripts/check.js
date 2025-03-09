const hre = require("hardhat");

async function main() {
    const contractAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
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