import { program } from "commander";
import { emitCommandViaEmail } from "./main";
import { CommandTypes } from "types";

program
    .requiredOption(
        "--emit-email-command-addr <string>",
        "Address of the EmitEmailCommand contract"
    )
    .requiredOption(
        "--account-code <string>",
        "A hex string of the account code"
    )
    .requiredOption(
        "--email-addr <string>",
        "Email address of the user"
    )
    .requiredOption(
        "--owner-addr <string>",
        "Address of the owner of the EmailAuth contract"
    )
    .requiredOption(
        "--template-idx <number>",
        "Index of the command template defined in the EmitEmailCommand contract"
    )
    .requiredOption(
        "--command-value <string>",
        "Value of the command"
    )
    .requiredOption(
        "--subject <string>",
        "Subject of the email"
    )
    .requiredOption(
        "--body <string>",
        "Body of the email"
    )
    .option(
        "--timeout <number>",
        "Timeout to wait for the response from the relayer",
    )
    .parse();

const args = program.opts();
(async () => {
    try {
        const hash = await emitCommandViaEmail(
            args.emitEmailCommandAddr as `0x${string}`,
            args.accountCode as `0x${string}`,
            args.emailAddr,
            args.ownerAddr as `0x${string}`,
            Number(args.templateIdx) as CommandTypes,
            args.commandValue,
            args.subject,
            args.body,
            args.timeout
        );
        console.log(`Command emitted successfully with hash: ${hash}`);
    } catch (e) {
        console.error(`Failed to emit command via email: ${e}`);
    }
})();
