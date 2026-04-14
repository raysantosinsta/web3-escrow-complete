"use client";

import { useBalance, useReadContract, useBlockNumber } from "wagmi";
import { ESCROW_ADDRESS, ESCROW_ABI } from "../constants/contracts";
import { formatUnits } from "viem";
import { Wallet, TrendingUp, RefreshCcw } from "lucide-react";

// Endereço público da conta admin (Conta #0 do Hardhat)
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`;

export default function AdminDashboard() {
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Saldo real da carteira admin — lido direto da blockchain
  const { data: adminBalance, refetch: refetchBalance } = useBalance({
    address: ADMIN_ADDRESS,
    query: { refetchInterval: 3000 }
  });

  // Taxa atual configurada no contrato
  const { data: feeBasisPoints } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "feeBasisPoints",
    query: { refetchInterval: 3000 }
  });

  const balanceFormatted = adminBalance
    ? Number(formatUnits(adminBalance.value, adminBalance.decimals)).toFixed(2)
    : "...";

  const feePercent = feeBasisPoints !== undefined
    ? (Number(feeBasisPoints) / 100).toFixed(2)
    : "...";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2 pb-4">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Admin <span className="text-[#00AEEF]">Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium font-mono">
            {ADMIN_ADDRESS}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Saldo da Conta Admin */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 relative overflow-hidden group hover:border-[#00AEEF]/40 transition-colors">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00AEEF] opacity-[0.04] rounded-full" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  Saldo Carteira Admin
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white tabular-nums">
                    {balanceFormatted}
                  </span>
                </div>
                <span className="text-sm font-bold text-[#00AEEF] uppercase tracking-wider mt-1 block">
                  {adminBalance?.symbol || "ETH"}
                </span>
              </div>
              <div className="bg-[#00AEEF]/10 p-3 rounded-2xl border border-[#00AEEF]/20">
                <Wallet className="w-6 h-6 text-[#00AEEF]" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <RefreshCcw className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] text-slate-600 font-medium">Atualiza em tempo real via blockchain</span>
            </div>
          </div>

          {/* Taxa do Protocolo */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500 opacity-[0.04] rounded-full" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  Taxa do Protocolo
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white tabular-nums">
                    {feePercent}
                  </span>
                  <span className="text-2xl font-black text-emerald-400">%</span>
                </div>
                <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider mt-1 block">
                  {feeBasisPoints !== undefined ? `${feeBasisPoints} Basis Points` : "Carregando..."}
                </span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <RefreshCcw className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] text-slate-600 font-medium">Lido direto do smart contract</span>
            </div>
          </div>
        </div>

        {/* Block indicator */}
        <div className="text-center">
          <span className="text-[10px] text-slate-700 font-mono">
            Bloco atual: #{blockNumber?.toString() || "..."}
          </span>
        </div>

      </div>
    </div>
  );
}
