import { program } from "commander";
import { signHash } from "./main";

program
    .requiredOption(
        "--account-code <string>",
        "A hex string of the account code"
    )
    .requiredOption(
        "--email-addr <string>",
        "Email address of the user"
    )
    .requiredOption(
        "--hash <string>",
        "Hash to sign"
    )
    .option(
        "--timeout <number>",
        "Timeout to wait for the response from the relayer",
    )
    .parse();

const args = program.opts();
(async () => {
    try {
        const hash = await signHash(
            args.accountCode as `0x${string}`,
            args.emailAddr,
            args.hash.startsWith('0x') ? BigInt(args.hash).toString() : args.hash,
            args.timeout
        );
        console.log(`Command emitted successfully with hash: ${hash}`);
    } catch (e) {
        console.error(`Failed to emit command via email: ${e}`);
    }
})();
