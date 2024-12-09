// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./interfaces/IEmailAuth.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title EIP-1271 compliant smart contract signing via email commands
contract EmailSigner is Initializable {
    address public verifier;
    address public dkim;
    address public emailAuthImplementation;
    address public emailAuthAddr;

    // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    bytes4 internal constant MAGICVALUE = 0x20c13b0b;

    event SignHashCommand(bytes32 indexed hash);

    /// @notice Mapping to track if a hash has been signed by an email command.
    mapping(bytes32 => bool) public isHashSigned;

    function initialize(
        address _verifierAddr,
        address _dkimAddr,
        address _emailAuthImplementationAddr,
        bytes32 _accountSalt
    ) public initializer {
        verifier = _verifierAddr;
        dkim = _dkimAddr;
        emailAuthImplementation = _emailAuthImplementationAddr;
        emailAuthAddr = deployEmailAuthProxy(_accountSalt);
    }

    /// @notice Signs a hash using the email command
    function esign(IEmailAuth.EmailAuthMsg memory emailAuthMsg) public {
        // check if sender authorized the correct template
        uint256 templateId = computeTemplateId(0);
        require(templateId == emailAuthMsg.templateId, "invalid template id");

        // check zk proof and account salt
        IEmailAuth(emailAuthAddr).authEmail(emailAuthMsg);

        // record signed hash
        bytes32 _hash = abi.decode(emailAuthMsg.commandParams[0], (bytes32));
        isHashSigned[_hash] = true;
        emit SignHashCommand(_hash);
    }

    /// Returns whether the hash has been signed via email command
    /// MUST NOT modify state (using STATICCALL for solc < 0.5, view modifier for solc > 0.5)
    /// MUST allow external calls
    /// @param _hash Hash of the data to be signed
    /// @return magicValue The bytes4 magic value 0x1626ba7e when function passes.
    function isValidSignature(
        bytes32 _hash,
        bytes memory
    ) public view returns (bytes4 magicValue) {
        if (isHashSigned[_hash]) {
            return MAGICVALUE;
        }
        return bytes4(0);
    }

    /// @notice Validates a signature for a give data by hashing it first
    /// @dev This is a convenience function to allow EIP-1271 signatures to be used
    /// with this contract.
    function isValidSignature(
        bytes memory _data,
        bytes memory _signature
    ) public view returns (bytes4 magicValue) {
        return isValidSignature(keccak256(_data), _signature);
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
                IEmailAuth.initialize,
                (address(this), accountSalt, address(this))
            )
        );

        IEmailAuth emailAuth = IEmailAuth(address(proxy));
        emailAuth.initDKIMRegistry(dkim);
        emailAuth.initVerifier(verifier);

        string[] memory signHashTemplate = new string[](2);
        signHashTemplate[0] = "signHash";
        signHashTemplate[1] = "{uint}";

        emailAuth.insertCommandTemplate(computeTemplateId(0), signHashTemplate);
        return address(proxy);
    }

    /// *********************
    /// DEVELOPMENT ONLY
    /// *********************
    function getSafeSignature(
        address signer,
        bytes memory data
    ) external pure returns (bytes memory) {
        // Combine all components:
        // 1. r (contract address)
        // 2. s (offset to signature data)
        // 3. v (0 for contract signatures)
        // 4. length of contract signature (32 bytes)
        // 5. actual signature data
        return
            abi.encodePacked(
                bytes32(uint256(uint160(signer))),
                bytes32(uint256(65)),
                uint8(0),
                bytes32(data.length),
                data
            );
    }
}
