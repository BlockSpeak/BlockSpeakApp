// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RecurringPayment {
    address public owner;          // User who deployed the contract
    address public recipient;      // Where ETH is sent
    address public feeAddress = 0x37558169d86748dA34eACC76eEa6b5AF787FF74c; // Your fee wallet
    uint256 public feePercentage = 1; // 1% fee per payment
    uint256 public amount;         // Amount sent to recipient (net of fee)
    uint256 public nextPayment;    // Timestamp of next scheduled payment
    uint256 public interval;       // Seconds between payments (e.g., 30 days)
    uint256 public dayOfMonth;     // Day of month for payment (1-31, 0 if not used)
    bool public isActive;          // Tracks if contract is active

    event PaymentSent(address indexed recipient, uint256 amount, uint256 timestamp);
    event FeeCollected(address indexed feeAddress, uint256 feeAmount);
    event Cancelled(address indexed owner, uint256 timestamp);

    constructor(address _recipient, uint256 _interval, uint256 _dayOfMonth) payable {
        require(_recipient != address(0), "Invalid recipient");
        require(_interval > 0 || _dayOfMonth > 0, "Must specify interval or day");
        require(_dayOfMonth <= 31, "Invalid day of month");

        owner = msg.sender;
        recipient = _recipient;
        interval = _interval;
        dayOfMonth = _dayOfMonth;
        isActive = true;

        uint256 feeAmount = (msg.value * feePercentage) / 100;
        uint256 recipientAmount = msg.value - feeAmount;
        amount = recipientAmount; // Store net amount for recurring payments

        payable(feeAddress).transfer(feeAmount);
        emit FeeCollected(feeAddress, feeAmount);

        payable(recipient).transfer(recipientAmount);
        emit PaymentSent(recipient, recipientAmount, block.timestamp);

        nextPayment = calculateNextPayment(block.timestamp);
    }

    function calculateNextPayment(uint256 fromTimestamp) internal view returns (uint256) {
        if (dayOfMonth > 0) {
            uint256 nextMonth = fromTimestamp + 30 days; // Rough month estimate
            uint256 month = ((nextMonth % 31556952) / 2629746) + 1; // Seconds in a month
            uint256 day = dayOfMonth;
            if (day > 28 && month == 2) day = 28; // February fix (simplified)
            if (day > 30 && (month == 4 || month == 6 || month == 9 || month == 11)) day = 30;
            return nextMonth - ((nextMonth % 86400) % day) + (day * 86400); // Adjust to day of month
        }
        return fromTimestamp + interval; // Simple interval if no day specified
    }

    function sendPayment() public payable {
        require(msg.sender == owner, "Only owner can send");
        require(isActive, "Contract inactive");
        require(block.timestamp >= nextPayment, "Too soon");
        require(msg.value >= (amount * (100 + feePercentage)) / 100, "Insufficient funds");

        uint256 feeAmount = (msg.value * feePercentage) / 100;
        uint256 recipientAmount = msg.value - feeAmount;

        nextPayment = calculateNextPayment(block.timestamp);

        payable(feeAddress).transfer(feeAmount);
        emit FeeCollected(feeAddress, feeAmount);

        (bool sent, ) = recipient.call{value: recipientAmount}("");
        require(sent, "Failed to send ETH");
        emit PaymentSent(recipient, recipientAmount, block.timestamp);
    }

    function cancel() public {
        require(msg.sender == owner, "Only owner can cancel");
        require(isActive, "Already cancelled");
        isActive = false;
        emit Cancelled(msg.sender, block.timestamp);
    }

    receive() external payable {}
}