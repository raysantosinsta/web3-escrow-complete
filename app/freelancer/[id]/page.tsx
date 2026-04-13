"use client";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Star, Briefcase, MessageSquare, Shield, Clock,
  CheckCircle, Globe, Code, Wallet, Zap, Award, TrendingUp,
  Loader2
} from "lucide-react";
import { useAuth } from "../../components/AuthContext";
import { useAccount } from "wagmi";

const FREELANCERS = [
  {
    id: 2,
    name: "Roberto Silva",
    role: "Smart Contract Engineer",
    description: "Auditorias sólidas e Solidity expert.",
    rate: "0.08",
    rating: 5.0,
    reviews: 89,
    jobs: 89,
    responseTime: "1h",
    successRate: 100,
    avatar: "https://i.pravatar.cc/150?u=a04258a2462d826712d",
    wallet: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    skills: ["Solidity", "Hardhat", "Foundry", "EVM", "DeFi", "Auditoria", "OpenZeppelin"],
    languages: ["Português", "English", "Español"],
    bio: "Smart contract engineer com foco em segurança e eficiência de gas. Contribuo para projetos open source e tenho certificações em segurança blockchain.",
    portfolio: [
      { title: "Escrow Protocol", description: "Contrato híbrido com pagamento em escrow", tech: "Solidity + Hardhat" },
      { title: "Yield Aggregator", description: "Agregador de rendimentos multi-chain", tech: "Solidity + Viem" },
      { title: "Token Vesting", description: "Sistema de vesting com cliff e clawback", tech: "Solidity + Foundry" },
    ]
  }
];

export default function FreelancerProfile() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { isConnected } = useAccount();

  const [hiring, setHiring] = useState(false);
  const [conversing, setConversing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sobre" | "portfolio">("sobre");

  const id = parseInt(params.id as string);
  const freelancer = FREELANCERS.find(f => f.id === id);

  useEffect(() => {
    if (user.wallet && freelancer?.wallet) {
      checkExistingConversation();
    }
  }, [user.wallet, freelancer?.wallet]);

  const checkExistingConversation = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/conversations/check?clientWallet=${user.wallet}&freelancerWallet=${freelancer?.wallet}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.exists) {
        setConversationId(data.id);
      }
    } catch (error) {
      console.error("Erro ao checar conversa:", error);
    }
  };

  if (!freelancer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
        <div className="text-center text-[#2D2D2D]">
          <h2 className="text-2xl font-bold mb-4">Freelancer não encontrado</h2>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#00AEEF] text-white rounded-xl hover:bg-[#0052CC] shadow-md transition">
            Voltar ao Marketplace
          </button>
        </div>
      </div>
    );
  }

  const handleStartProject = async () => {
    setConversing(true);
    try {
      const res = await fetch("http://localhost:3001/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientWallet: user.wallet,
          freelancerWallet: freelancer.wallet,
          title: `Projeto com ${freelancer.name}`,
          price: parseFloat(freelancer.rate)
        }),
      });

      if (!res.ok) throw new Error("Erro ao iniciar projeto");
      const job = await res.json();
      
      if (job?.id) {
        router.push(`/job/${job.id}`);
      }
    } catch (error) {
      console.error("Erro ao iniciar projeto:", error);
      alert("Erro ao iniciar projeto. Verifique se o backend está online.");
    } finally {
      setConversing(false);
    }
  };

  const isOwnProfile = user.wallet.toLowerCase() === freelancer.wallet.toLowerCase();

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Card */}
            <div className="bg-[#FFFFFF]/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 text-center shadow-lg">
              <div className="relative inline-block mb-4">
                <img
                  src={freelancer.avatar}
                  alt={freelancer.name}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-[#00AEEF]/20 shadow-xl"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#00C48C] w-5 h-5 rounded-full border-2 border-[#FFFFFF]" title="Online" />
              </div>

              <h1 className="text-3xl font-black tracking-tight text-[#2D2D2D] mb-1">{freelancer.name}</h1>
              <p className="text-[#00AEEF] font-bold uppercase tracking-widest text-xs mb-3">{freelancer.role}</p>

              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(freelancer.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                  ))}
                </div>
                <span className="text-[#2D2D2D] font-bold">{freelancer.rating}</span>
                <span className="text-[#666666] text-sm">({freelancer.reviews} avaliações)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#F4F6F8] border border-slate-100 rounded-xl p-3">
                  <p className="text-2xl font-black text-[#2D2D2D]">{freelancer.jobs}</p>
                  <p className="text-xs uppercase font-bold text-[#666666] tracking-widest mt-1">Projetos</p>
                </div>
                <div className="bg-[#F4F6F8] border border-slate-100 rounded-xl p-3">
                  <p className="text-2xl font-black text-[#00C48C]">{freelancer.successRate}%</p>
                  <p className="text-xs uppercase font-bold text-[#666666] tracking-widest mt-1">Sucesso</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center justify-between text-[#666666]">
                  <span className="flex items-center gap-2 font-medium"><Clock className="w-4 h-4 text-[#00AEEF]" /> Resposta</span>
                  <span className="text-[#2D2D2D] font-bold">~{freelancer.responseTime}</span>
                </div>
                <div className="flex items-center justify-between text-[#666666]">
                  <span className="flex items-center gap-2 font-medium"><Globe className="w-4 h-4 text-[#00AEEF]" /> Idiomas</span>
                  <span className="text-[#2D2D2D] font-bold text-right">{freelancer.languages.join(", ")}</span>
                </div>
                <div className="flex items-center justify-between text-[#666666]">
                  <span className="flex items-center gap-2 font-medium"><Shield className="w-4 h-4 text-[#00AEEF]" /> Verificado</span>
                  <span className="text-[#00C48C] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sim</span>
                </div>
              </div>

              {/* CTA Buttons */}
              {!isOwnProfile && user.role === 'client' && (
                <div className="space-y-3">
                  <button
                    onClick={handleStartProject}
                    disabled={conversing}
                    className="w-full py-4 bg-[#00AEEF] hover:bg-[#0052CC] text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all duration-200 shadow-lg hover:shadow-[#00AEEF]/25 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {conversing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-5 h-5" />
                    )}
                    {conversing ? "Iniciando..." : "Iniciar Projeto / Conversa"}
                  </button>
                </div>
              )}

              {isOwnProfile && (
                <div className="bg-[#00AEEF]/10 border border-[#00AEEF]/30 rounded-xl p-3 text-[#00AEEF] font-semibold text-sm flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Este é o seu perfil
                </div>
              )}

              {user.role === 'freelancer' && !isOwnProfile && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-[#666666] font-medium text-sm text-center">
                  Você precisa estar como Cliente para contratar
                </div>
              )}

              {/* Wallet (truncated for security) */}
              <div className="mt-4 flex items-center gap-2 text-xs text-[#666666] bg-[#F4F6F8] rounded-xl px-3 py-2 border border-slate-200">
                <Wallet className="w-3 h-3 flex-shrink-0 text-[#00AEEF]" />
                <span className="font-mono truncate">{freelancer.wallet.slice(0, 10)}...{freelancer.wallet.slice(-6)}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 bg-[#F4F6F8] p-1.5 rounded-2xl border border-slate-200">
              {(["sobre", "portfolio"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === tab ? 'bg-[#FFFFFF] text-[#00AEEF] shadow-sm' : 'text-[#666666] hover:text-[#2D2D2D]'}`}
                >
                  {tab === "sobre" ? "Sobre" : "Portfólio"}
                </button>
              ))}
            </div>

            {activeTab === "sobre" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                {/* Bio */}
                <div className="bg-[#FFFFFF]/95 backdrop-blur-xl border border-slate-200 shadow-sm rounded-3xl p-6 md:p-8">
                  <h2 className="text-[#2D2D2D] font-black text-xl tracking-tight mb-4 flex items-center gap-2">
                    <Award className="w-6 h-6 text-[#00AEEF]" />
                    Sobre Mim
                  </h2>
                  <p className="text-[#666666] leading-relaxed font-medium mb-3">{freelancer.bio}</p>
                  <p className="text-[#666666] leading-relaxed font-medium">{freelancer.description}</p>
                </div>

                {/* Skills */}
                <div className="bg-[#FFFFFF]/95 backdrop-blur-xl border border-slate-200 shadow-sm rounded-3xl p-6 md:p-8">
                  <h2 className="text-[#2D2D2D] font-black text-xl tracking-tight mb-4 flex items-center gap-2">
                    <Code className="w-6 h-6 text-[#00AEEF]" />
                    Skills & Tecnologias
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {freelancer.skills.map(skill => (
                      <span key={skill} className="px-3.5 py-1.5 bg-[#F4F6F8] border border-slate-200 text-[#00AEEF] rounded-lg text-sm font-bold tracking-wide hover:bg-[#00AEEF]/10 hover:border-[#00AEEF]/30 transition">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Briefcase, label: "Projetos Feitos", value: freelancer.jobs, color: "blue" },
                    { icon: TrendingUp, label: "Taxa de Sucesso", value: `${freelancer.successRate}%`, color: "green" },
                    { icon: Star, label: "Avaliação Média", value: freelancer.rating, color: "amber" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-[#FFFFFF]/95 border border-slate-200 shadow-sm rounded-2xl p-5 text-center transition-transform hover:-translate-y-1">
                      <Icon className={`w-7 h-7 mx-auto mb-3 ${color === 'blue' ? 'text-[#00AEEF]' : color === 'green' ? 'text-[#00C48C]' : 'text-amber-500'}`} />
                      <p className="text-3xl font-black text-[#2D2D2D]">{value}</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#666666] mt-2">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "portfolio" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {freelancer.portfolio.map((project, idx) => (
                  <div key={idx} className="bg-[#FFFFFF]/95 backdrop-blur-xl border border-slate-200 shadow-sm rounded-3xl p-6 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-[#2D2D2D] text-lg">{project.title}</h3>
                      <span className="text-xs px-3 py-1 font-bold tracking-widest uppercase bg-[#F4F6F8] text-[#00AEEF] rounded-lg border border-slate-200">
                        {project.tech}
                      </span>
                    </div>
                    <p className="text-[#666666] font-medium leading-relaxed">{project.description}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#00C48C]" />
                      <span className="text-xs font-bold uppercase tracking-widest text-[#00C48C]">Projeto concluído com sucesso</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
