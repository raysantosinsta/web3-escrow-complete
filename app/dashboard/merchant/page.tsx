"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthContext";
import { 
  BarChart3, Wallet, Zap, Settings, ArrowUpRight, 
  ArrowDownRight, MoreHorizontal, Copy, CheckCircle,
  ExternalLink, Loader2, Globe, ShieldCheck, Key
} from "lucide-react";
import { useRouter } from "next/navigation";

type Merchant = {
  id: string;
  name: string;
  wallet: string;
  apiKey: string;
  apiSecret: string;
};

type Stats = {
  totalRevenue: number;
  totalTransactions: number;
  averageTicket: number;
};

export default function MerchantDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    if (user.wallet) {
      fetchMerchant();
    }
  }, [user.wallet]);

  const fetchMerchant = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/merchants/me?wallet=${user.wallet}`);
      if (res.ok) {
        const data = await res.json();
        setMerchant(data);
        if (data) fetchStats(data.id);
      }
    } catch (error) {
      console.error("Erro ao carregar lojista:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/merchants/${id}/stats`);
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error("Erro ao carregar stats:", error);
    }
  };

  const handleOnboard = async () => {
    setOnboarding(true);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/merchants/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${user.name} Labs`,
          wallet: user.wallet,
          ownerId: user.id
        })
      });
      if (res.ok) fetchMerchant();
    } catch (error) {
      console.error("Erro no onboarding:", error);
    } finally {
      setOnboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6">
          <Globe className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Torne-se um Lojista</h1>
        <p className="text-slate-400 max-w-md mb-8">
          Aceite pagamentos Web3 e Pix diretamente em seu site ou app usando nossa infraestrutura de Gateway.
        </p>
        <button
          onClick={handleOnboard}
          disabled={onboarding}
          className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
        >
          {onboarding ? "Gerando chaves..." : "Ativar Checkout Web3"}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Painel de Lojista</h1>
            <p className="text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Empresa Verificada: <span className="text-white font-bold">{merchant.name}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/dashboard/merchant/settings')}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>
            <button 
              onClick={() => router.push('/dashboard/merchant/links')}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Links de Pagamento
            </button>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            title="Receita Total" 
            value={`R$ ${stats?.totalRevenue.toFixed(2) || '0,00'}`} 
            icon={Wallet} 
            trend="+12%" 
            trendUp={true} 
          />
          <StatCard 
            title="Transações" 
            value={stats?.totalTransactions.toString() || '0'} 
            icon={BarChart3} 
            trend="+5.4%" 
            trendUp={true} 
          />
          <StatCard 
            title="Ticket Médio" 
            value={`R$ ${stats?.averageTicket.toFixed(2) || '0,00'}`} 
            icon={ArrowUpRight} 
            trend="-2%" 
            trendUp={false} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions / Getting Started */}
            <div className="bg-[#111827]/60 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Globe className="w-32 h-32" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                Sua API Key de Teste
              </h2>
              <p className="text-slate-400 text-sm mb-6 max-w-md leading-relaxed">
                Use esta chave para autenticar suas requisições no ambiente de Sandbox. Nunca compartilhe sua Secret Key.
              </p>
              
              <div className="flex items-center gap-2 bg-black/40 p-4 rounded-2xl border border-white/5">
                <code className="text-indigo-300 font-mono text-sm flex-1 truncate">{merchant.apiKey}</code>
                <button className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recent Activity Table (Placeholder) */}
            <div>
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-black uppercase tracking-tighter">Últimas Transações</h2>
                <button className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-white transition">Ver Tudo</button>
              </div>
              
              <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[32px] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-8 py-6">ID</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Valor</th>
                      <th className="px-8 py-6">Data</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-6 font-mono text-slate-400 group-hover:text-white transition-colors">7e9a...{i}f2c</td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold border border-green-500/20">Pago</span>
                        </td>
                        <td className="px-8 py-6 font-bold text-white">R$ 250,00</td>
                        <td className="px-8 py-6 text-slate-500">12/04/2026</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar / Resources */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-[32px] p-8">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-4 text-indigo-300">Documentação</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Aprenda como integrar o Checkout Web3 no seu site com poucas linhas de código.
              </p>
              <button className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <Globe className="w-4 h-4" />
                Abrir Docs
              </button>
            </div>

            <div className="bg-[#111827]/40 border border-white/5 rounded-[32px] p-8">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-4">Webhook Health</h3>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-slate-300">Operational</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Nenhum erro de notificação detectado nas últimas 24h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: any) {
  return (
    <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 hover:border-white/10 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
        <Icon className="w-16 h-16" />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-black text-white uppercase tracking-tighter">{value}</span>
        <div className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${trendUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
    </div>
  );
}
