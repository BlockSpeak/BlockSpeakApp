// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DAO {
    string public name;
    string public description; // Contract-level description (e.g., DAO purpose)
    address public owner;
    mapping(address => bool) public members;
    uint256 public memberCount;

    struct Proposal {
        uint256 id;
        string description; // Proposal-specific description
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
        bool executed;
        bool active;
    }

    Proposal[] public proposals;
    uint256 public proposalCount;

    event MemberJoined(address member);
    event ProposalCreated(uint256 proposalId, string description, address proposer);
    event Voted(uint256 proposalId, address voter, bool vote);
    event ProposalExecuted(uint256 proposalId, bool passed);

    constructor(string memory _name, string memory _description) {
        name = _name;
        description = _description;
        owner = msg.sender;
        members[msg.sender] = true;
        memberCount = 1;
    }

    function join() external {
        require(!members[msg.sender], "Already a member");
        members[msg.sender] = true;
        memberCount++;
        emit MemberJoined(msg.sender);
    }

    function createProposal(string memory _description) external {
        require(members[msg.sender], "Must be a member to propose");
        Proposal storage newProposal = proposals.push();
        newProposal.id = proposalCount;
        newProposal.description = _description;
        newProposal.proposer = msg.sender;
        newProposal.yesVotes = 0;
        newProposal.noVotes = 0;
        newProposal.active = true;
        newProposal.executed = false;
        proposalCount++;
        emit ProposalCreated(newProposal.id, _description, msg.sender);
    }

    function vote(uint256 _proposalId, bool _vote) external {
        require(members[msg.sender], "Must be a member to vote");
        require(_proposalId < proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal is not active");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        proposal.hasVoted[msg.sender] = true;
        if (_vote) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
        emit Voted(_proposalId, msg.sender, _vote);
    }

    function executeProposal(uint256 _proposalId) external {
        require(msg.sender == owner, "Only owner can execute");
        require(_proposalId < proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal already closed");
        proposal.active = false;
        proposal.executed = true;
        bool passed = proposal.yesVotes > proposal.noVotes;
        emit ProposalExecuted(_proposalId, passed);
    }

    function getProposal(uint256 _proposalId) external view returns (
        string memory proposalDescription, // Renamed to avoid shadowing
        address proposer,
        uint256 yesVotes,
        uint256 noVotes,
        bool active,
        bool executed
    ) {
        require(_proposalId < proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.description, // Returns proposal description, not contract description
            proposal.proposer,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.active,
            proposal.executed
        );
    }
}