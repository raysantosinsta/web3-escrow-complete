// components/NetworkChecker.tsx
"use client";
import { useAccount, useSwitchChain } from "wagmi";
import { AlertCircle } from "lucide-react";
import { hardhat } from "wagmi/chains";

export function NetworkChecker() {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  if (chain?.id !== hardhat.id) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in fade-in slide-in-from-top-2 shadow-sm">
        <div className="flex items-center text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mr-3 text-amber-500" />
          <p className="text-sm font-medium leading-tight">
            ⚠️ Você está na rede errada. Conecte-se à Hardhat Localhost (31337) para continuar.
          </p>
        </div>
        <button
          onClick={() => switchChain({ chainId: hardhat.id })}
          className="self-start text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors border border-amber-300 shadow-sm"
        >
          Trocar para Hardhat Local
        </button>
      </div>
    );
  }

  return null;
}