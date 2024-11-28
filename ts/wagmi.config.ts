import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [
    foundry({
      project: '../contracts',
      // artifacts: 'artifacts/',
      include: [
        "EmailAuth.sol/EmailAuth.json",
        "EmitEmailCommand.sol/EmitEmailCommand.json",
      ]
    }),
  ],
})
