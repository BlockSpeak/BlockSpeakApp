// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RecurringPayment {
    address public owner;
    address public recipient;
    address public feeAddress = 0x37558169d86748dA34eACC76eEa6b5AF787FF74c; // Your fee wallet
    uint256 public feePercentage = 1; // 1% fee
    uint256 public amount;
    uint256 public lastPayment;
    uint256 public interval = 7 days;

    constructor(address _recipient) payable {
        owner = msg.sender;
        recipient = _recipient;
        uint256 feeAmount = (msg.value * feePercentage) / 100;
        uint256 recipientAmount = msg.value - feeAmount;
        payable(feeAddress).transfer(feeAmount);
        payable(recipient).transfer(recipientAmount);
        amount = recipientAmount; // Store net amount for recurring payments
        lastPayment = block.timestamp;
    }

    function sendPayment() public {
        require(msg.sender == owner, "Only owner can send");
        require(block.timestamp >= lastPayment + interval, "Too soon");
        lastPayment = block.timestamp;
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "Failed to send ETH");
    }

    receive() external payable {}
}