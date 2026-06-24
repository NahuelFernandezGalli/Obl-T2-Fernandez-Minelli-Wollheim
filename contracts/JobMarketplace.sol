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
        if (evaluator == address(0)) revert EvaluatorRequired();
        if (budget == 0) revert ZeroBudget();

        uint256 jobId = jobs.length;
        jobs.push(Job({
            client: msg.sender,
            evaluator: evaluator,
            provider: provider,
            budget: budget,
            expiresAt: expiresAt,
            status: Status.Open,
            deliverableRef: bytes32(0),
            description: description
        }));
        jobCount++;

        emit JobCreated(jobId, msg.sender, evaluator, provider, budget, expiresAt, description);
        return jobId;
    }

    function setProvider(uint256 jobId, address provider) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.client) revert NotClient();
        if (job.status != Status.Open) revert InvalidState();
        if (job.provider != address(0)) revert ProviderAlreadySet();

        job.provider = provider;
        emit ProviderSet(jobId, provider);
    }

    function _job(uint256 jobId) internal view returns (Job storage) {
        if (jobId >= jobs.length) revert InvalidJob();
        return jobs[jobId];
    }

    function fund(uint256 jobId) external nonReentrant {
        Job storage job = _job(jobId);
        if (msg.sender != job.client) revert NotClient();
        if (job.status != Status.Open) revert InvalidState();
        if (job.provider == address(0)) revert ProviderRequired();

        uint256 amount = job.budget;
        job.status = Status.Funded;

        token.transferFrom(msg.sender, address(this), amount);
        emit JobFunded(jobId, amount);
    }

    function submit(uint256 jobId, bytes32 deliverableRef) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.provider) revert NotProvider();
        if (job.status != Status.Funded) revert InvalidState();

        job.status = Status.Submitted;
        job.deliverableRef = deliverableRef;

        emit Submitted(jobId, deliverableRef);
    }

    function complete(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = _job(jobId);
        if (msg.sender != job.evaluator) revert NotEvaluator();
        if (job.status != Status.Submitted) revert InvalidState();

        address provider = job.provider;
        uint256 amount = job.budget;
        job.status = Status.Completed;

        token.transfer(provider, amount);
        emit Completed(jobId, provider, reason);
    }

    function reject(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = _job(jobId);
        Status status = job.status;

        if (status == Status.Open) {
            if (msg.sender != job.client) revert NotClient();
        } else if (status == Status.Funded || status == Status.Submitted) {
            if (msg.sender != job.evaluator) revert NotEvaluator();
        } else {
            revert InvalidState();
        }

        address client = job.client;
        uint256 amount = job.budget;
        bool wasFunded = (status == Status.Funded || status == Status.Submitted);
        job.status = Status.Rejected;

        emit Rejected(jobId, reason);

        if (wasFunded) {
            token.transfer(client, amount);
            emit Refunded(jobId, client, amount);
        }
    }

    function claimRefund(uint256 jobId) external {
        revert InvalidState();
    }
}
