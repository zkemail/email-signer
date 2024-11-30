import { AbiFunction } from 'viem';

export enum CommandTypes {
    String = 0,
    Uint = 1,
    Int = 2,
    Decimals = 3,
    EthAddr = 4,
}


// export interface CommandParam {
//     String?: string;
//     Uint?: string;
//     Int?: string;
//     Decimals?: string;
//     EthAddr?: string;
// }

export interface RelayerAccountSaltResponse {
    accountCode: `0x${string}`;
    accountSalt: `0x${string}`;
    emailAddress: string;
}

export interface RelayerSubmitRequest {
    dkimContractAddress: string;
    accountCode: string;
    codeExistsInEmail: boolean;
    commandTemplate: string;
    commandParams: string[];
    templateId: string;
    emailAddress: string;
    subject: string;
    body: string;
    chain: string;
}

export interface RelayerSubmitResponse {
    message: string;
    id: string;
    status: string;
}

export interface RelayerStatusResponse {
    message: string;
    request: {
        body: RelayerSubmitRequest;
        id: string;
        status: string;
        updatedAt: string;
    },
    response: EmailAuthMsg;
}

export interface EmailProof {
    domainName: string; // Domain name of the sender's email
    publicKeyHash: `0x${string}`; // Hash of the DKIM public key used in email/proof
    timestamp: bigint; // Timestamp of the email
    maskedCommand: string; // Masked command of the email
    emailNullifier: `0x${string}`; // Nullifier of the email to prevent its reuse
    accountSalt: `0x${string}`; // Create2 salt of the account
    isCodeExist: boolean; // Check if the account code exists
    proof: `0x${string}`; // ZK Proof of Email
}

export interface EmailAuthMsg {
    templateId: bigint; // The ID of the command template that the command in the email body should satisfy
    commandParams: `0x${string}`[]; // The parameters in the command of the email body, which should be taken according to the specified command template
    skippedCommandPrefix: bigint; // The number of skipped bytes in the command
    proof: EmailProof; // The email proof containing the zk proof and other necessary information for the email verification by the verifier contract
}
