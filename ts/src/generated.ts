//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EmailAuth
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const emailAuthAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    inputs: [],
    name: 'UPGRADE_INTERFACE_VERSION',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'accountSalt',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'emailAuthMsg',
        internalType: 'struct EmailAuthMsg',
        type: 'tuple',
        components: [
          { name: 'templateId', internalType: 'uint256', type: 'uint256' },
          { name: 'commandParams', internalType: 'bytes[]', type: 'bytes[]' },
          {
            name: 'skippedCommandPrefix',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'proof',
            internalType: 'struct EmailProof',
            type: 'tuple',
            components: [
              { name: 'domainName', internalType: 'string', type: 'string' },
              {
                name: 'publicKeyHash',
                internalType: 'bytes32',
                type: 'bytes32',
              },
              { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
              { name: 'maskedCommand', internalType: 'string', type: 'string' },
              {
                name: 'emailNullifier',
                internalType: 'bytes32',
                type: 'bytes32',
              },
              { name: 'accountSalt', internalType: 'bytes32', type: 'bytes32' },
              { name: 'isCodeExist', internalType: 'bool', type: 'bool' },
              { name: 'proof', internalType: 'bytes', type: 'bytes' },
            ],
          },
        ],
      },
    ],
    name: 'authEmail',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'commandTemplates',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'controller',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_templateId', internalType: 'uint256', type: 'uint256' }],
    name: 'deleteCommandTemplate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'dkimRegistryAddr',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_templateId', internalType: 'uint256', type: 'uint256' }],
    name: 'getCommandTemplate',
    outputs: [{ name: '', internalType: 'string[]', type: 'string[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_dkimRegistryAddr', internalType: 'address', type: 'address' },
    ],
    name: 'initDKIMRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_verifierAddr', internalType: 'address', type: 'address' },
    ],
    name: 'initVerifier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_initialOwner', internalType: 'address', type: 'address' },
      { name: '_accountSalt', internalType: 'bytes32', type: 'bytes32' },
      { name: '_controller', internalType: 'address', type: 'address' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_templateId', internalType: 'uint256', type: 'uint256' },
      { name: '_commandTemplate', internalType: 'string[]', type: 'string[]' },
    ],
    name: 'insertCommandTemplate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'lastTimestamp',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_enabled', internalType: 'bool', type: 'bool' }],
    name: 'setTimestampCheckEnabled',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'timestampCheckEnabled',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_templateId', internalType: 'uint256', type: 'uint256' },
      { name: '_commandTemplate', internalType: 'string[]', type: 'string[]' },
    ],
    name: 'updateCommandTemplate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_dkimRegistryAddr', internalType: 'address', type: 'address' },
    ],
    name: 'updateDKIMRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_verifierAddr', internalType: 'address', type: 'address' },
    ],
    name: 'updateVerifier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'usedNullifiers',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'verifierAddr',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'templateId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'CommandTemplateDeleted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'templateId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'CommandTemplateInserted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'templateId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'CommandTemplateUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'dkimRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DKIMRegistryUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'emailNullifier',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'accountSalt',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'isCodeExist',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
      {
        name: 'templateId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EmailAuthed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'enabled', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'TimestampCheckEnabled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'implementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Upgraded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'verifier',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'VerifierUpdated',
  },
  {
    type: 'error',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'AddressEmptyCode',
  },
  {
    type: 'error',
    inputs: [
      { name: 'implementation', internalType: 'address', type: 'address' },
    ],
    name: 'ERC1967InvalidImplementation',
  },
  { type: 'error', inputs: [], name: 'ERC1967NonPayable' },
  { type: 'error', inputs: [], name: 'FailedInnerCall' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'UUPSUnauthorizedCallContext' },
  {
    type: 'error',
    inputs: [{ name: 'slot', internalType: 'bytes32', type: 'bytes32' }],
    name: 'UUPSUnsupportedProxiableUUID',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EmailSignerFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const emailSignerFactoryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_verifierAddr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_dkimAddr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_emailAuthImplementationAddr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_emailSignerImplementationAddr",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deployEmailSigner",
    "inputs": [
      {
        "name": "_accountSalt",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "dkim",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "emailAuthImplementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "emailSignerImplementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEmailSignerAddress",
    "inputs": [
      {
        "name": "_accountSalt",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifier",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  }
] as const;

export const emailSignerAbi = [
  {
    "type": "function",
    "name": "computeTemplateId",
    "inputs": [
      {
        "name": "templateIdx",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "dkim",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "emailAuthAddr",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "emailAuthImplementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "esign",
    "inputs": [
      {
        "name": "emailAuthMsg",
        "type": "tuple",
        "internalType": "struct IEmailAuth.EmailAuthMsg",
        "components": [
          {
            "name": "templateId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "commandParams",
            "type": "bytes[]",
            "internalType": "bytes[]"
          },
          {
            "name": "skippedCommandPrefix",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proof",
            "type": "tuple",
            "internalType": "struct IEmailAuth.EmailProof",
            "components": [
              {
                "name": "domainName",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "publicKeyHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "timestamp",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "maskedCommand",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "emailNullifier",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "accountSalt",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "isCodeExist",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "proof",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "_verifierAddr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_dkimAddr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_emailAuthImplementationAddr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_accountSalt",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isHashSigned",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifier",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Initialized",
    "inputs": [
      {
        "name": "version",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SignHashCommand",
    "inputs": [
      {
        "name": "hash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidInitialization",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotInitializing",
    "inputs": []
  }
] as const;