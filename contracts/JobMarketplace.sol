// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract JobMarketplace is ReentrancyGuard {
    enum Status { Open, Funded, Submitted, Completed, Rejected, Expired }

    struct Job {
        address client;
        address evaluator;
        address provider;
        uint256 budget;
        uint64 expiresAt;
        Status status;
        bytes32 deliverableRef;
        string description;
    }

    IERC20 public immutable token;
    Job[] public jobs;
    uint256 public jobCount;

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed evaluator, address provider, uint256 budget, uint64 expiresAt, string description);
    event ProviderSet(uint256 indexed jobId, address indexed provider);
    event JobFunded(uint256 indexed jobId, uint256 amount);
    event Submitted(uint256 indexed jobId, bytes32 deliverableRef);
    event Completed(uint256 indexed jobId, address indexed provider, bytes32 reason);
    event Rejected(uint256 indexed jobId, bytes32 reason);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);

    error NotClient();
    error NotEvaluator();
    error NotProvider();
    error EvaluatorRequired();
    error ProviderRequired();
    error ProviderAlreadySet();
    error InvalidState();
    error JobNotExpired();
    error ZeroBudget();
    error InvalidJob();

    constructor(address token_) {
        if (token_ == address(0)) revert InvalidJob();
        token = IERC20(token_);
    }

    function createJob(string calldata description, uint256 budget, address evaluator, address provider, uint64 expiresAt) external returns (uint256) {
        revert InvalidState();
    }

    function setProvider(uint256 jobId, address provider) external {
        revert InvalidState();
    }

    function fund(uint256 jobId) external {
        revert InvalidState();
    }

    function submit(uint256 jobId, bytes32 deliverableRef) external {
        revert InvalidState();
    }

    function complete(uint256 jobId, bytes32 reason) external {
        revert InvalidState();
    }

    function reject(uint256 jobId, bytes32 reason) external {
        revert InvalidState();
    }

    function claimRefund(uint256 jobId) external {
        revert InvalidState();
    }
}
