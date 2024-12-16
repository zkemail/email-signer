import { expect } from "chai";
import { Address, EmailAccount, EmailAccountFactory, Verifier, UserOverrideableDKIMRegistry, EmailAuth, Groth16Verifier } from "../../typechain-types";
import { ethers } from "hardhat";
import { AbstractProvider, JsonRpcProvider } from "ethers";
import sendUserOpAndWait, { generateUnsignedUserOp, getUserOpHash } from "./userOpUtils";

describe("EmailAccount", () => {
    let emailAccountFactory: EmailAccountFactory;
    let emailAccountImpl: EmailAccount;
    let emailAccount: EmailAccount;
    let verifier: Verifier;
    let dkim: UserOverrideableDKIMRegistry;
    let emailAuthImpl: EmailAuth;
    let salt = `0x${"0".repeat(64)}`;

    let context: {
        provider: JsonRpcProvider;
        bundlerProvider: JsonRpcProvider;
        entryPoint: string;
    }

    before(async () => {
        const [deployer] = await ethers.getSigners();
        const initialOwner = await deployer.getAddress();

        const bundlerProvider = new ethers.JsonRpcProvider(
            "http://localhost:3000/rpc"
        );

        const provider = new ethers.JsonRpcProvider(
            "http://localhost:8545"
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
            provider,
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
        emailAccountImpl = await _emailAccountFactory.deploy();

        const emailAccountFactoryFactory = await ethers.getContractFactory("EmailAccountFactory");
        emailAccountFactory = await emailAccountFactoryFactory.deploy(
            context.entryPoint,
            await verifier.getAddress(),
            await dkim.getAddress(),
            await emailAuthImpl.getAddress(),
            await emailAccountImpl.getAddress()
        );

        // deploy a sample email account
        await emailAccountFactory.deployEmailAccount(salt);
        emailAccount = await ethers.getContractAt("EmailAccount", await emailAccountFactory.getEmailAccountAddress(salt));

        // fund the account from owner's account
        const fundingAmount = ethers.parseEther("1000");
        await deployer.sendTransaction({
            to: await emailAccount.getAddress(),
            value: fundingAmount
        });
    });

    it("should have properly initialized contracts", async () => {
        expect(context.entryPoint).to.not.be.null;
        expect(await verifier.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await dkim.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await emailAuthImpl.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await emailAccount.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await emailAccountFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
        const balance = await ethers.provider.getBalance(await emailAccount.getAddress());
        expect(balance).to.be.equal(ethers.parseEther("1000"));
    });

    it("should be able to send ETH to another account", async () => {
        const receipt = ethers.Wallet.createRandom().address;
        await assertSendEth(ethers.parseEther("100"), receipt);
    });

    async function prepareUserOp(callData: string) {
        const unsignedUserOperation = await generateUnsignedUserOp(
            context.entryPoint,
            context.provider,
            context.bundlerProvider,
            await emailAccount.getAddress(),
            callData
        );
        return await signUserOp(unsignedUserOperation);
    }

    async function signUserOp(unsignedUserOperation: any) {
        const chainId = await context.provider
            .getNetwork()
            .then((network) => network.chainId);

        const userOpHash = getUserOpHash(
            unsignedUserOperation,
            context.entryPoint,
            Number(chainId)
        );

        unsignedUserOperation.signature; // todo: sign the user op

        return unsignedUserOperation;
    }

    async function assertSendEth(amount: bigint, recipientAddress: string) {
        const recipientBalanceBefore = await ethers.provider.getBalance(
            recipientAddress
        );

        const executeFunctionSelector = "0x" + ethers.id("execute(address,uint256,bytes)").slice(2, 10);
        const callData = executeFunctionSelector + ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256", "bytes"],
            [recipientAddress, amount, "0x"]
        ).slice(2);

        const userOp = await prepareUserOp(callData);
        await sendUserOpAndWait(
            userOp,
            context.entryPoint,
            context.bundlerProvider
        );
        const recipientBalanceAfter = await ethers.provider.getBalance(
            recipientAddress
        );
        const expectedRecipientBalance = recipientBalanceBefore + amount;
        expect(recipientBalanceAfter).to.equal(expectedRecipientBalance);
    }

});


