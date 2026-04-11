"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../app/components/AuthContext";
import { ArrowLeft, Briefcase, Clock, ShieldCheck, MessageSquare, CheckCircle, Wallet, AlertCircle, Loader2 } from "lucide-react";

type Job = {
  id: string;
  title: string;
  status: string;
  price: number;
  createdAt: string;
  client: { wallet: string; name: string };
  freelancer: { wallet: string; name: string };
};

const statusConfig = {
  negotiating: { label: "Negociação", color: "warning", icon: MessageSquare, bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  funded: { label: "Fundado (Escrow)", color: "info", icon: ShieldCheck, bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  reviewing: { label: "Em Revisão", color: "primary", icon: Clock, bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20" },
  completed: { label: "Concluído", color: "success", icon: CheckCircle, bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/20" }
};

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.wallet) {
      setLoading(false);
      return;
    }

    const fetchJobs = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/jobs/user/${user.wallet}`);
        if (!res.ok) throw new Error("Erro ao buscar projetos");
        const data = await res.json();
        setJobs(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [user.wallet]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4 shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
          <p className="text-slate-400 font-medium animate-pulse">Sincronizando seus projetos...</p>
        </div>
      </div>
    );
  }

  if (!user.wallet) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-950 px-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md border border-white/10 shadow-2xl">
          <div className="bg-indigo-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
            <Wallet className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Conecte sua carteira</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">Para gerenciar seus contratos e visualizar seus ganhos, você precisa autenticar sua carteira Web3.</p>
          <button onClick={() => router.push('/')} className="px-6 py-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-indigo-500/25">
            Voltar ao Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-12 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-slate-950/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button
              onClick={() => router.push('/')}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 group"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
            </button>
            <div>
              <h1 className="font-bold text-xl text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                Meu Portfólio
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Gestão de Contratos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-black text-white tracking-tight mb-2">Painel de Projetos</h2>
          <p className="text-slate-400 font-medium">Controle total sobre seus escrows e entregas on-chain.</p>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl p-16 rounded-[40px] border border-white/10 text-center shadow-3xl">
             <div className="bg-slate-800/50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/5">
                <AlertCircle className="w-12 h-12 text-slate-600" />
             </div>
             <h3 className="text-2xl font-bold text-white mb-2">Plataforma Silenciosa</h3>
             <p className="text-slate-400 mb-8 max-w-xs mx-auto leading-relaxed">Você ainda não iniciou nenhuma jornada de contratação nesta rede.</p>
             <button onClick={() => router.push('/')} className="px-8 py-3.5 bg-white text-slate-950 font-bold rounded-2xl hover:bg-indigo-50 transition-colors shadow-xl">
               Começar Agora
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {jobs.map((job) => {
              const isClient = job.client.wallet.toLowerCase() === user.wallet.toLowerCase();
              const otherParty = isClient ? job.freelancer : job.client;
              const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.negotiating;

              return (
                <div 
                  key={job.id} 
                  onClick={() => router.push(`/job/${job.id}`)}
                  className="group relative bg-[#111827]/40 backdrop-blur-xl rounded-[32px] border border-white/5 hover:border-indigo-500/30 transition-all duration-500 cursor-pointer overflow-hidden p-8"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px] group-hover:bg-indigo-500/10 transition-colors" />
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex-1 min-w-0 mr-4">
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{job.title}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">ID: #{job.id.slice(0,8)}</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.text} ${config.border} flex items-center gap-2 shrink-0 shadow-lg shadow-black/20`}>
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.text.replace('text', 'bg')} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.text.replace('text', 'bg')}`}></span>
                      </span>
                      {config.label}
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 relative z-10">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                             {isClient ? 'CL' : 'FL'}
                         </div>
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{isClient ? 'Freelancer' : 'Cliente'}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{otherParty.name}</span>
                    </div>
                    
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Rede</span>
                        <span className="text-xs font-bold text-slate-300">Polygon Amoy</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex flex-col">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total em Escrow</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{job.price}</span>
                        <span className="text-sm font-bold text-indigo-500">MATIC</span>
                      </div>
                    </div>
                    
                    <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-indigo-600 flex items-center justify-center transition-all duration-500 shadow-xl group-hover:shadow-indigo-600/20 group-hover:-translate-x-1 group-hover:rotate-12">
                      <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-white rotate-180 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
