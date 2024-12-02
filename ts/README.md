## Examples
- Emit `{string}`
`npx ts-node src/cli.ts --emit-email-command-addr <EMIT_EMAIL_COMMAND_ADDRESS> --account-code <ACCOUNT_CODE> --email-addr <EMAIL_ADDRESS> --owner-addr <OWNER_ADDRESS_OF_EMAIL_AUTH> --template-idx 0 --command-value "Hello" --subject "Emit a string Hello" --body "Emit a string Hello"`

- Emit `{uint}`
`npx ts-node src/cli.ts --emit-email-command-addr <EMIT_EMAIL_COMMAND_ADDRESS> --account-code <ACCOUNT_CODE> --email-addr <EMAIL_ADDRESS> --owner-addr <OWNER_ADDRESS_OF_EMAIL_AUTH> --template-idx 1 --command-value "123" --subject "Emit an uint 123" --body "Emit an uint 123"`

- Emit `{int}`
`npx ts-node src/cli.ts --emit-email-command-addr <EMIT_EMAIL_COMMAND_ADDRESS> --account-code <ACCOUNT_CODE> --email-addr <EMAIL_ADDRESS> --owner-addr <OWNER_ADDRESS_OF_EMAIL_AUTH> --template-idx 2 --command-value "-123" --subject "Emit an int -123" --body "Emit an int -123"`

- Emit `{decimals}`
`npx ts-node src/cli.ts --emit-email-command-addr <EMIT_EMAIL_COMMAND_ADDRESS> --account-code <ACCOUNT_CODE> --email-addr <EMAIL_ADDRESS> --owner-addr <OWNER_ADDRESS_OF_EMAIL_AUTH> --template-idx 3 --command-value "1.23" --subject "Emit decimals 1.23" --body "Emit decimals 1.23"`

- Emit `{ethAddr}`
`npx ts-node src/cli.ts --emit-email-command-addr <EMIT_EMAIL_COMMAND_ADDRESS> --account-code <ACCOUNT_CODE> --email-addr <EMAIL_ADDRESS> --owner-addr <OWNER_ADDRESS_OF_EMAIL_AUTH> --template-idx 4 --command-value "0x6956856464EaA434f22B42642e9089fF8e5C9cE9" --subject "Emit an ethereum address 0x6956856464EaA434f22B42642e9089fF8e5C9cE9" --body "Emit an ethereum address 0x6956856464EaA434f22B42642e9089fF8e5C9cE9"`