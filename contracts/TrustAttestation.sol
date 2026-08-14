// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Risk scores parked against a wallet. New ones just get a higher id; we treat latest as current.
contract TrustAttestation {
    struct Attestation {
        address subject;
        uint256 riskScore;
        bytes32 decisionHash;
        bytes32 factorsHash;
        string modelVersion;
        uint64 attestedAt;
        address attester;
    }

    address public owner;
    address public attesterRole;
    uint256 public nextAttestationId = 1;

    mapping(uint256 => Attestation) public attestations;
    mapping(address => uint256) public latestAttestationId;
    mapping(address => uint256[]) private _subjectAttestations;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AttesterUpdated(address indexed previousAttester, address indexed newAttester);
    event TrustAttested(
        uint256 indexed attestationId,
        address indexed subject,
        uint256 riskScore,
        bytes32 decisionHash,
        string modelVersion
    );

    error Unauthorized();
    error InvalidAddress();
    error InvalidScore();
    error AttestationNotFound();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAttester() {
        if (msg.sender != attesterRole && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address initialAttester) {
        if (initialAttester == address(0)) revert InvalidAddress();
        owner = msg.sender;
        attesterRole = initialAttester;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AttesterUpdated(address(0), initialAttester);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAttester(address newAttester) external onlyOwner {
        if (newAttester == address(0)) revert InvalidAddress();
        emit AttesterUpdated(attesterRole, newAttester);
        attesterRole = newAttester;
    }

    // riskScore is 0-100 (lower = better for us)
    function attest(
        address subject,
        uint256 riskScore,
        bytes32 decisionHash,
        bytes32 factorsHash,
        string calldata modelVersion
    ) external onlyAttester returns (uint256 attestationId) {
        if (subject == address(0)) revert InvalidAddress();
        if (riskScore > 100) revert InvalidScore();

        attestationId = nextAttestationId++;
        attestations[attestationId] = Attestation({
            subject: subject,
            riskScore: riskScore,
            decisionHash: decisionHash,
            factorsHash: factorsHash,
            modelVersion: modelVersion,
            attestedAt: uint64(block.timestamp),
            attester: msg.sender
        });

        latestAttestationId[subject] = attestationId;
        _subjectAttestations[subject].push(attestationId);

        emit TrustAttested(attestationId, subject, riskScore, decisionHash, modelVersion);
    }

    function getAttestation(uint256 attestationId) external view returns (Attestation memory) {
        if (attestations[attestationId].subject == address(0)) revert AttestationNotFound();
        return attestations[attestationId];
    }

    function getLatestAttestation(address subject) external view returns (Attestation memory) {
        uint256 id = latestAttestationId[subject];
        if (id == 0) revert AttestationNotFound();
        return attestations[id];
    }

    function getSubjectAttestations(address subject) external view returns (uint256[] memory) {
        return _subjectAttestations[subject];
    }
}
