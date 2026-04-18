// web3/config.ts
import { http, createConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

export const config = createConfig({
  chains: [sepolia, hardhat],
  connectors: [injected(), metaMask()],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});