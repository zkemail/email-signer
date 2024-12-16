import { expect } from "chai";
import { Address, EmailAccount, EmailAccountFactory, Verifier, UserOverrideableDKIMRegistry, EmailAuth, Groth16Verifier } from "../../typechain-types";
import { ethers } from "hardhat";
import { JsonRpcProvider } from "ethers";

describe("EmailAccount", () => {
    let emailAccountFactory: EmailAccountFactory;
    let emailAccount: EmailAccount;
    let verifier: Verifier;
    let dkim: UserOverrideableDKIMRegistry;
    let emailAuthImpl: EmailAuth;

    let context: {
        bundlerProvider: JsonRpcProvider;
        entryPoint: Address;
    }

    before(async () => {
        const [deployer] = await ethers.getSigners();
        const initialOwner = await deployer.getAddress();

        const bundlerProvider = new ethers.JsonRpcProvider(
            "http://localhost:3000/rpc"
        );

        // get list of supported entrypoints
        const entrypoints = await bundlerProvider.send(
            "eth_supportedEntryPoints",
            []
        );

        if (entrypoints.length === 0) {
            throw new Error("No entrypoints found");
        }

        context = {
            bundlerProvider,
            entryPoint: entrypoints[0],
        };

        // Deploy DKIM Registry
        const dkimFactory = await ethers.getContractFactory("UserOverrideableDKIMRegistry");
        const dkimImpl = await dkimFactory.deploy();

        const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
        const dkimProxy = await ERC1967ProxyFactory.deploy(
            await dkimImpl.getAddress(),
            dkimImpl.interface.encodeFunctionData("initialize", [
                initialOwner,
                initialOwner, // using deployer as signer for testing
                0 // no time delay for testing
            ])
        );
        dkim = await ethers.getContractAt("UserOverrideableDKIMRegistry", await dkimProxy.getAddress());

        // Deploy Verifier
        const verifierFactory = await ethers.getContractFactory("Verifier");
        const verifierImpl = await verifierFactory.deploy();

        const groth16VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
        const groth16Verifier = await groth16VerifierFactory.deploy();

        const verifierProxy = await ERC1967ProxyFactory.deploy(
            await verifierImpl.getAddress(),
            verifierImpl.interface.encodeFunctionData("initialize", [
                initialOwner,
                await groth16Verifier.getAddress()
            ])
        );
        verifier = await ethers.getContractAt("Verifier", await verifierProxy.getAddress());

        // deploy decimal utils
        const decimalUtilsFactory = await ethers.getContractFactory("DecimalUtils");
        const decimalUtils = await decimalUtilsFactory.deploy();

        // deploy command utils
        const commandUtilsFactory = await ethers.getContractFactory("CommandUtils", {
            libraries: {
                DecimalUtils: await decimalUtils.getAddress()
            }
        });
        const commandUtils = await commandUtilsFactory.deploy();

        // Deploy EmailAuth Implementation
        const emailAuthFactory = await ethers.getContractFactory("EmailAuth", {
            libraries: {
                CommandUtils: await commandUtils.getAddress()
            }
        });
        emailAuthImpl = await emailAuthFactory.deploy();

        // Deploy EmailAccount Implementation and Factory
        const _emailAccountFactory = await ethers.getContractFactory("EmailAccount");
        emailAccount = await _emailAccountFactory.deploy();

        const emailAccountFactoryFactory = await ethers.getContractFactory("EmailAccountFactory");
        emailAccountFactory = await emailAccountFactoryFactory.deploy(
            context.entryPoint,
            await verifier.getAddress(),
            await dkim.getAddress(),
            await emailAuthImpl.getAddress(),
            await emailAccount.getAddress()
        );
    });

    it("should have an entrypoint", () => {
        expect(context.entryPoint).to.not.be.null;
    });

    it("should have properly initialized contracts", async () => {
        expect(await verifier.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await dkim.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await emailAuthImpl.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await emailAccount.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await emailAccountFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
});