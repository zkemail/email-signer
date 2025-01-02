// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/Helpers.sol";
import "./EmailSigner.sol";

/// @title EmailAccount - Email-based ERC-4337 smart contract account
/// @notice Implements account abstraction using email signatures for validation
contract EmailAccount is BaseAccount, EmailSigner {
    // --- State Variables ---
    /// @notice The EntryPoint contract address
    address private entryPointAddress;

    /// @notice Initializes the EmailAccount contract
    /// @param _entryPoint The EntryPoint contract address
    /// @param _verifierAddr The address of the verifier
    /// @param _dkimAddr The address of the DKIM
    /// @param _emailAuthImplementationAddr The address of the email auth implementation
    /// @param _accountSalt The salt for the account
    function initialize(
        address _entryPoint,
        address _verifierAddr,
        address _dkimAddr,
        address _emailAuthImplementationAddr,
        bytes32 _accountSalt
    ) public initializer {
        super.initialize(
            _verifierAddr,
            _dkimAddr,
            _emailAuthImplementationAddr,
            _accountSalt
        );
        entryPointAddress = _entryPoint;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view override returns (IEntryPoint) {
        return IEntryPoint(entryPointAddress);
    }

    /// @notice Validates the signature of a user operation. **NOTE: this implementation violates the ERC-4337 opcode rules**
    /// @param userOp The user operation to validate
    /// @param userOpHash The hash of the user operation
    /// @return validationData 0 if valid, 1 if invalid
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal override returns (uint256 validationData) {
        // check if the hash has already been signed
        if (isHashSigned[userOpHash]) {
            return 0;
        }

        // check if the signature is valid
        try
            this.esign(abi.decode(userOp.signature, (IEmailAuth.EmailAuthMsg)))
        {
            return 0;
        } catch {
            return 1;
        }
    }

    /// @notice Execute a transaction from this account
    /// @param target The address to call
    /// @param value The amount of ETH to send
    /// @param data The calldata for the transaction
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external {
        _requireFromEntryPoint();
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /// @notice Receive function to accept ETH payments
    receive() external payable {}
}
