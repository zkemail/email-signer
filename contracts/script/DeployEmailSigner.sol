// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "@zk-email/ether-email-auth-contracts/src/utils/Verifier.sol";
import "@zk-email/ether-email-auth-contracts/src/utils/Groth16Verifier.sol";
import "@zk-email/contracts/UserOverrideableDKIMRegistry.sol";
import "@zk-email/ether-email-auth-contracts/src/EmailAuth.sol";
import "../src/EmailSignerFactory.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract Deploy is Script {
    UserOverrideableDKIMRegistry dkimImpl;
    UserOverrideableDKIMRegistry dkim;
    Verifier verifierImpl;
    Verifier verifier;
    EmailAuth emailAuthImpl;
    EmailSigner emailSignerImpl;
    EmailSignerFactory emailSignerFactory;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        if (deployerPrivateKey == 0) {
            console.log("PRIVATE_KEY env var not set");
            return;
        }
        address signer = vm.envAddress("SIGNER");
        if (signer == address(0)) {
            console.log("SIGNER env var not set");
            return;
        }
        uint256 timeDelay = vm.envOr("DKIM_DELAY", uint256(0));
        console.log("DKIM_DELAY: %s", timeDelay);

        vm.startBroadcast(deployerPrivateKey);
        address initialOwner = vm.addr(deployerPrivateKey);
        console.log("Initial owner: %s", vm.toString(initialOwner));

        // If on Base Sepolia, use existing contracts
        if (block.chainid == 84532) {
            dkim = UserOverrideableDKIMRegistry(
                0x640747442f4895A14164eC756Da029214Eec2815
            );
            verifier = Verifier(0xA82c585350855b72A48B59F40B0dAeeb85e2AB9A);
            emailAuthImpl = EmailAuth(
                0x753FDb34e7868bC1e4729f35EFB24bcEF92DeAbd
            );
            emailSignerImpl = EmailSigner(
                0x8641848C773Ee703003BaE9c7b2D27014c62B4B0
            );

            // Only deploy EmailSignerFactory since it's not deployed yet
            emailSignerFactory = new EmailSignerFactory(
                address(verifier),
                address(dkim),
                address(emailAuthImpl),
                address(emailSignerImpl)
            );
            console.log(
                "EmailSignerFactory deployed at: %s",
                address(emailSignerFactory)
            );
        } else {
            // Deploy Useroverridable DKIM registry
            {
                dkimImpl = new UserOverrideableDKIMRegistry();
                address dkimProxyAddress = address(
                    new ERC1967Proxy(
                        address(dkimImpl),
                        abi.encodeCall(
                            UserOverrideableDKIMRegistry.initialize,
                            (initialOwner, signer, timeDelay)
                        )
                    )
                );
                dkim = UserOverrideableDKIMRegistry(dkimProxyAddress);
                console.log(
                    "UserOverrideableDKIMRegistry deployed at: %s",
                    address(dkim)
                );
            }
            // Deploy Verifier
            {
                verifierImpl = new Verifier();
                console.log(
                    "Verifier implementation deployed at: %s",
                    address(verifierImpl)
                );
                Groth16Verifier groth16Verifier = new Groth16Verifier();
                ERC1967Proxy verifierProxy = new ERC1967Proxy(
                    address(verifierImpl),
                    abi.encodeCall(
                        verifierImpl.initialize,
                        (initialOwner, address(groth16Verifier))
                    )
                );
                verifier = Verifier(address(verifierProxy));
                console.log("Verifier deployed at: %s", address(verifier));
            }
            // Deploy EmailAuth Implementation
            {
                emailAuthImpl = new EmailAuth();
                console.log(
                    "EmailAuth implementation deployed at: %s",
                    address(emailAuthImpl)
                );
            }
            // Deploy EmailSignerImplementation
            {
                emailSignerImpl = new EmailSigner();
                console.log(
                    "EmailSigner implementation deployed at: %s",
                    address(emailSignerImpl)
                );
            }
            // Deploy EmailSignerFactory
            {
                emailSignerFactory = new EmailSignerFactory(
                    address(verifier),
                    address(dkim),
                    address(emailAuthImpl),
                    address(emailSignerImpl)
                );
                console.log(
                    "EmailSignerFactory deployed at: %s",
                    address(emailSignerFactory)
                );
            }
        }
        vm.stopBroadcast();
    }
}
