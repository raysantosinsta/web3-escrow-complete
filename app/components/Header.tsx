"use client";

import { ArrowRightLeft, Briefcase, ShieldCheck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import ConnectWallet from "./ConnectWallet";
import { useBalance, useBlockNumber, useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";
import NotificationsDropdown from "./NotificationsDropdown";

export default function Header() {
  const { user, switchRole } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { address: connectedAddress, isConnected } = useAccount();

  const { data: blockNumber } = useBlockNumber({ watch: true });

  const activeWallet = connectedAddress || user?.wallet;

  const { data: balanceData, refetch } = useBalance({
    address: activeWallet as `0x${string}`,
    query: {
      enabled: !!activeWallet,
    }
  });

  useEffect(() => {
    refetch();
  }, [blockNumber, activeWallet, refetch]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-[#FFFFFF]/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => router.push("/")}
        >
          <div className="bg-[#00AEEF] p-2 rounded-xl shadow-lg shadow-[#00AEEF]/20 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-bold tracking-tight text-xl text-[#2D2D2D]">
            Pay<span className="text-[#00AEEF]">Web3</span>
          </h1>
        </div>

        {/* Global Navigation */}
        <nav className="hidden md:flex items-center gap-6 ml-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[#666666] hover:text-[#0052CC] font-medium text-sm transition-colors flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => router.push("/dashboard/merchant")}
            className="text-[#00AEEF] hover:text-[#0052CC] font-bold text-sm transition-colors flex items-center gap-2 px-3 py-1.5 bg-[#00AEEF]/10 rounded-xl border border-[#00AEEF]/20"
          >
            <ShieldCheck className="w-4 h-4" />
            Lojista
          </button>
        </nav>

        {/* User Context & Actions */}
        <div className="flex items-center gap-4">

          {mounted && isConnected && (
            <div className="flex items-center gap-3 px-4 py-2 bg-[#F4F6F8] rounded-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
              <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" />
              <div className="hidden sm:block">
                <p className="text-xs font-black text-[#2D2D2D] uppercase tracking-tighter leading-none mb-1">
                  {user.name}
                </p>
                <p className="text-[10px] font-bold text-[#00AEEF] uppercase tracking-widest leading-none">
                  {user.role}
                </p>
              </div>
              
              <div className="hidden md:flex flex-col border-l border-slate-200 pl-3 ml-1 text-right">
                <p className="text-[9px] font-bold text-[#666666] uppercase tracking-widest leading-none mb-1">Meu Saldo</p>
                <p className="text-xs font-black text-[#2D2D2D] leading-none flex items-center justify-end gap-1">
                  <Wallet className="w-3 h-3 text-[#00AEEF]" />
                  {balanceData ? Number(formatUnits(balanceData.value, balanceData.decimals)).toFixed(2) : "0.00"} 
                  <span className="text-[9px] text-[#00AEEF] font-bold">{balanceData?.symbol || "MATIC"}</span>
                </p>
              </div>

              <button
                onClick={switchRole}
                title="Trocar Perfil"
                className="ml-2 p-1.5 hover:bg-slate-200 rounded-lg text-[#666666] hover:text-[#0052CC] transition-all"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {mounted && isConnected && <NotificationsDropdown />}

          <ConnectWallet />
        </div>

      </div>
    </header>
  );
}
