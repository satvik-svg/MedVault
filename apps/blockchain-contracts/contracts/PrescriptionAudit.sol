// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract PrescriptionAudit is AccessControl {
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");

    enum RecordType {
        PRESCRIPTION,
        LAB_REPORT,
        PRESCRIPTION_FULFILLMENT,
        CONSENT
    }

    struct Record {
        bytes32 contentHash;
        uint64 timestamp;
        RecordType recordType;
        bytes32 patientIdHash;
        bytes32 issuerIdHash;
        bool exists;
    }

    mapping(bytes32 => Record) public records;

    event RecordAnchored(
        bytes32 indexed recordId,
        bytes32 contentHash,
        RecordType recordType,
        bytes32 indexed patientIdHash,
        bytes32 indexed issuerIdHash,
        uint64 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ANCHOR_ROLE, msg.sender);
    }

    function anchorRecord(
        bytes32 recordId,
        bytes32 contentHash,
        RecordType recordType,
        bytes32 patientIdHash,
        bytes32 issuerIdHash
    ) external onlyRole(ANCHOR_ROLE) {
        require(!records[recordId].exists, "Already anchored");
        require(contentHash != bytes32(0), "Empty hash");

        records[recordId] = Record({
            contentHash: contentHash,
            timestamp: uint64(block.timestamp),
            recordType: recordType,
            patientIdHash: patientIdHash,
            issuerIdHash: issuerIdHash,
            exists: true
        });

        emit RecordAnchored(recordId, contentHash, recordType, patientIdHash, issuerIdHash, uint64(block.timestamp));
    }

    function verifyRecord(bytes32 recordId, bytes32 expectedHash) external view returns (bool valid, uint64 anchoredAt) {
        Record memory record = records[recordId];
        return (record.exists && record.contentHash == expectedHash, record.timestamp);
    }

    function getRecord(bytes32 recordId) external view returns (Record memory) {
        return records[recordId];
    }
}
