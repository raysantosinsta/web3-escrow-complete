// components/PayForm.tsx
"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import escrowAbi from "../abi/Escrow.json";

import ConnectWallet from "./components/ConnectWallet";
import { NetworkChecker } from "./components/NetworkChecker";
import { ShieldCheck } from "lucide-react";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function Home() {
  const { address } = useAccount();
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!seller || !amount) {
      setError("Preencha todos os campos");
      return;
    }

    if (!seller.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Endereço do vendedor inválido");
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError("Valor deve ser maior que 0");
      return;
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: escrowAbi.abi as any,
        functionName: "pay",
        args: [seller as `0x${string}`],
        value: parseEther(amount),
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="w-6 h-6" />
            <h1 className="font-bold tracking-tight text-xl text-slate-800">
              Web3<span className="text-blue-600">Escrow</span>
            </h1>
          </div>
          <div className="hidden sm:block text-sm text-slate-500 font-medium">
            Segurança em transações Polygon
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-10 flex flex-col gap-6">
        
        {/* Network & Wallet Controls */}
        <div className="flex flex-col gap-4">
          <NetworkChecker />
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <ConnectWallet />
          </div>
        </div>

        {/* Payment Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/40">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-800">Novo Pagamento</h2>
            <p className="text-slate-500 text-sm mt-1">Crie um depósito seguro no contrato.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Endereço do Vendedor
              </label>
              <input
                type="text"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono text-sm"
                disabled={isPending || isConfirming}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Valor a Depositar (MATIC)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono text-sm pr-16"
                  disabled={isPending || isConfirming}
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-medium text-sm">MATIC</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex p-4 bg-red-50/50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mr-3 text-red-500" />
                <p className="leading-tight pt-0.5">{error}</p>
              </div>
            )}

            {isSuccess && (
              <div className="flex p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm animate-in fade-in slide-in-from-top-2">
                <CheckCircle className="w-5 h-5 shrink-0 mr-3 text-emerald-600" />
                <p className="leading-tight pt-0.5">Pagamento enviado e bloqueado com sucesso!</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!address || isPending || isConfirming}
              className="w-full relative group flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-60 disabled:hover:bg-blue-600 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isConfirming ? "Confirmando na Rede..." : "Enviando Transação..."}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Pagar e Bloquear Fundo
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}