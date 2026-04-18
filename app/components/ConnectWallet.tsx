"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { Loader2, Wallet, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [isClient, setIsClient] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectAttempted = useRef(false);

  useEffect(() => {
    setIsClient(true);
    console.log("ConnectWallet - Componente montado");
    console.log("Connectors disponíveis:", connectors.map(c => c.name));
    console.log("MetaMask disponível:", typeof window !== "undefined" && !!window.ethereum);
  }, [connectors]);

  const handleConnect = async () => {
    // Evita múltiplas tentativas simultâneas
    if (isConnecting || isPending || connectAttempted.current) {
      console.log("⚠️ Conexão já em andamento, aguarde...");
      return;
    }

    console.log("🔵 Botão conectar clicado!");
    console.log("window.ethereum:", window.ethereum);

    if (typeof window !== "undefined" && !window.ethereum) {
      console.error("❌ MetaMask não encontrada!");
      alert("MetaMask não está instalada! Por favor, instale para continuar.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      setIsConnecting(true);
      connectAttempted.current = true;

      console.log("🟡 Tentando conectar com injected...");

      // Limpa qualquer estado pendente anterior
      if (window.ethereum && window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners('connect');
        window.ethereum.removeAllListeners('disconnect');
      }

      // Tenta conectar
      connect({ connector: injected() });

      // Reseta o flag após 3 segundos (caso não haja resposta)
      setTimeout(() => {
        connectAttempted.current = false;
        setIsConnecting(false);
      }, 3000);

    } catch (err) {
      console.error("❌ Erro ao conectar:", err);
      connectAttempted.current = false;
      setIsConnecting(false);

      // Fallback para o connector do MetaMask
      try {
        console.log("🟡 Tentando fallback com metaMask connector...");
        const metaMaskConnector = connectors.find(c => c.name === 'MetaMask');
        if (metaMaskConnector) {
          connect({ connector: metaMaskConnector });
        }
      } catch (err2) {
        console.error("❌ Erro no fallback:", err2);
      }
    }
  };

  // Mostra loading enquanto verifica o cliente
  if (!isClient) {
    return (
      <div className="w-full">
        <div className="bg-gray-200 animate-pulse h-12 rounded-xl"></div>
      </div>
    );
  }

  // Estado conectado
  if (isConnected && address) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 bg-[#F4F6F8] px-3 py-2 rounded-xl border border-slate-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono text-[#2D2D2D] font-medium">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => {
            disconnect();
            connectAttempted.current = false;
            setIsConnecting(false);
          }}
          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
          title="Desconectar"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Estado desconectado
  return (
    <div className="space-y-2">
      <button
        onClick={handleConnect}
        disabled={isPending || isConnecting}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00AEEF] to-[#0052CC] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {(isPending || isConnecting) ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            Conectar MetaMask
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-500 text-center mt-2">
          Erro: {error.message}
        </p>
      )}
      <button
        onClick={() => {
          console.log("=== DEBUG INFO ===");
          console.log("window.ethereum:", window.ethereum);
          console.log("isConnected:", isConnected);
          console.log("isPending:", isPending);
          console.log("isConnecting:", isConnecting);
          console.log("connectAttempted:", connectAttempted.current);
          console.log("Connectors:", connectors.map(c => ({ name: c.name, ready: c.ready })));
        }}
        className="w-full text-xs text-gray-400 py-1 hover:text-gray-600 transition-colors"
        type="button"
      >
        🔧 Debug
      </button>
    </div>
  );
}