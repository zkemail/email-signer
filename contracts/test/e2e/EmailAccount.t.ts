import { expect } from "chai";
import { Address, EmailAccount, EmailAccountFactory, Verifier, UserOverrideableDKIMRegistry, EmailAuth, Groth16Verifier, MockDKIMRegistry } from "../../typechain-types";
import { ethers } from "hardhat";
import { AbstractProvider, JsonRpcProvider } from "ethers";
import sendUserOpAndWait, { generateUnsignedUserOp, getUserOpHash } from "./userOpUtils";
import { signHash } from "./eSign";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("EmailAccount", () => {

    let emailAccountFactory: EmailAccountFactory;
    let emailAccountImpl: EmailAccount;
    let emailAccount: EmailAccount;
    let verifier: Verifier;
    let dkim: MockDKIMRegistry;
    let emailAuthImpl: EmailAuth;

    let email = "snparvizi75@gmail.com";
    let accountCode = "0x22a2d51a892f866cf3c6cc4e138ba87a8a5059a1d80dea5b8ee8232034a105b7";
    let salt = `0x200ab4951e3c39b9d18aa3a1dd748cc206bdf7f4999144e5a2c71fabd0537af1`;

    let domainName = "gmail.com";
    let publicKeyHash = "0x0ea9c777dc7110e5a9e89b13f0cfc540e3845ba120b2b6dc24024d61488d4788";
    let deployer: SignerWithAddress;

    let context: {
        provider: JsonRpcProvider;
        bundlerProvider: JsonRpcProvider;
        entryPoint: string;
    }

    before(async () => {
        [deployer] = await ethers.getSigners();
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
        const dkimFactory = await ethers.getContractFactory("MockDKIMRegistry");
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
        dkim = await ethers.getContractAt("MockDKIMRegistry", await dkimProxy.getAddress());

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
        await dkim.connect(deployer).setDKIMPublicKeyHash(
            domainName,
            publicKeyHash,
            await deployer.getAddress(),
            "0x"
        );
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

        const signature = await signHash(
            await dkim.getAddress() as `0x${string}`,
            accountCode, // account code
            email,
            BigInt(userOpHash).toString(),
            1200000
        );

        unsignedUserOperation.signature = await emailAccount.abiEncode(signature);

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


