// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./interfaces/IEmailAuth.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title Email-based EIP-1271 Smart Contract Wallet
/// @notice Allows signing messages via email commands with DKIM verification
contract EmailSigner is Initializable {
    address public verifier;
    address public dkim;
    address public emailAuthImplementation;
    address public emailAuthAddr;

    /// @dev Magic value returned by isValidSignature when signature is valid
    /// @dev bytes4(keccak256("isValidSignature(bytes32,bytes)"))
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    /// @dev Emitted when initialize is called
    event Initialize(
        address verifier,
        address dkim,
        address emailAuthImplementation,
        bytes32 accountSalt
    );

    /// @dev Emitted when a hash is signed via email command
    event SignHashCommand(bytes32 indexed hash);

    /// @dev Tracks which hashes have been signed via email command
    mapping(bytes32 => bool) public isHashSigned;

    /// @notice Initializes the contract with required dependencies
    /// @param _verifierAddr Address of the ZK proof verifier contract
    /// @param _dkimAddr Address of the DKIM registry contract
    /// @param _emailAuthImplementationAddr Address of the email auth implementation
    /// @param _accountSalt Unique salt for deterministic proxy deployment
    function initialize(
        address _verifierAddr,
        address _dkimAddr,
        address _emailAuthImplementationAddr,
        bytes32 _accountSalt
    ) public initializer {
        require(
            _verifierAddr != address(0) &&
                _dkimAddr != address(0) &&
                _emailAuthImplementationAddr != address(0),
            "zero address not allowed"
        );

        verifier = _verifierAddr;
        dkim = _dkimAddr;
        emailAuthImplementation = _emailAuthImplementationAddr;
        emailAuthAddr = deployEmailAuthProxy(_accountSalt);

        emit Initialize(
            _verifierAddr,
            _dkimAddr,
            _emailAuthImplementationAddr,
            _accountSalt
        );
    }

    /// @notice Signs a hash using an authenticated email command
    /// @param emailAuthMsg The email authentication message containing proof and command
    /// @return hash The signed hash
    function esign(
        IEmailAuth.EmailAuthMsg memory emailAuthMsg
    ) public returns (bytes32 hash) {
        // check if sender authorized the correct template
        uint256 templateId = computeTemplateId(0);
        require(templateId == emailAuthMsg.templateId, "invalid template id");

        // check ZK proof and account salt
        IEmailAuth(emailAuthAddr).authEmail(emailAuthMsg);

        // record signed hash
        hash = abi.decode(emailAuthMsg.commandParams[0], (bytes32));
        isHashSigned[hash] = true;
        emit SignHashCommand(hash);
    }

    /// @notice EIP-1271 signature validation for a hash
    /// @param _hash Hash of the data to be signed
    /// @return magicValue Magic value if signature is valid, zero otherwise
    function isValidSignature(
        bytes32 _hash,
        bytes memory
    ) public view returns (bytes4 magicValue) {
        if (isHashSigned[_hash]) {
            return MAGICVALUE;
        }
        return bytes4(0);
    }

    /// @notice EIP-1271 signature validation for raw data
    /// @param _data Raw data to be signed
    /// @return magicValue Magic value if signature is valid, zero otherwise
    function isValidSignature(
        bytes memory _data,
        bytes memory _signature
    ) public view returns (bytes4 magicValue) {
        return isValidSignature(keccak256(_data), _signature);
    }

    /// @notice Computes unique template ID for email commands
    /// @param templateIdx Index of the command template
    /// @return Unique template identifier
    function computeTemplateId(uint templateIdx) public pure returns (uint) {
        return uint256(keccak256(abi.encode("ESIGN", templateIdx)));
    }

    /// @notice Deploys email authentication proxy with CREATE2
    /// @param accountSalt Salt for deterministic address generation
    /// @return Address of deployed proxy
    function deployEmailAuthProxy(
        bytes32 accountSalt
    ) internal returns (address) {
        ERC1967Proxy proxy = new ERC1967Proxy{salt: accountSalt}(
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
}
