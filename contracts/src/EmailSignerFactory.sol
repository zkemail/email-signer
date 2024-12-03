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

    function deployEmailSigner(
        bytes32 _accountSalt
    ) external returns (address) {
        // deterministically deploy email signer
        return
            address(
                new ERC1967Proxy{salt: _accountSalt}(
                    emailSignerImplementation,
                    abi.encodeCall(
                        EmailSigner.initialize,
                        (verifier, dkim, emailAuthImplementation, _accountSalt)
                    )
                )
            );
    }
}
