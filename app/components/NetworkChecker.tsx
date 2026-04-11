// components/NetworkChecker.tsx
"use client";
import { useAccount, useSwitchChain } from "wagmi";
import { polygonAmoy } from "wagmi/chains";

export function NetworkChecker() {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  if (chain?.id !== polygonAmoy.id) {
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-yellow-800 text-sm mb-2">
          ⚠️ Você está na rede errada. Conecte-se à Polygon Amoy para continuar.
        </p>
        {switchChain && (
          <button
            onClick={() => switchChain({ chainId: polygonAmoy.id })}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition"
          >
            Mudar para Polygon Amoy
          </button>
        )}
      </div>
    );
  }

  return null;
}