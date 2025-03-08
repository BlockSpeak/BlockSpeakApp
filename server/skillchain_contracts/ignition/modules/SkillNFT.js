const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");

module.exports = buildModule("SkillNFTModule", (m) => {
    const feeRecipient = m.getAccount(0);
    const skillNFT = m.contract("SkillNFT", [feeRecipient]);

    m.tx(skillNFT, "mintSkill", ["Coding", ethers.utils.parseEther("1")], { id: "MintCoding" });
    m.tx(skillNFT, "mintSkill", ["Design", ethers.utils.parseEther("0.5")], { id: "MintDesign" });
    m.tx(skillNFT, "mintSkill", ["Writing", ethers.utils.parseEther("0.2")], { id: "MintWriting" });

    return { skillNFT };
});