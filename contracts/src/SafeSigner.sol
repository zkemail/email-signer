// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;
import "./EmailSigner.sol";

/// @title SafeSigner - Email-based signature provider for Safe contracts
/// @notice Implements EIP-1271 signature verification through email commands for Safe multisig wallets
/// @dev Inherits from EmailSigner to provide email-based signing capabilities
/// @custom:security-contact security@yourdomain.com
contract SafeSigner is EmailSigner {
    event SafeHashApproved(address indexed safe, bytes32 indexed hash);

    /// @notice Approves a hash for signing on a Safe contract after verifying email signature
    /// @param safe The address of the Safe contract
    /// @param hashToApprove The hash to be approved
    /// @dev This function can only be called if the hash was previously signed via email
    function approveSafeHash(address safe, bytes32 hashToApprove) public {
        // Check if the hash has been signed via email command
        require(isHashSigned[hashToApprove], "Hash not signed via email");

        // Call approveHash on the Safe contract
        // The approveHash function is part of the Safe contract interface
        // It allows an owner to approve a hash for signing
        (bool success, ) = safe.call(
            abi.encodeWithSignature("approveHash(bytes32)", hashToApprove)
        );
        require(success, "Failed to approve hash on Safe");

        emit SafeHashApproved(safe, hashToApprove);
    }

    /// @notice Combines email signing and Safe hash approval in a single transaction
    /// @param emailAuthMsg The email authentication message
    /// @param safe The address of the Safe contract
    /// @dev This is a convenience function that calls esign() and approveSafeHash()
    function esignAndApproveHash(
        IEmailAuth.EmailAuthMsg memory emailAuthMsg,
        address safe
    ) external {
        bytes32 hash = esign(emailAuthMsg);
        approveSafeHash(safe, hash);
    }

    /// @notice Returns the formatted signature bytes for use with Safe contracts
    /// @return The encoded signature bytes in Safe's expected format
    /// @dev The signature format follows EIP-1271 contract signature scheme
    function getSignatureForSafeSigner() external view returns (bytes memory) {
        // The signature format for Safe contract signatures:
        // 1. r = contract address (20 bytes padded to 32 bytes)
        // 2. s = offset to signature data (32 bytes)
        // 3. v = 0 for contract signatures
        // 4. signature data length (32 bytes)
        return
            abi.encodePacked(
                bytes32(uint256(uint160(address(this)))),
                bytes32(uint256(65)),
                uint8(0),
                bytes32(0)
            );
    }
}
