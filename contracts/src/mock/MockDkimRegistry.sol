// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@zk-email/contracts/interfaces/IDKIMRegistry.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title MockDKIMRegistry
 * @dev A simplified version of DKIMRegistry for testing purposes
 */
contract MockDKIMRegistry is
    IDKIMRegistry,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // Mapping of domain name => public key hash => is valid
    mapping(string => mapping(bytes32 => bool)) public dkimPublicKeyHashes;

    // Mapping of public key hash => is revoked
    mapping(bytes32 => bool) public revokedPublicKeyHashes;

    address public mainAuthorizer;
    uint public setTimestampDelay;

    constructor() {}

    function initialize(
        address _initialOwner,
        address _mainAuthorizer,
        uint _setTimestampDelay
    ) public initializer {
        __Ownable_init(_initialOwner);
        mainAuthorizer = _mainAuthorizer;
        setTimestampDelay = _setTimestampDelay;
    }

    function isDKIMPublicKeyHashValid(
        string memory domainName,
        bytes32 publicKeyHash
    ) public view returns (bool) {
        return
            dkimPublicKeyHashes[domainName][publicKeyHash] &&
            !revokedPublicKeyHashes[publicKeyHash];
    }

    // Simplified setter that only requires owner access
    function setDKIMPublicKeyHash(
        string memory domainName,
        bytes32 publicKeyHash,
        address authorizer,
        bytes memory // signature (unused in mock)
    ) public {
        require(bytes(domainName).length > 0, "domain name cannot be zero");
        require(publicKeyHash != bytes32(0), "public key hash cannot be zero");
        require(
            !revokedPublicKeyHashes[publicKeyHash],
            "public key hash is revoked"
        );

        dkimPublicKeyHashes[domainName][publicKeyHash] = true;
    }

    // Simplified revoke function
    function revokeDKIMPublicKeyHash(
        string memory domainName,
        bytes32 publicKeyHash,
        address authorizer,
        bytes memory // signature (unused in mock)
    ) public {
        require(publicKeyHash != bytes32(0), "public key hash cannot be zero");
        require(!revokedPublicKeyHashes[publicKeyHash], "already revoked");

        revokedPublicKeyHashes[publicKeyHash] = true;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
