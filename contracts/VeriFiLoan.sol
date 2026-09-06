// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Loan registry. Only the platform wallet can create / update status.
contract VeriFiLoan {
    enum LoanStatus {
        Pending,
        Approved,
        Disbursed,
        Repaid,
        Defaulted,
        Rejected
    }

    struct Loan {
        bytes32 offChainId;
        address borrower;
        uint256 amountCents;
        uint256 interestRateBps;
        uint256 termMonths;
        uint256 monthlyPaymentCents;
        LoanStatus status;
        uint64 createdAt;
        uint64 approvedAt;
        uint64 disbursedAt;
    }

    address public owner;
    address public platform;
    uint256 public nextLoanId = 1;

    mapping(uint256 => Loan) public loans;
    mapping(bytes32 => uint256) public offChainIdToLoanId;
    mapping(address => uint256[]) private _borrowerLoans;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlatformUpdated(address indexed previousPlatform, address indexed newPlatform);
    event LoanCreated(
        uint256 indexed loanId,
        bytes32 indexed offChainId,
        address indexed borrower,
        uint256 amountCents,
        uint256 interestRateBps,
        uint256 termMonths
    );
    event LoanStatusUpdated(uint256 indexed loanId, LoanStatus previousStatus, LoanStatus newStatus);

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error LoanExists();
    error LoanNotFound();
    error InvalidStatusTransition(LoanStatus from, LoanStatus to);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyPlatform() {
        if (msg.sender != platform && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address initialPlatform) {
        if (initialPlatform == address(0)) revert InvalidAddress();
        owner = msg.sender;
        platform = initialPlatform;
        emit OwnershipTransferred(address(0), msg.sender);
        emit PlatformUpdated(address(0), initialPlatform);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setPlatform(address newPlatform) external onlyOwner {
        if (newPlatform == address(0)) revert InvalidAddress();
        emit PlatformUpdated(platform, newPlatform);
        platform = newPlatform;
    }

    /**
     * @param offChainId keccak256 of the DB loan uuid
     * @param interestRateBps e.g. 1299 = 12.99%
     */
    function createLoan(
        bytes32 offChainId,
        address borrower,
        uint256 amountCents,
        uint256 interestRateBps,
        uint256 termMonths,
        uint256 monthlyPaymentCents
    ) external onlyPlatform returns (uint256 loanId) {
        if (borrower == address(0)) revert InvalidAddress();
        if (amountCents == 0 || termMonths == 0) revert InvalidAmount();
        if (offChainIdToLoanId[offChainId] != 0) revert LoanExists();

        loanId = nextLoanId++;
        loans[loanId] = Loan({
            offChainId: offChainId,
            borrower: borrower,
            amountCents: amountCents,
            interestRateBps: interestRateBps,
            termMonths: termMonths,
            monthlyPaymentCents: monthlyPaymentCents,
            status: LoanStatus.Pending,
            createdAt: uint64(block.timestamp),
            approvedAt: 0,
            disbursedAt: 0
        });

        offChainIdToLoanId[offChainId] = loanId;
        _borrowerLoans[borrower].push(loanId);

        emit LoanCreated(loanId, offChainId, borrower, amountCents, interestRateBps, termMonths);
    }

    function approveLoan(uint256 loanId) external onlyPlatform {
        _transition(loanId, LoanStatus.Pending, LoanStatus.Approved);
        loans[loanId].approvedAt = uint64(block.timestamp);
    }

    function rejectLoan(uint256 loanId) external onlyPlatform {
        _transition(loanId, LoanStatus.Pending, LoanStatus.Rejected);
    }

    function disburseLoan(uint256 loanId) external onlyPlatform {
        _transition(loanId, LoanStatus.Approved, LoanStatus.Disbursed);
        loans[loanId].disbursedAt = uint64(block.timestamp);
    }

    function markRepaid(uint256 loanId) external onlyPlatform {
        _transition(loanId, LoanStatus.Disbursed, LoanStatus.Repaid);
    }

    function markDefaulted(uint256 loanId) external onlyPlatform {
        Loan storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert LoanNotFound();
        if (loan.status != LoanStatus.Disbursed && loan.status != LoanStatus.Approved) {
            revert InvalidStatusTransition(loan.status, LoanStatus.Defaulted);
        }
        LoanStatus prev = loan.status;
        loan.status = LoanStatus.Defaulted;
        emit LoanStatusUpdated(loanId, prev, LoanStatus.Defaulted);
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return _borrowerLoans[borrower];
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        if (loans[loanId].borrower == address(0)) revert LoanNotFound();
        return loans[loanId];
    }

    function _transition(uint256 loanId, LoanStatus expected, LoanStatus next) internal {
        Loan storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert LoanNotFound();
        if (loan.status != expected) revert InvalidStatusTransition(loan.status, next);
        loan.status = next;
        emit LoanStatusUpdated(loanId, expected, next);
    }
}
