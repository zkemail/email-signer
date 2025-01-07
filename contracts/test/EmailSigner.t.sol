// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "../src/EmailSigner.sol";
import "../src/EmailSignerFactory.sol";
import "@zk-email/ether-email-auth-contracts/src/utils/Verifier.sol";
import "@zk-email/contracts/UserOverrideableDKIMRegistry.sol";
import "@zk-email/ether-email-auth-contracts/src/EmailAuth.sol";

/**
 * @title SignatureDecoder - Decodes signatures encoded as bytes
 * @author Richard Meissner - @rmeissner
 */
library SignatureDecoder {
    /**
     * @notice Splits signature bytes into `uint8 v, bytes32 r, bytes32 s`.
     * @dev Make sure to perform a bounds check for @param pos, to avoid out of bounds access on @param signatures
     *      The signature format is a compact form of {bytes32 r}{bytes32 s}{uint8 v}
     *      Compact means uint8 is not padded to 32 bytes.
     * @param pos Which signature to read.
     *            A prior bounds check of this parameter should be performed, to avoid out of bounds access.
     * @param signatures Concatenated {r, s, v} signatures.
     * @return v Recovery ID or Safe signature type.
     * @return r Output value r of the signature.
     * @return s Output value s of the signature.
     */
    function signatureSplit(
        bytes memory signatures,
        uint256 pos
    ) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let signaturePos := mul(0x41, pos)
            r := mload(add(signatures, add(signaturePos, 0x20)))
            s := mload(add(signatures, add(signaturePos, 0x40)))
            /**
             * Here we are loading the last 32 bytes, including 31 bytes
             * of 's'. There is no 'mload8' to do this.
             * 'byte' is not working due to the Solidity parser, so lets
             * use the second best option, 'and'
             */
            v := and(mload(add(signatures, add(signaturePos, 0x41))), 0xff)
        }
    }
}

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
