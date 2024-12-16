import { expect } from "chai";

import { Address, EmailAccount, EmailAccountFactory } from "../../typechain-types";
import { ethers } from "hardhat";

describe("EmailAccount", () => {
    let emailAccountFactory: EmailAccountFactory;
    let emailAccount: EmailAccount;
    let entryPoint: Address;

    before(async () => {
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

        entryPoint = entrypoints[0];

    })

    it("should have an entrypoint", () => {
        expect(entryPoint).to.not.be.null;
    });
});