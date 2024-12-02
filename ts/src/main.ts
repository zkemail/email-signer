require("dotenv").config();
import { emitEmailCommandAbi } from "./generated";
import {
    getContract,
    createWalletClient,
    createPublicClient,
    http,
    GetContractReturnType,
    WalletClient
} from "viem";
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains';
import { RelayerSubmitRequest, RelayerStatusResponse, CommandTypes, RelayerSubmitResponse, EmailAuthMsg, RelayerAccountSaltResponse } from './types';
import axios from "axios";


/// PRIVATE_KEY: a private key of the sender
if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY is not defined');
}
const privateKey: `0x${string}` = process.env.PRIVATE_KEY as `0x${string}`;

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

type EmitEmailCommandContract = GetContractReturnType<typeof emitEmailCommandAbi, WalletClient>;

/**
 * Get the email auth address for the given account code, email address, and owner address
 * @param emitEmailCommandContract the contract instance of EmitEmailCommand
 * @param accountCode account code
 * @param emailAddress email address
 * @param ownerAddr owner address for the email auth contract
 * @returns promise of the email auth address
 */
async function getEmailAuthAddress(emitEmailCommandContract: EmitEmailCommandContract, accountCode: string, emailAddress: string, ownerAddr: `0x${string}`): Promise<`0x${string}`> {
    const res = await axios<RelayerAccountSaltResponse>({
        method: "POST",
        url: `${relayerUrl}/accountSalt`,
        data: {
            accountCode: accountCode,
            emailAddress: emailAddress,
        },
    });
    return emitEmailCommandContract.read.computeEmailAuthAddress([ownerAddr, res.data.accountSalt]);
}

/**
 * Fetch the command template and its ID for the given template index from the EmitEmailCommand contract
 * @param emitEmailCommandContract  the contract instance of EmitEmailCommand
 * @param templateIdx the index of the command template
 * @returns promise of the command template and its ID
 */
async function fetchCommandTemplate(emitEmailCommandContract: EmitEmailCommandContract, templateIdx: number): Promise<{ commandTemplate: string, templateId: string }> {
    const commandTemplates = await emitEmailCommandContract.read.commandTemplates();
    const commandTemplate = commandTemplates[templateIdx].join(' ');
    const templateId = await emitEmailCommandContract.read.computeTemplateId([BigInt(templateIdx)]);
    return { commandTemplate, templateId: `0x${templateId.toString(16)}` };
}

/**
 * Build the command parameters for the given template index and command value
 * @param templateIdx the index of the command template
 * @param commandValue the value of the command parameter
 * @returns the command parameters
 */
function buildCommandParams(templateIdx: CommandTypes, commandValue: string): string[] {
    let commandParams: string[] = [];
    switch (templateIdx) {
        case CommandTypes.String:
            commandParams.push(commandValue as string);
            break;
        case CommandTypes.Uint:
            const uintValue = Number(commandValue);
            if (Number.isInteger(uintValue) === false) {
                throw new Error('Uint value must be an integer');
            }
            if (uintValue < 0) {
                throw new Error('Uint value must be greater than or equal to 0');
            }
            commandParams.push(commandValue);
            break;
        case CommandTypes.Int:
            const intValue = Number(commandValue);
            if (Number.isInteger(intValue) === false) {
                throw new Error('Int value must be an integer');
            }
            commandParams.push(commandValue);
            break;
        case CommandTypes.Decimals:
            // [TODO] Assert the format of the given value
            commandParams.push(commandValue);
            break;
        case CommandTypes.EthAddr:
            // [TODO] Assert the format of the given value
            commandParams.push(commandValue as string);
            break;
        default:
            throw new Error('Unsupported command type');
    }
    return commandParams;
}

/**
 * Build the input to submit the request to the relayer
 * @param emitEmailCommandContract the contract instance of EmitEmailCommand
 * @param dkimContractAddr DKIM contract address
 * @param accountCode account code
 * @param emailAddress email address
 * @param ownerAddr owner address for the email auth contract
 * @param templateIdx the index of the command template
 * @param commandValue the value of the command parameter
 * @param subject subject of the email
 * @param body body of the email
 * @returns promise of the relayer submit request
 */
async function buildRelayerInput(
    emitEmailCommandContract: EmitEmailCommandContract,
    dkimContractAddr: `0x${string}`,
    accountCode: string,
    emailAddress: string,
    ownerAddr: `0x${string}`,
    templateIdx: CommandTypes,
    commandValue: string,
    subject: string,
    body: string
): Promise<RelayerSubmitRequest> {
    const emailAuthAddr = await getEmailAuthAddress(emitEmailCommandContract, accountCode, emailAddress, ownerAddr);
    console.log(`Email Auth Address: ${emailAuthAddr}`);
    const emailAuthCode = await publicClient.getCode({
        address: emailAuthAddr
    });
    console.log(`Email Auth Code: ${emailAuthCode}`);
    const codeExistsInEmail = emailAuthCode === undefined;
    console.log(`Code Exists in Email: ${codeExistsInEmail}`);
    const { commandTemplate, templateId } = await fetchCommandTemplate(emitEmailCommandContract, templateIdx);
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

/**
 * Check the status of the request with the given ID
 * @param id request ID
 * @param timeout timeout in milliseconds
 * @returns promise of the email auth message returned by the relayer
 */
const checkStatus = async (id: string, timeout: number): Promise<EmailAuthMsg> => {
    const startTime = Date.now();
    console.log("Waiting for the user's reply...");
    while (Date.now() - startTime < timeout) {
        try {
            const res = await axios<RelayerStatusResponse>({
                method: "GET",
                url: `${relayerUrl}/status/${id}`,
            });

            if (res.data.request.status === "Finished") {
                return res.data.response;
            }
        } catch (e) {
            console.log(e);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error("Timeout");
};

/**
 * Emit a command on-chain via email
 * @param emitEmailCommandAddr  the address of the EmitEmailCommand contract
 * @param accountCode account code
 * @param emailAddress email address
 * @param ownerAddr owner address for the email auth contract
 * @param templateIdx the index of the command template
 * @param commandValue the value of the command parameter
 * @param subject subject of the email
 * @param body body of the email
 * @param timeout timeout in milliseconds
 * @returns 
 */
export async function emitCommandViaEmail(
    emitEmailCommandAddr: `0x${string}`,
    accountCode: string,
    emailAddress: string,
    ownerAddr: `0x${string}`,
    templateIdx: CommandTypes,
    commandValue: string,
    subject: string,
    body: string,
    timeout: number = 120000
): Promise<`0x${string}`> {
    const emitEmailCommandContract = getContract({
        address: emitEmailCommandAddr,
        abi: emitEmailCommandAbi,
        client: {
            public: publicClient,
            wallet: walletClient,
        }
    });
    const dkimContractAddr = await emitEmailCommandContract.read.dkimAddr();
    const relayerInput = await buildRelayerInput(emitEmailCommandContract, dkimContractAddr, accountCode, emailAddress, ownerAddr, templateIdx, commandValue, subject, body);
    console.log(`Relayer Input: ${JSON.stringify(relayerInput)}`);
    const res = await axios<RelayerSubmitResponse>({
        method: "POST",
        url: `${relayerUrl}/submit`,
        data: relayerInput,
    });
    const id = res.data.id;
    console.log(`Request ID: ${id}`);

    try {
        const emailAuthMsg = await checkStatus(id, timeout);
        const hash = emitEmailCommandContract.write.emitEmailCommand([emailAuthMsg, ownerAddr, BigInt(templateIdx)], {
            account
        });
        return hash;
    } catch (e) {
        throw new Error(`Failed to emit command via email: ${e}`);
    }
}

