const hre = require("hardhat");

async function main() {
    const contractAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"; // From deploy.js
    const SkillNFT = await hre.ethers.getContractFactory("SkillNFT");
    const skillNFT = await SkillNFT.attach(contractAddress);

    console.log("Minting skills...");
    await skillNFT.mintSkill("Coding", hre.ethers.parseEther("1"));
    await skillNFT.mintSkill("Design", hre.ethers.parseEther("0.5"));
    await skillNFT.mintSkill("Writing", hre.ethers.parseEther("0.2"));
    console.log("Minted 3 skills!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});