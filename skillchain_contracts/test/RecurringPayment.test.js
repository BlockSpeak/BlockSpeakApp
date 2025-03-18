const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RecurringPayment Contract", function () {
  let RecurringPayment;
  let recurringPayment;
  let owner;
  let recipient;
  let feeAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Hardhat default account 2

  beforeEach(async function () {
    [owner, recipient] = await ethers.getSigners();
    RecurringPayment = await ethers.getContractFactory("RecurringPayment");
    recurringPayment = await RecurringPayment.deploy(recipient.address, {
      value: ethers.utils.parseEther("1"), // Send 1 ETH during deployment
    });
    await recurringPayment.deployed();
  });

  it("Should split the initial payment correctly", async function () {
    const initialBalanceRecipient = await ethers.provider.getBalance(recipient.address);
    const initialBalanceFee = await ethers.provider.getBalance(feeAddress);

    const feeAmount = ethers.utils.parseEther("0.01"); // 1% of 1 ETH
    const recipientAmount = ethers.utils.parseEther("0.99"); // 99% of 1 ETH

    expect(await ethers.provider.getBalance(recipient.address)).to.equal(
      initialBalanceRecipient.add(recipientAmount)
    );
    expect(await ethers.provider.getBalance(feeAddress)).to.equal(
      initialBalanceFee.add(feeAmount)
    );
  });

  it("Should set the correct amount for recurring payments", async function () {
    const amount = await recurringPayment.amount();
    expect(amount).to.equal(ethers.utils.parseEther("0.99")); // After fee deduction
  });

  it("Should allow owner to send recurring payments", async function () {
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // Fast-forward 7 days
    await ethers.provider.send("evm_mine"); // Mine a new block

    const initialBalanceRecipient = await ethers.provider.getBalance(recipient.address);
    await recurringPayment.sendPayment();
    const finalBalanceRecipient = await ethers.provider.getBalance(recipient.address);

    expect(finalBalanceRecipient).to.equal(
      initialBalanceRecipient.add(ethers.utils.parseEther("0.99"))
    );
  });
});