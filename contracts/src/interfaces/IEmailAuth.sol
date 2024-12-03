// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

/// @title Interface for Email Authentication/Authorization Contract
/// @notice Interface for authenticating email senders and authorizing messages in email commands
interface IEmailAuth {
    /// @notice Struct to hold the email authentication/authorization message.
    struct EmailAuthMsg {
        /// @notice The ID of the command template that the command in the email body should satisfy.
        uint templateId;
        /// @notice The parameters in the command of the email body, which should be taken according to the specified command template.
        bytes[] commandParams;
        /// @notice The number of skipped bytes in the command.
        uint skippedCommandPrefix;
        /// @notice The email proof containing the zk proof and other necessary information for the email verification by the verifier contract.
        EmailProof proof;
    }

    /// @notice Struct to hold the email proof.
    struct EmailProof {
        string domainName; // Domain name of the sender's email
        bytes32 publicKeyHash; // Hash of the DKIM public key used in email/proof
        uint timestamp; // Timestamp of the email
        string maskedCommand; // Masked command of the email
        bytes32 emailNullifier; // Nullifier of the email to prevent its reuse.
        bytes32 accountSalt; // Create2 salt of the account
        bool isCodeExist; // Check if the account code is exist
        bytes proof; // ZK Proof of Email
    }

    event DKIMRegistryUpdated(address indexed dkimRegistry);
    event VerifierUpdated(address indexed verifier);
    event CommandTemplateInserted(uint indexed templateId);
    event CommandTemplateUpdated(uint indexed templateId);
    event CommandTemplateDeleted(uint indexed templateId);
    event EmailAuthed(
        bytes32 indexed emailNullifier,
        bytes32 indexed accountSalt,
        bool isCodeExist,
        uint templateId
    );
    event TimestampCheckEnabled(bool enabled);

    /// @notice Returns the CREATE2 salt of this contract
    function accountSalt() external view returns (bytes32);

    /// @notice Returns the address of the controller contract
    function controller() external view returns (address);

    /// @notice Returns the address of the DKIM registry contract
    function dkimRegistryAddr() external view returns (address);

    /// @notice Returns the address of the verifier contract
    function verifierAddr() external view returns (address);

    /// @notice Returns whether timestamp check is enabled
    function timestampCheckEnabled() external view returns (bool);

    /// @notice Returns the latest timestamp in verified EmailAuthMsg
    function lastTimestamp() external view returns (uint);

    /// @notice Initializes the contract with initial owner and account salt
    function initialize(
        address _initialOwner,
        bytes32 _accountSalt,
        address _controller
    ) external;

    /// @notice Initializes the DKIM registry contract
    function initDKIMRegistry(address _dkimRegistryAddr) external;

    /// @notice Initializes the verifier contract
    function initVerifier(address _verifierAddr) external;

    /// @notice Updates the DKIM registry contract
    function updateDKIMRegistry(address _dkimRegistryAddr) external;

    /// @notice Updates the verifier contract
    function updateVerifier(address _verifierAddr) external;

    /// @notice Retrieves a command template by its ID
    function getCommandTemplate(
        uint _templateId
    ) external view returns (string[] memory);

    /// @notice Inserts a new command template
    function insertCommandTemplate(
        uint _templateId,
        string[] memory _commandTemplate
    ) external;

    /// @notice Updates an existing command template
    function updateCommandTemplate(
        uint _templateId,
        string[] memory _commandTemplate
    ) external;

    /// @notice Deletes an existing command template
    function deleteCommandTemplate(uint _templateId) external;

    /// @notice Authenticates email sender and authorizes message
    function authEmail(EmailAuthMsg memory emailAuthMsg) external;

    /// @notice Enables or disables timestamp check
    function setTimestampCheckEnabled(bool _enabled) external;
}
