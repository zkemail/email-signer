// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "../src/EmailAccount.sol";
import "../src/EmailAccountFactory.sol";
import "@zk-email/ether-email-auth-contracts/src/utils/Verifier.sol";
import "@zk-email/contracts/UserOverrideableDKIMRegistry.sol";
import "@zk-email/ether-email-auth-contracts/src/EmailAuth.sol";

contract EmailAccountTest is Test {
    EmailAccount emailAccount;
    EmailAccountFactory factory;
    Verifier verifier;
    UserOverrideableDKIMRegistry dkim;
    EmailAuth emailAuth;
    address owner;
    bytes32 constant TEST_SALT = bytes32(uint256(1));
    address entryPoint = address(0x123);

    function setUp() public {
        owner = address(this);
        console.log("Owner address:", owner);

        // Deploy mock contracts
        verifier = new Verifier();
        console.log("Verifier deployed at:", address(verifier));

        dkim = new UserOverrideableDKIMRegistry();
        console.log("DKIM Registry deployed at:", address(dkim));

        emailAuth = new EmailAuth();
        console.log("EmailAuth deployed at:", address(emailAuth));

        // Deploy implementation
        EmailAccount implementation = new EmailAccount();

        console.log(
            "EmailAccount implementation deployed at:",
            address(implementation)
        );

        // Deploy factory
        factory = new EmailAccountFactory(
            entryPoint,
            address(verifier),
            address(dkim),
            address(emailAuth),
            address(implementation)
        );
        console.log("EmailAccountFactory deployed at:", address(factory));

        // Deploy EmailSigner through factory
        factory.deployEmailAccount(TEST_SALT);
        emailAccount = EmailAccount(
            payable(factory.getEmailAccountAddress(TEST_SALT))
        );
        console.log("EmailAccount proxy deployed at:", address(emailAccount));
    }

    function testInitialization() public view {
        assertEq(
            address(emailAccount.entryPoint()),
            entryPoint,
            "Wrong entry point address"
        );
        assertEq(
            emailAccount.verifier(),
            address(verifier),
            "Wrong verifier address"
        );
        assertEq(emailAccount.dkim(), address(dkim), "Wrong DKIM address");
        assertEq(
            emailAccount.emailAuthImplementation(),
            address(emailAuth),
            "Wrong EmailAuth implementation address"
        );
    }
}
