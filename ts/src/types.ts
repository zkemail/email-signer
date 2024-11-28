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

export interface RelayerInput {
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