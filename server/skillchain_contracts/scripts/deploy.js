async function main() {
    const RecurringPayment = await ethers.getContractFactory("RecurringPayment");
    const contract = await RecurringPayment.deploy("0xRecipientAddressHere");
    await contract.deployed();
    console.log("Deployed to:", contract.address);
}
main().catch(console.error);