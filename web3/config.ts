// web3/config.ts
import { createConfig, http } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [injected()], // Adicione os connectors aqui
  transports: {
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_AMOY_RPC || "https://rpc-amoy.polygon.technology/"),
  },
});