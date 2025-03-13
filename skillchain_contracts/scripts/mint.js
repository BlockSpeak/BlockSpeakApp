const hre = require("hardhat");

async function main() {
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // From deploy.js
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