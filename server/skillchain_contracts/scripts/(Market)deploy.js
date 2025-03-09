const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    const SkillNFT = await hre.ethers.getContractFactory("SkillNFT");
    const skillNFT = await SkillNFT.deploy(deployer.address);
    await skillNFT.waitForDeployment();

    console.log("SkillNFT deployed to:", await skillNFT.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});