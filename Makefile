JQ := jq -r

EMIT_EMAIL_COMMAND_ADDRESS := $(shell $(JQ) '.transactions[] | select(.contractName == "EmitEmailCommand") | .contractAddress' ./broadcast/DeployEmitEmailCommand.s.sol/11155111/run-latest.json)
DKIM_ADDRESS := $(shell $(JQ) '.transactions[] | select(.contractName == "ECDSAOwnedDKIMRegistry") | .contractAddress' ./broadcast/DeployEmitEmailCommand.s.sol/11155111/run-latest.json)
DKIM_PROXY_ADDRESS := $(shell $(JQ) '.transactions[] | select(.contractName == "ERC1967Proxy") | .contractAddress' ./broadcast/DeployEmitEmailCommand.s.sol/11155111/run-latest.json | head -n 1)

# Check if addresses are empty
ifeq ($(EMIT_EMAIL_COMMAND_ADDRESS),)
$(error EmitEmailCommand address not found in the deployment file)
endif

ifeq ($(DKIM_PROXY_ADDRESS),)
$(error DKIM Proxy address not found in the deployment file)
endif

# Other variables
ACCOUNT_CODE := 0x22a2d51a892f866cf3c6cc4e138ba87a8a5059a1d80dea5b8ee8232034a105b7
SUBJECT := "Hello World"
BODY := "Sending a hello world!"
CHAIN := sepolia

# Check if EMAIL is provided 
ifeq ($(MAKECMDGOALS),submit)
ifndef EMAIL
$(error EMAIL is not set. Usage: make submit EMAIL=your@email.com)
endif
endif

# Function ABI
FUNCTION_ABI := { \
    "type": "function", \
    "name": "emitEmailCommand", \
    "inputs": [ \
        { \
            "name": "emailAuthMsg", \
            "type": "tuple", \
            "internalType": "struct EmailAuthMsg", \
            "components": [ \
                { \
                    "name": "templateId", \
                    "type": "uint256", \
                    "internalType": "uint256" \
                }, \
                { \
                    "name": "commandParams", \
                    "type": "bytes[]", \
                    "internalType": "bytes[]" \
                }, \
                { \
                    "name": "skippedCommandPrefix", \
                    "type": "uint256", \
                    "internalType": "uint256" \
                }, \
                { \
                    "name": "proof", \
                    "type": "tuple", \
                    "internalType": "struct EmailProof", \
                    "components": [ \
                        { \
                            "name": "domainName", \
                            "type": "string", \
                            "internalType": "string" \
                        }, \
                        { \
                            "name": "publicKeyHash", \
                            "type": "bytes32", \
                            "internalType": "bytes32" \
                        }, \
                        { \
                            "name": "timestamp", \
                            "type": "uint256", \
                            "internalType": "uint256" \
                        }, \
                        { \
                            "name": "maskedCommand", \
                            "type": "string", \
                            "internalType": "string" \
                        }, \
                        { \
                            "name": "emailNullifier", \
                            "type": "bytes32", \
                            "internalType": "bytes32" \
                        }, \
                        { \
                            "name": "accountSalt", \
                            "type": "bytes32", \
                            "internalType": "bytes32" \
                        }, \
                        { \
                            "name": "isCodeExist", \
                            "type": "bool", \
                            "internalType": "bool" \
                        }, \
                        { \
                            "name": "proof", \
                            "type": "bytes", \
                            "internalType": "bytes" \
                        } \
                    ] \
                } \
            ] \
        }, \
        { \
            "name": "owner", \
            "type": "address", \
            "internalType": "address" \
        }, \
        { \
            "name": "templateIdx", \
            "type": "uint256", \
            "internalType": "uint256" \
        } \
    ], \
    "outputs": [], \
    "stateMutability": "nonpayable" \
}

# Debug flag
DEBUG ?= 0

# Default target
.PHONY: submit
submit: show-addresses test-generic-relayer

# Test the generic relayer API
.PHONY: test-generic-relayer
test-generic-relayer:
	@echo "Submitting transaction to generic relayer API..."
ifeq ($(DEBUG),1)
	@echo "Using the following data:"
	@echo "  EMIT_EMAIL_COMMAND_ADDRESS: $(EMIT_EMAIL_COMMAND_ADDRESS)"
	@echo "  DKIM_PROXY_ADDRESS: $(DKIM_PROXY_ADDRESS)"
	@echo "  EMAIL: $(EMAIL)"
endif
	@curl -L 'https://relayer.zk.email/api/submit' \
	-H 'Content-Type: application/json' \
	-H 'Accept: application/json' \
	--data-raw '{ \
		"contractAddress": "$(EMIT_EMAIL_COMMAND_ADDRESS)", \
		"dkimContractAddress": "$(DKIM_PROXY_ADDRESS)", \
		"accountCode": "$(ACCOUNT_CODE)", \
		"codeExistsInEmail": true, \
		"functionAbi": $(FUNCTION_ABI), \
		"commandTemplate": "Emit string {string}", \
		"commandParams": [ \
			"testing" \
		], \
		"templateId": "0x25d6c3eada7b2926c822bbfebfc3173123afb205cf093a8cae6622a56712f8a", \
		"remainingArgs": [ \
			{ \
				"Address": "0x9401296121FC9B78F84fc856B1F8dC88f4415B2e" \
			}, \
			{ \
				"Uint": "0x0" \
			} \
		], \
		"emailAddress": "$(EMAIL)", \
		"subject": $(SUBJECT), \
		"body": $(BODY), \
		"chain": "$(CHAIN)" \
	}'

# Status command
.PHONY: status
status:
	@if [ -z "$(REQUEST)" ]; then \
		echo "Error: REQUEST is not set. Usage: make status REQUEST=<request-id>"; \
		exit 1; \
	fi
	@echo "Checking status for request: $(REQUEST)"
	@curl -L 'https://relayer.zk.email/api/status/$(REQUEST)' \
	-H 'Accept: application/json'

# Help target
.PHONY: help
help:
	@echo ""
	@echo "Available targets:"
	@echo "  submit EMAIL=your@email.com [DEBUG=1]    Submit a transaction to the generic relayer API"
	@echo "  status REQUEST=<request-id>              Check the status of a specific request"
	@echo "  help                                     Display this help message"
	@echo ""
	@echo "Options:"
	@echo "  DEBUG=1    Enable debug mode to show addresses and email"
	@echo ""
