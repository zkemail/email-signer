// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./EmailSigner.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title Factory contract for deploying EmailSigner
contract EmailSignerFactory {
    address public verifier;
    address public dkim;
    address public emailAuthImplementation;
    address public emailSignerImplementation;

    constructor(
        address _verifierAddr,
        address _dkimAddr,
        address _emailAuthImplementationAddr,
        address _emailSignerImplementationAddr
    ) {
        verifier = _verifierAddr;
        dkim = _dkimAddr;
        emailAuthImplementation = _emailAuthImplementationAddr;
        emailSignerImplementation = _emailSignerImplementationAddr;
    }

    /// @notice Get the deterministic address where an EmailSigner contract will be deployed
    /// @param _accountSalt Salt value used to generate deterministic address
    /// @return address The computed address where EmailSigner will be deployed
    function getEmailSignerAddress(
        bytes32 _accountSalt
    ) public view returns (address) {
        return
            Create2.computeAddress(
                _accountSalt,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            emailSignerImplementation,
                            _getInitializeData(_accountSalt)
                        )
                    )
                )
            );
    }

    /// @notice Deploy a new EmailSigner contract at a deterministic address
    /// @param _accountSalt Salt value used to generate deterministic address
    /// @return address The address where the EmailSigner contract was deployed
    /// @dev Uses CREATE2 to deploy an ERC1967 proxy pointing to the EmailSigner implementation
    function deployEmailSigner(
        bytes32 _accountSalt
    ) external returns (address) {
        return
            address(
                new ERC1967Proxy{salt: _accountSalt}(
                    emailSignerImplementation,
                    _getInitializeData(_accountSalt)
                )
            );
    }

    /// @notice Internal helper function to get initialization data for EmailSigner contract
    /// @param _accountSalt Salt value used to generate deterministic address
    /// @return bytes Encoded initialization data for EmailSigner contract
    function _getInitializeData(
        bytes32 _accountSalt
    ) internal view returns (bytes memory) {
        return
            abi.encodeCall(
                EmailSigner.initialize,
                (verifier, dkim, emailAuthImplementation, _accountSalt)
            );
    }
}
