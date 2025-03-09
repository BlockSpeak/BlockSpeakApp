// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RecurringPayment {
    address public owner;
    address public recipient;
    uint256 public amount;
    uint256 public lastPayment;
    uint256 public interval = 7 days;

    constructor(address _recipient) payable {
        owner = msg.sender;
        recipient = _recipient;
        amount = 1 ether;
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