// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SkillNFT is ERC721, Ownable {
    uint256 private _tokenIds;
    mapping(uint256 => uint256) public skillPrices;
    mapping(uint256 => string) public skillNames;
    uint256 public platformFee = 10;
    address public feeRecipient;

    event SkillListed(uint256 tokenId, string name, uint256 price, address owner);
    event SkillBought(uint256 tokenId, address seller, address buyer, uint256 totalAmount, uint256 fee);

    error TokenDoesNotExist();
    error InsufficientPayment();

    constructor(address _feeRecipient) ERC721("SkillChain", "SKC") Ownable(_feeRecipient) {
        feeRecipient = _feeRecipient;
        _tokenIds = 0;
    }

    function mintSkill(string memory name, uint256 price) public onlyOwner returns (uint256) {
        _tokenIds = _tokenIds + 1;
        uint256 newTokenId = _tokenIds;
        _mint(msg.sender, newTokenId);
        skillPrices[newTokenId] = price;
        skillNames[newTokenId] = name;
        emit SkillListed(newTokenId, name, price, msg.sender);
        return newTokenId;
    }

    function buySkill(uint256 tokenId) public payable {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        if (msg.value < skillPrices[tokenId]) revert InsufficientPayment();
        address owner = ownerOf(tokenId);
        uint256 fee = (msg.value * platformFee) / 100;
        uint256 sellerAmount = msg.value - fee;
        _transfer(owner, msg.sender, tokenId);
        payable(owner).transfer(sellerAmount);
        payable(feeRecipient).transfer(fee);
        emit SkillBought(tokenId, owner, msg.sender, msg.value, fee);
    }

    function getSkill(uint256 tokenId) public view returns (string memory name, uint256 price, address owner) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return (skillNames[tokenId], skillPrices[tokenId], ownerOf(tokenId));
    }
}