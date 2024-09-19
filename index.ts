import "dotenv/config"
import { writeFileSync } from "fs"
import { toSafeSmartAccount } from "permissionless/accounts"
import { Hex, createPublicClient, getContract, http } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { baseSepolia } from "viem/chains"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import {  createBundlerClient, entryPoint07Address } from "viem/account-abstraction"
import { createSmartAccountClient } from "permissionless"

import {
	getAddress,
	maxUint256,
	parseAbi,
} from "viem";
import {
	EntryPointVersion,
} from "viem/account-abstraction";

import { encodeFunctionData, parseAbiItem } from "viem"

console.log("Hello world!")

const apiKey = process.env.PIMLICO_API_KEY
if (!apiKey) throw new Error("Missing PIMLICO_API_KEY")
 
const privateKey =
	(process.env.PRIVATE_KEY as Hex) ??
	(() => {
		const pk = generatePrivateKey()
		writeFileSync(".env", `PRIVATE_KEY=${pk}`)
		return pk
	})()
 
export const publicClient = createPublicClient({
	chain: baseSepolia,
	// transport: http("https://rpc.ankr.com/eth_sepolia"),
	transport: http("https://sepolia.base.org"),
})
 
const pimlicoUrl = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${apiKey}`
 
const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	},
})

const account = await toSafeSmartAccount({
	client: publicClient,
	owners: [privateKeyToAccount(privateKey)],
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	}, // global entrypoint
	version: "1.4.1",
	safe4337ModuleAddress: "0x3Fdb5BC686e861480ef99A6E3FaAe03c0b9F32e2",
	erc7579LaunchpadAddress: "0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE",
	validators: [
	  {
		address: "0xd9Ef4a48E4C067d640a9f784dC302E97B21Fd691",
		context: "0x",
	  },
	],
})
 
console.log(`Smart account address: https://sepolia.basescan.org/address/${account.address}`)

const smartAccountClient = createSmartAccountClient({
	account,
	chain: baseSepolia,
	bundlerTransport: http(pimlicoUrl),
	paymaster: pimlicoClient,
	userOperation: {
		estimateFeesPerGas: async () => {
			return (await pimlicoClient.getUserOperationGasPrice()).fast
		},
	},
})

const txHash = await smartAccountClient.sendTransaction({
	to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
	value: 0n,
	data: "0x1234",
})

console.log(`Transaction hash: https://sepolia.basescan.org/tx/${txHash}`)