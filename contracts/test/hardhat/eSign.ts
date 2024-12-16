require("dotenv").config();
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

/**
 * Get the account salt for the given account code and email address
 * @param accountCode account code
 * @param emailAddress email address
 * @returns the account salt
 */
async function getAccountSalt(accountCode: string, emailAddress: string): Promise<`0x${string}`> {
    const res = await axios<RelayerAccountSaltResponse>({
        method: "POST",
        url: `${relayerUrl}/accountSalt`,
        data: {
            accountCode: accountCode,
            emailAddress: emailAddress,
        },
    });
    return res.data.accountSalt;
}


/**
 * Build the input to submit the request to the relayer
 * @param emitEmailCommandContract the contract instance of EmitEmailCommand
 * @param dkimContractAddr DKIM contract address
 * @param accountCode account code
 * @param emailAddress email address
 * @param hash the hash to sign
 * @returns promise of the relayer submit request
 */
async function buildRelayerInput(
    dkimContractAddr: `0x${string}`,
    accountCode: string,
    emailAddress: string,
    hash: string,
): Promise<RelayerSubmitRequest> {
    const { commandTemplate, templateId } = {
        commandTemplate: "signHash {uint}",
        templateId: "0x1bd88348ccb7396aa7a29d6f7107c793b5b24b8cec1ccfdd9de3f1d61ab6c1dd"
    };
    const commandParams = [hash];
    return {
        dkimContractAddress: dkimContractAddr,
        accountCode,
        codeExistsInEmail: true,
        commandTemplate,
        commandParams,
        templateId: templateId.toString(),
        emailAddress,
        subject: "Signature request",
        body: "Please sign the following hash: " + hash,
        chain: "dev"
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

export async function signHash(
    dkimContractAddr: `0x${string}`,
    accountCode: string,
    emailAddress: string,
    hash: string,
    timeout: number = 120000,
): Promise<EmailAuthMsg> {

    const relayerInput = await buildRelayerInput(dkimContractAddr, accountCode, emailAddress, hash);
    console.log(`Relayer Input: ${JSON.stringify(relayerInput)}`);
    const res = await axios<RelayerSubmitResponse>({
        method: "POST",
        url: `${relayerUrl}/submit`,
        data: relayerInput,
    });
    const id = res.data.id;
    console.log(`Request ID: ${id}`);

    const emailAuthMsg = await checkStatus(id, timeout);

    console.log(`Email Auth Msg: ${JSON.stringify(emailAuthMsg)}`);

    return emailAuthMsg;
}
