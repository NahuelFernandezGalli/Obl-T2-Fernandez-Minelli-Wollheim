// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiSig {

    address[] public signers;
    uint256 public threshold;

    mapping(address => bool) public isSigner;

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes data;
        uint256 approvals;
        bool executed;
        bool cancelled;
    }

    Proposal[] public proposals;

    mapping(uint256 => mapping(address => bool))
        public approvedBy;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address target,
        uint256 value
    );

    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed signer
    );

    event ProposalExecuted(
        uint256 indexed proposalId
    );

    event ProposalCancelled(
        uint256 indexed proposalId
    );

    modifier onlySigner() {
        require(
            isSigner[msg.sender],
            "Not signer"
        );
        _;
    }

    constructor(
        address[] memory _signers,
        uint256 _threshold
    ) {
        require(
            _signers.length > 0,
            "No signers"
        );

        require(
            _threshold > 0 &&
            _threshold <= _signers.length,
            "Invalid threshold"
        );

        for (uint256 i = 0; i < _signers.length; i++) {

            address signer = _signers[i];

            require(
                signer != address(0),
                "Zero address"
            );

            require(
                !isSigner[signer],
                "Duplicate signer"
            );

            isSigner[signer] = true;
            signers.push(signer);
        }

        threshold = _threshold;
    }

    function propose(
        address target,
        uint256 value,
        bytes calldata data
    )
        external
        onlySigner
    {
        proposals.push(
            Proposal({
                proposer: msg.sender,
                target: target,
                value: value,
                data: data,
                approvals: 0,
                executed: false,
                cancelled: false
            })
        );

        emit ProposalCreated(
            proposals.length - 1,
            msg.sender,
            target,
            value
        );
    }

    function approve(
        uint256 proposalId
    )
        external
        onlySigner
    {
        require(
            proposalId < proposals.length,
            "Invalid proposal"
        );

        Proposal storage proposal =
            proposals[proposalId];

        require(
            !proposal.executed,
            "Already executed"
        );

        require(
            !proposal.cancelled,
            "Cancelled"
        );

        require(
            !approvedBy[proposalId][msg.sender],
            "Already approved"
        );

        approvedBy[proposalId][msg.sender] = true;
        proposal.approvals++;

        emit ProposalApproved(
            proposalId,
            msg.sender
        );
    }

    function execute(
        uint256 proposalId
    )
        external
        onlySigner
    {
        require(
            proposalId < proposals.length,
            "Invalid proposal"
        );

        Proposal storage proposal =
            proposals[proposalId];

        require(
            !proposal.executed,
            "Already executed"
        );

        require(
            !proposal.cancelled,
            "Cancelled"
        );

        require(
            proposal.approvals >= threshold,
            "Not enough approvals"
        );

        proposal.executed = true;

        (bool success,) =
            proposal.target.call{
                value: proposal.value
            }(proposal.data);

        require(
            success,
            "Execution failed"
        );

        emit ProposalExecuted(
            proposalId
        );
    }

    function cancel(
        uint256 proposalId
    )
        external
    {
        require(
            proposalId < proposals.length,
            "Invalid proposal"
        );

        Proposal storage proposal =
            proposals[proposalId];

        require(
            msg.sender == proposal.proposer,
            "Not proposer"
        );

        require(
            !proposal.executed,
            "Already executed"
        );

        require(
            !proposal.cancelled,
            "Already cancelled"
        );

        proposal.cancelled = true;

        emit ProposalCancelled(
            proposalId
        );
    }

    function getProposalCount()
        external
        view
        returns (uint256)
    {
        return proposals.length;
    }

    receive() external payable {}
}
