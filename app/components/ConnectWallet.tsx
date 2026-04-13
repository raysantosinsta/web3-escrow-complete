// components/ConnectWallet.tsx (versão com múltiplas wallets)
"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Solução para Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isConnected && address) {


    return (
      <div className="flex items-center justify-between gap-4">
        <div className="px-4 py-2 bg-green-100 text-green-700 rounded-2xl text-sm font-medium truncate">
          🔗 {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          onClick={() => {
            disconnect();
            router.push('/');
          }}
          className="text-red-500 text-sm font-medium hover:underline"
        >
          Desconectar
        </button>
      </div>
    );
  }

  if (showOptions) {
    return (
      <div className="space-y-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => {
              connect({ connector });
              setShowOptions(false);
            }}
            disabled={isPending}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-left hover:bg-gray-50 transition"
          >
            <div className="font-medium">
              {connector.name === "MetaMask" && "🦊 "}
              {connector.name === "WalletConnect" && "💎 "}
              {connector.name === "Injected" && "🔌 "}
              {connector.name}
            </div>
            <div className="text-xs text-gray-500">
              {connector.name === "MetaMask" && "Conectar via MetaMask"}
              {connector.name === "WalletConnect" && "Conectar via WalletConnect"}
              {connector.name === "Injected" && "Conectar via extensão"}
            </div>
          </button>
        ))}
        <button
          onClick={() => setShowOptions(false)}
          className="w-full text-gray-500 text-sm hover:underline"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowOptions(true)}
      disabled={isPending}
      className="w-full bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-zinc-800 transition"
    >
      🔑 Conectar Wallet
    </button>
  );
}