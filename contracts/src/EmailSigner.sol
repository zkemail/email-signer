// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@zk-email/ether-email-auth-contracts/src/EmailAuth.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title EIP-1271 compliant smart contract signing via email commands
contract EmailSigner {
    address public verifier;
    address public dkim;
    address public emailAuthImplementation;
    address public emailAuthAddr;

    event SignHashCommand(bytes32 indexed hash);

    /// @notice Mapping to track if a hash has been signed by an email command.
    mapping(bytes32 => bool) public isHashSigned;

    constructor(
        address _verifierAddr,
        address _dkimAddr,
        address _emailAuthImplementationAddr,
        bytes32 _accountSalt
    ) {
        verifier = _verifierAddr;
        dkim = _dkimAddr;
        emailAuthImplementation = _emailAuthImplementationAddr;
        emailAuthAddr = deployEmailAuthProxy(_accountSalt);
    }

    /// @notice Signs a hash using the email command
    function esign(EmailAuthMsg memory emailAuthMsg) public {
        // check if sender authorized the correct template
        uint256 templateId = computeTemplateId(0);
        require(templateId == emailAuthMsg.templateId, "invalid template id");

        // check if sender is the correct account
        EmailAuth emailAuth = EmailAuth(emailAuthAddr);
        require(
            emailAuth.accountSalt() == emailAuthMsg.proof.accountSalt,
            "invalid account salt"
        );

        // check zk proof
        emailAuth.authEmail(emailAuthMsg);

        // record signed hash
        bytes32 _hash = abi.decode(emailAuthMsg.commandParams[0], (bytes32));
        isHashSigned[_hash] = true;
        emit SignHashCommand(_hash);
    }

    /// @notice Calculates a unique command template ID for template provided by this contract.
    /// @dev Encodes the email account recovery version ID, "ESIGN", and the template index,
    /// then uses keccak256 to hash these values into a uint ID.
    /// @param templateIdx The index of the command template.
    /// @return uint The computed uint ID.
    function computeTemplateId(uint templateIdx) public pure returns (uint) {
        return uint256(keccak256(abi.encode("ESIGN", templateIdx)));
    }

    /// @notice Deploys a new proxy contract for email authentication.
    /// @dev This function uses the CREATE2 opcode to deploy a new ERC1967Proxy contract with a deterministic address.
    /// @param accountSalt A bytes32 salt value used to ensure the uniqueness of the deployed proxy address.
    /// @return address The address of the newly deployed proxy contract.
    function deployEmailAuthProxy(
        bytes32 accountSalt
    ) internal returns (address) {
        ERC1967Proxy proxy = new ERC1967Proxy(
            emailAuthImplementation,
            abi.encodeCall(
                EmailAuth.initialize,
                (address(this), accountSalt, address(this))
            )
        );

        EmailAuth emailAuth = EmailAuth(address(proxy));
        emailAuth.initDKIMRegistry(dkim);
        emailAuth.initVerifier(verifier);

        string[] memory signHashTemplate = new string[](2);
        signHashTemplate[0] = "signHash";
        signHashTemplate[1] = "{uint}";

        emailAuth.insertCommandTemplate(computeTemplateId(0), signHashTemplate);
        return address(proxy);
    }
}
