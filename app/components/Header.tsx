"use client";

import { useAuth } from "./AuthContext";
import { ShieldCheck, User as UserIcon, LogOut, ArrowRightLeft, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import ConnectWallet from "./ConnectWallet";

export default function Header() {
  const { user, switchRole } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => router.push("/")}
        >
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-bold tracking-tight text-xl text-white">
            Pay<span className="text-indigo-500">Web3</span>
          </h1>
        </div>

        {/* Global Navigation */}
        <nav className="hidden md:flex items-center gap-6 ml-10">
           <button 
             onClick={() => router.push("/dashboard")}
             className="text-slate-400 hover:text-white font-medium text-sm transition-colors flex items-center gap-2"
           >
             <Briefcase className="w-4 h-4" />
             Dashboard
           </button>
           <button 
             onClick={() => router.push("/dashboard/merchant")}
             className="text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
           >
             <ShieldCheck className="w-4 h-4" />
             Lojista
           </button>
        </nav>

        {/* User Context & Actions */}
        <div className="flex items-center gap-4">
          
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
            <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
            <div className="hidden sm:block">
              <p className="text-xs font-black text-white uppercase tracking-tighter leading-none mb-1">
                {user.name}
              </p>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">
                {user.role}
              </p>
            </div>
            <button 
              onClick={switchRole}
              title="Trocar Perfil"
              className="ml-2 p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          <ConnectWallet />
        </div>

      </div>
    </header>
  );
}
