// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./EmailAccount.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@zk-email/ether-email-auth-contracts/src/utils/Verifier.sol";
import "@zk-email/ether-email-auth-contracts/src/utils/Groth16Verifier.sol";
import "@zk-email/contracts/UserOverrideableDKIMRegistry.sol";
import "@zk-email/ether-email-auth-contracts/src/EmailAuth.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title Factory contract for deploying EmailAccount
contract EmailAccountFactory {
    address public verifier;
    address public dkim;
    address public emailAuthImplementation;
    address public emailAccountImplementation;
    address public entryPoint;

    UserOverrideableDKIMRegistry dkimImpl;
    Verifier verifierImpl;
    EmailAuth emailAuthImpl;

    constructor(
        address _entryPoint,
        address _verifierAddr,
        address _dkimAddr,
        address _emailAuthImplementationAddr,
        address _emailAccountImplementationAddr
    ) {
        verifier = _verifierAddr;
        dkim = _dkimAddr;
        emailAuthImplementation = _emailAuthImplementationAddr;
        emailAccountImplementation = _emailAccountImplementationAddr;
        entryPoint = _entryPoint;
    }

    /// @notice Get the deterministic address where an EmailAccount contract will be deployed
    /// @param _accountSalt Salt value used to generate deterministic address
    /// @return address The computed address where EmailAccount will be deployed
    function getEmailAccountAddress(
        bytes32 _accountSalt
    ) public view returns (address) {
        return
            Create2.computeAddress(
                _accountSalt,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            emailAccountImplementation,
                            _getInitializeData(_accountSalt)
                        )
                    )
                )
            );
    }

    /// @notice Deploy a new EmailAccount contract at a deterministic address
    /// @param _accountSalt Salt value used to generate deterministic address
    /// @return address The address where the EmailAccount contract was deployed
    /// @dev Uses CREATE2 to deploy an ERC1967 proxy pointing to the EmailAccount implementation
    function deployEmailAccount(
        bytes32 _accountSalt
    ) external returns (address) {
        return
            address(
                new ERC1967Proxy{salt: _accountSalt}(
                    emailAccountImplementation,
                    _getInitializeData(_accountSalt)
                )
            );
    }

    /// @notice Internal helper function to get initialization data for EmailAccount contract
    /// @param _accountSalt Salt value used to generate deterministic address
    /// @return bytes Encoded initialization data for EmailAccount contract
    function _getInitializeData(
        bytes32 _accountSalt
    ) internal view returns (bytes memory) {
        return
            abi.encodeCall(
                EmailAccount.initialize,
                (
                    entryPoint,
                    verifier,
                    dkim,
                    emailAuthImplementation,
                    _accountSalt
                )
            );
    }
}
