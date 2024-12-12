// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "../src/EmailSigner/EmailSigner.sol";
import "../src/EmailSigner/EmailSignerFactory.sol";
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

    function testInitialization() public view {
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

    function testComputeTemplateId() public view {
        uint templateId = emailSigner.computeTemplateId(0);
        assertEq(
            templateId,
            uint256(keccak256(abi.encode("ESIGN", 0))),
            "Wrong template ID computation"
        );
    }

    function testIsValidSignatureBeforeSigning() public view {
        bytes32 testHash = keccak256("test");
        bytes memory emptySignature;

        bytes4 result = emailSigner.isValidSignature(testHash, emptySignature);
        assertEq(
            result,
            bytes4(0),
            "Should return invalid signature before signing"
        );
    }
}
