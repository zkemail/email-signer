import {
  AbiCoder,
  BigNumberish,
  BytesLike,
  concat,
  hexlify,
  isHexString,
  JsonRpcProvider,
  keccak256,
} from "ethers";
import { ethers } from "ethers";
import { PackedUserOperationStruct } from "../../typechain-types/src/EmailAccount";
import { IEntryPoint__factory } from "../../typechain-types";

/**
 * @notice these utils have been largely copied from ERC4337Utils.ts in eth-infinitism's
 * bundler repo, which form part of @account-abstraction/utils. This is because
 * @account-abstraction/utils v0.7.0 has not been published on npm yet. These utility
 * function can be swapped out once v0.7.0 has been published.
 *
 * The only changes were to update ethers functionality from v5 to v6
 */

export type PackedUserOperation = PackedUserOperationStruct;

export type UserOperation = {
  sender: string;
  nonce: BigNumberish;
  factory?: string;
  factoryData?: BytesLike;
  callData: BytesLike;
  callGasLimit: BigNumberish;
  verificationGasLimit: BigNumberish;
  preVerificationGas: BigNumberish;
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
  paymaster?: string;
  paymasterVerificationGasLimit?: BigNumberish;
  paymasterPostOpGasLimit?: BigNumberish;
  paymasterData?: BytesLike;
  signature: BytesLike;
};

export type FactoryParams = {
  factory: string;
  factoryData?: BytesLike;
};

/**
 * calculate the userOpHash of a given userOperation.
 * The userOpHash is a hash of all UserOperation fields, except the "signature" field.
 * The entryPoint uses this value in the emitted UserOperationEvent.
 * A wallet may use this value as the hash to sign (the SampleWallet uses this method)
 * @param op
 * @param entryPoint
 * @param chainId
 */
export function getUserOpHash(
  op: UserOperation,
  entryPoint: string,
  chainId: number
): string {
  const userOpHash = keccak256(encodeUserOp(op, true));
  const defaultAbiCoder = AbiCoder.defaultAbiCoder();
  const enc = defaultAbiCoder.encode(
    ["bytes32", "address", "uint256"],
    [userOpHash, entryPoint, chainId]
  );
  return keccak256(enc);
}

/**
 * abi-encode the userOperation
 * @param op a PackedUserOp
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function encodeUserOp(
  op1: PackedUserOperation | UserOperation,
  forSignature = true
): string {
  // if "op" is unpacked UserOperation, then pack it first, before we ABI-encode it.

  let op: PackedUserOperation;
  if ("callGasLimit" in op1) {
    op = packUserOp(op1);
  } else {
    op = op1;
  }

  const defaultAbiCoder = AbiCoder.defaultAbiCoder();
  if (forSignature) {
    return defaultAbiCoder.encode(
      [
        "address",
        "uint256",
        "bytes32",
        "bytes32",
        "bytes32",
        "uint256",
        "bytes32",
        "bytes32",
      ],
      [
        op.sender,
        op.nonce,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.accountGasLimits,
        op.preVerificationGas,
        op.gasFees,
        keccak256(op.paymasterAndData),
      ]
    );
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return defaultAbiCoder.encode(
      [
        "address",
        "uint256",
        "bytes",
        "bytes",
        "bytes32",
        "uint256",
        "bytes32",
        "bytes",
        "bytes",
      ],
      [
        op.sender,
        op.nonce,
        op.initCode,
        op.callData,
        op.accountGasLimits,
        op.preVerificationGas,
        op.gasFees,
        op.paymasterAndData,
        op.signature,
      ]
    );
  }
}

export function packUserOp(op: UserOperation): PackedUserOperation {
  let paymasterAndData: BytesLike;
  if (op.paymaster == null) {
    paymasterAndData = "0x";
  } else {
    if (
      op.paymasterVerificationGasLimit == null ||
      op.paymasterPostOpGasLimit == null
    ) {
      throw new Error("paymaster with no gas limits");
    }
    paymasterAndData = packPaymasterData(
      op.paymaster,
      op.paymasterVerificationGasLimit,
      op.paymasterPostOpGasLimit,
      op.paymasterData
    );
  }

  return {
    sender: op.sender,
    nonce: "0x" + BigInt(op.nonce).toString(16),
    initCode:
      op.factory == null ? "0x" : concat([op.factory, op.factoryData ?? ""]),
    callData: op.callData,
    accountGasLimits: packUint(op.verificationGasLimit, op.callGasLimit),
    preVerificationGas: "0x" + BigInt(op.preVerificationGas).toString(16),
    gasFees: packUint(op.maxPriorityFeePerGas, op.maxFeePerGas),
    paymasterAndData,
    signature: op.signature,
  };
}

export function packPaymasterData(
  paymaster: string,
  paymasterVerificationGasLimit: BigNumberish,
  postOpGasLimit: BigNumberish,
  paymasterData?: BytesLike
): BytesLike {
  return concat([
    paymaster,
    packUint(paymasterVerificationGasLimit, postOpGasLimit),
    paymasterData ?? "0x",
  ]);
}

export function packUint(high128: BigNumberish, low128: BigNumberish): string {
  high128 = BigInt(high128);
  low128 = BigInt(low128);
  const packed = "0x" + ((high128 << 128n) + low128).toString(16);
  return hexZeroPad(packed, 32);
}

/**
 * @notice Copied from ethers v5.7 as the ethers v6 equivalent behaves
 * in a way the bundler doesn't expect and an error is thrown
 */
export function hexZeroPad(value: BytesLike, length: number): string {
  if (typeof value !== "string") {
    value = hexlify(value);
  } else if (!isHexString(value)) {
    console.log("invalid hex string", "value", value);
  }

  if (value.length > 2 * length + 2) {
    console.log("value out of range", "value", arguments[1]);
  }

  while (value.length < 2 * length + 2) {
    value = "0x0" + value.substring(2);
  }

  return value;
}

export const getGasEstimates = async (
  provider: ethers.JsonRpcProvider,
  bundlerProvider: ethers.JsonRpcProvider,
  partialUserOperation: Partial<UserOperation>,
  entryPointAddress: string
) => {
  const gasEstimate = (await bundlerProvider.send(
    "eth_estimateUserOperationGas",
    [partialUserOperation, entryPointAddress]
  )) as {
    verificationGasLimit: string;
    preVerificationGas: string;
    paymasterVerificationGasLimit: string;
    callGasLimit: string;
  };

  const safeVerificationGasLimit =
    BigInt(gasEstimate.verificationGasLimit) +
    BigInt(gasEstimate.verificationGasLimit); // + 100% TODO: (merge-ok) why do we have to increase the limit so much for all tests to pass?

  const safePreVerificationGas =
    BigInt(gasEstimate.preVerificationGas) +
    BigInt(gasEstimate.preVerificationGas) / 10n; // + 10%

  const { maxFeePerGas, maxPriorityFeePerGas } = await getFeeData(provider);

  return {
    callGasLimit: gasEstimate.callGasLimit,
    verificationGasLimit: ethers.toBeHex(safeVerificationGasLimit),
    preVerificationGas: ethers.toBeHex(safePreVerificationGas),
    paymasterVerificationGasLimit: ethers.toBeHex(safeVerificationGasLimit),
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
};

export async function getFeeData(provider: ethers.Provider) {
  const feeData = await provider.getFeeData();
  if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
    throw new Error(
      "maxFeePerGas or maxPriorityFeePerGas is null or undefined"
    );
  }

  const maxFeePerGas = "0x" + feeData.maxFeePerGas.toString();
  const maxPriorityFeePerGas = "0x" + feeData.maxPriorityFeePerGas.toString();

  return { maxFeePerGas, maxPriorityFeePerGas };
}

export const createUserOperation = async (
  provider: ethers.JsonRpcProvider,
  bundlerProvider: ethers.JsonRpcProvider,
  accountAddress: string,
  factoryParams: FactoryParams,
  userOpCallData: string,
  entryPointAddress: string,
  dummySignature: string,
  paymaster?: string,
  paymasterPostOpGasLimit?: BigNumberish,
  paymasterData?: BytesLike
) => {
  const entryPoint = IEntryPoint__factory.connect(
    entryPointAddress,
    await provider.getSigner()
  );
  const nonce = await entryPoint.getNonce(accountAddress, "0x00");
  const nonceHex = "0x0" + nonce.toString();

  let userOp: Partial<UserOperation> = {
    sender: accountAddress,
    nonce: nonceHex,
    callData: userOpCallData,
    callGasLimit: "0x00",
    signature: dummySignature,
  };

  if (factoryParams.factory !== "0x") {
    userOp.factory = factoryParams.factory;
    userOp.factoryData = factoryParams.factoryData;
  }

  const {
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    paymasterVerificationGasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = await getGasEstimates(
    provider,
    bundlerProvider,
    userOp,
    entryPointAddress
  );

  const unsignedUserOperation = {
    sender: accountAddress,
    nonce: nonceHex,
    factory: userOp.factory,
    factoryData: userOp.factoryData,
    callData: userOpCallData,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymaster: paymaster,
    paymasterVerificationGasLimit: paymaster
      ? paymasterVerificationGasLimit
      : undefined,
    paymasterPostOpGasLimit: paymasterPostOpGasLimit,
    paymasterData: paymasterData,
    signature: dummySignature,
  } satisfies UserOperation;

  return await ethers.resolveProperties(unsignedUserOperation);
};

export default async function sendUserOpAndWait(
  userOp: UserOperation,
  entryPoint: string,
  bundlerProvider: ethers.JsonRpcProvider,
  pollingDelay = 100,
  maxAttempts = 200
) {
  const userOpHash = (await bundlerProvider.send("eth_sendUserOperation", [
    userOp,
    entryPoint,
  ])) as string;

  let receipt: { success: boolean } | null = null;

  let attempts = 0;

  while (attempts < maxAttempts && receipt === null) {
    await sleep(pollingDelay);

    receipt = (await bundlerProvider.send("eth_getUserOperationReceipt", [
      userOpHash,
    ])) as { success: boolean } | null;

    attempts++;
  }

  if (receipt === null) {
    throw new Error(`Could not get receipt after ${maxAttempts} attempts`);
  }

  return receipt;
}

export async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function generateUnsignedUserOp(
  entryPointAddress: string,
  provider: JsonRpcProvider,
  bundlerProvider: JsonRpcProvider,
  emailAccountAddress: string,
  callData: string
) {

  return await createUserOperation(
    provider,
    bundlerProvider,
    emailAccountAddress,
    { factory: "0x", factoryData: "0x" },
    callData,
    entryPointAddress,
    "0x00000000000000000000000000000000000000000000000000000000000000201bd88348ccb7396aa7a29d6f7107c793b5b24b8cec1ccfdd9de3f1d61ab6c1dd000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020ad9f3fd30336d8fa2512f7ee06a38c37d28036f13223316cbc9af6020c95989300000000000000000000000000000000000000000000000000000000000001000ea9c777dc7110e5a9e89b13f0cfc540e3845ba120b2b6dc24024d61488d4788000000000000000000000000000000000000000000000000000000006776995f000000000000000000000000000000000000000000000000000000000000014027e8aff25b74805f4a9c81689409ff8c7899d3ef83ae5c8d717e30790f47fa9e200ab4951e3c39b9d18aa3a1dd748cc206bdf7f4999144e5a2c71fabd0537af1000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000009676d61696c2e636f6d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000567369676e48617368203738353331343931393837313131393432373236363233393834383839333335343633313738383334323731303735313736383738393534373332363133383436303531383638343831363833000000000000000000000000000000000000000000000000000000000000000000000000000000000100123758b87d2e955b61a3653d3696f56b40388a115699d86b4a5722a3c4d216cb19ef23a3058b60ea746d64d54a31529e54ae7f213eb9403d8ab65e611e20333a16f8f97ea034b3af29345aff04eec5ec31cd3425c85dec5082cf66d305b3ce8404a2418450049fb9284e04e644fbae207f039daf0f7f4a120655ad9d4c49476902c7dbdb6b40c1e9e6b4a33a7960fc4a886e2c9acc8a08cebfe83a8738553fc91680bbb1b673f3542a8f495a5b779d3a55694616ea6a2718903272dffbafffc02629a743a514954ec4f2094b29512d9f6292564ad43e95902ec40e4c69926f4412def83312cf2cc95e84063a26180c61f88953765763cb307db1f1abffb6a3f8" // Temporary placeholder for signature
  );
}

