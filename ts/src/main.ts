require("dotenv").config();
import { emailAuthAbi, emitEmailCommandAbi } from "./generated";
import {
    encodeAbiParameters,
    getContract,
    parseAbiParameters,
    createWalletClient,
    createPublicClient,
    http
} from "viem";
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains';
import { AbiFunction } from 'viem';
import { RelayerInput, CommandTypes } from './types';
import axios from "axios";

/// PRIVATE_KEY: a private key of the sender
if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY is not defined');
}
const privateKey: `0x${string}` = process.env.PRIVATE_KEY as `0x${string}`;

/// EMIT_EMAIL_COMMAND_ADDR: an address of the EmitEmailCommand contract
if (!process.env.EMIT_EMAIL_COMMAND_ADDR) {
    throw new Error('EMIT_EMAIL_COMMAND_ADDR is not defined');
}
const emitEmailCommandAddr: `0x${string}` = process.env.EMIT_EMAIL_COMMAND_ADDR as `0x${string}`;

/// DKIM_CONTRACT_ADDR: an address of the DKIM contract
if (!process.env.DKIM_CONTRACT_ADDR) {
    throw new Error('DKIM_CONTRACT_ADDR is not defined');
}
const dkimContractAddr: `0x${string}` = process.env.DKIM_CONTRACT_ADDR as `0x${string}`;

/// RELAYER_URL: a URL of the relayer
if (!process.env.RELAYER_URL) {
    throw new Error('RELAYER_URL is not defined');
}
const relayerUrl: string = process.env.RELAYER_URL;

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
})
const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http()
})

const account = privateKeyToAccount(privateKey);

const emitEmailCommandContract = getContract({
    address: emitEmailCommandAddr,
    abi: emitEmailCommandAbi,
    client: {
        public: publicClient,
        wallet: walletClient,
    }
});

async function getEmailAuthAddress(accountCode: string, emailAddress: string, ownerAddr: `0x${string}`): Promise<`0x${string}`> {
    const accountSalt: `0x${string}` = await axios({
        method: "POST",
        url: `${relayerUrl}/getAccountSalt`,
        data: {
            account_code: accountCode,
            email_addr: emailAddress,
        },
    });
    return emitEmailCommandContract.read.computeEmailAuthAddress([ownerAddr, accountSalt]);
}

async function fetchCommandTemplate(templateIdx: number): Promise<{ commandTemplate: string, templateId: string }> {
    const commandTemplates = await emitEmailCommandContract.read.commandTemplates();
    const commandTemplate = commandTemplates[templateIdx].join(' ');
    const templateId = await emitEmailCommandContract.read.computeTemplateId([BigInt(templateIdx)]);
    return { commandTemplate, templateId: `0x${templateId.toString(16)}` };
}

function buildCommandParams(templateIdx: CommandTypes, commandValue: string | number | bigint): string[] {
    let commandParams: string[] = [];
    switch (templateIdx) {
        case CommandTypes.String:
            commandParams.push(commandValue as string);
            break;
        case CommandTypes.Uint:
            commandParams.push(commandValue.toString());
            break;
        case CommandTypes.Int:
            commandParams.push(commandValue.toString());
            break;
        case CommandTypes.Decimals:
            commandParams.push(((commandValue as bigint) * (10n ** 18n)).toString());
            break;
        case CommandTypes.EthAddr:
            commandParams.push(commandValue as string);
            break;
        default:
            throw new Error('Unsupported command type');
    }
    return commandParams;
}

async function buildRelayerInput(
    accountCode: string,
    emailAddress: string,
    ownerAddr: `0x${string}`,
    templateIdx: CommandTypes,
    commandValue: string | number | bigint,
    subject: string,
    body: string
): Promise<RelayerInput> {
    const emailAuthAddr = await getEmailAuthAddress(accountCode, emailAddress, ownerAddr);
    const emailAuthCode = await publicClient.getCode({
        address: emailAuthAddr
    });
    const codeExistsInEmail = emailAuthCode === undefined;
    const { commandTemplate, templateId } = await fetchCommandTemplate(templateIdx);
    const commandParams = buildCommandParams(templateIdx, commandValue);
    return {
        dkimContractAddress: dkimContractAddr,
        accountCode,
        codeExistsInEmail,
        commandTemplate,
        commandParams,
        templateId: templateId.toString(),
        emailAddress,
        subject,
        body,
        chain: "baseSepolia"
    };
}

async function emitCommandViaEmail(
    accountCode: string,
    emailAddress: string,
    ownerAddr: `0x${string}`,
    templateIdx: CommandTypes,
    commandValue: string | number | bigint,
    subject: string,
    body: string
) {
    const relayerInput = await buildRelayerInput(accountCode, emailAddress, ownerAddr, templateIdx, commandValue, subject, body);
    const requestId: string = await axios({
        method: "POST",
        url: `${relayerUrl}/submit`,
        data: relayerInput,
    });
    // const hash = emitEmailCommandContract.write.emitEmailCommand([], {});
}