// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "../src/EmailSigner.sol";
import "../src/EmailSignerFactory.sol";
import "@zk-email/ether-email-auth-contracts/src/utils/Verifier.sol";
import "@zk-email/contracts/UserOverrideableDKIMRegistry.sol";
import "@zk-email/ether-email-auth-contracts/src/EmailAuth.sol";

contract EmailSignerTest is Test {
    EmailSigner emailSigner;
    EmailSignerFactory factory;
    Verifier verifier;
    UserOverrideableDKIMRegistry dkim;
    EmailAuth emailAuth;
    address owner;
    bytes32 constant TEST_SALT = bytes32(uint256(1));

    function setUp() public {
        owner = address(this);

        // Deploy mock contracts
        verifier = new Verifier();
        dkim = new UserOverrideableDKIMRegistry();
        emailAuth = new EmailAuth();

        // Deploy implementation
        EmailSigner implementation = new EmailSigner();

        // Deploy factory
        factory = new EmailSignerFactory(
            address(verifier),
            address(dkim),
            address(emailAuth),
            address(implementation)
        );

        // Deploy EmailSigner through factory
        factory.deployEmailSigner(TEST_SALT);
        emailSigner = EmailSigner(factory.getEmailSignerAddress(TEST_SALT));
    }

    // Helper function to create a base EmailAuthMsg
    function _createBaseEmailAuthMsg(
        bytes32 hash
    ) internal view returns (IEmailAuth.EmailAuthMsg memory) {
        IEmailAuth.EmailAuthMsg memory _msg;
        _msg.templateId = emailSigner.computeTemplateId(0);
        _msg.commandParams = new bytes[](1);
        _msg.commandParams[0] = abi.encode(hash);
        _msg.skippedCommandPrefix = 0;
        _msg.proof = IEmailAuth.EmailProof(
            "test.com",
            keccak256("test public key"),
            block.timestamp,
            "test",
            keccak256("test nullifier"),
            keccak256("test salt"),
            true,
            abi.encodePacked(uint256(123456789))
        );
        return _msg;
    }

    // Group initialization tests
    function test_Initialization_CorrectAddresses() public view {
        assertEq(
            emailSigner.verifier(),
            address(verifier),
            "Wrong verifier address"
        );
        assertEq(emailSigner.dkim(), address(dkim), "Wrong DKIM address");
        assertEq(
            emailSigner.emailAuthImplementation(),
            address(emailAuth),
            "Wrong EmailAuth implementation address"
        );
    }

    function test_Initialization_TemplateIdComputation() public view {
        uint templateId = emailSigner.computeTemplateId(0);
        assertEq(
            templateId,
            uint256(keccak256(abi.encode("ESIGN", 0))),
            "Wrong template ID computation"
        );
    }

    // Group signature validation tests
    function test_Signature_InvalidBeforeSigning() public view {
        bytes32 testHash = keccak256("test");
        bytes memory emptySignature;

        bytes4 result = emailSigner.isValidSignature(testHash, emptySignature);
        assertEq(
            result,
            bytes4(0),
            "Should return invalid signature before signing"
        );
    }

    function test_Signature_ValidAfterSigning() public {
        bytes32 testHash = keccak256("test");
        IEmailAuth.EmailAuthMsg memory msg = _createBaseEmailAuthMsg(testHash);

        _mockAndExpect(
            address(emailAuth),
            abi.encodeWithSelector(IEmailAuth.authEmail.selector, msg),
            abi.encode(true)
        );

        emailSigner.esign(msg);

        assertEq(
            emailSigner.isHashSigned(testHash),
            true,
            "Hash should be marked as signed after successful esign"
        );

        bytes4 result = emailSigner.isValidSignature(testHash, "");
        assertEq(
            result,
            bytes4(0x1626ba7e), // Magic value for valid signature
            "Should return valid signature after signing"
        );
    }

    // Group esign tests
    function test_Esign_SucceedsWithValidProof() public {
        bytes32 testHash = keccak256("test");
        IEmailAuth.EmailAuthMsg memory msg = _createBaseEmailAuthMsg(testHash);

        _mockAndExpect(
            address(emailAuth),
            abi.encodeWithSelector(IEmailAuth.authEmail.selector, msg),
            abi.encode(true)
        );

        emailSigner.esign(msg);
        assertTrue(emailSigner.isHashSigned(testHash), "Hash should be signed");
    }

    function test_Esign_RevertsWithInvalidProof() public {
        bytes32 testHash = keccak256("test");
        IEmailAuth.EmailAuthMsg memory msg = _createBaseEmailAuthMsg(testHash);

        vm.mockCallRevert(
            address(emailAuth),
            abi.encodeWithSelector(IEmailAuth.authEmail.selector, msg),
            "auth failed"
        );

        vm.expectRevert("auth failed");
        emailSigner.esign(msg);
    }

    function _mockAndExpect(
        address _target,
        bytes memory _call,
        bytes memory _ret
    ) internal {
        vm.mockCall(_target, _call, _ret);
        vm.expectCall(_target, _call);
    }
}
