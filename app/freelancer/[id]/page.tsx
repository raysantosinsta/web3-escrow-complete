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
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Freelancer não encontrado</h2>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition">
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
    <div className="min-h-screen bg-transparent">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 text-center">
              <div className="relative inline-block mb-4">
                <img
                  src={freelancer.avatar}
                  alt={freelancer.name}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-indigo-500/50 shadow-xl"
                />
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-5 h-5 rounded-full border-2 border-slate-900" title="Online" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-1">{freelancer.name}</h1>
              <p className="text-indigo-400 font-medium mb-3">{freelancer.role}</p>

              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(freelancer.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                  ))}
                </div>
                <span className="text-white font-bold">{freelancer.rating}</span>
                <span className="text-slate-400 text-sm">({freelancer.reviews} avaliações)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-2xl font-bold text-white">{freelancer.jobs}</p>
                  <p className="text-xs text-slate-400">Projetos</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-400">{freelancer.successRate}%</p>
                  <p className="text-xs text-slate-400">Sucesso</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Resposta</span>
                  <span className="text-white font-medium">~{freelancer.responseTime}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Idiomas</span>
                  <span className="text-white font-medium text-right">{freelancer.languages.join(", ")}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Verificado</span>
                  <span className="text-green-400 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sim</span>
                </div>
              </div>

              {/* CTA Buttons */}
              {!isOwnProfile && user.role === 'client' && (
                <div className="space-y-3">
                  <button
                    onClick={handleStartProject}
                    disabled={conversing}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-indigo-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
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
                <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-3 text-indigo-300 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Este é o seu perfil
                </div>
              )}

              {user.role === 'freelancer' && !isOwnProfile && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-400 text-sm text-center">
                  Você precisa estar como Cliente para contratar
                </div>
              )}

              {/* Wallet (truncated for security) */}
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 rounded-xl px-3 py-2">
                <Wallet className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{freelancer.wallet.slice(0, 10)}...{freelancer.wallet.slice(-6)}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
              {(["sobre", "portfolio"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-all capitalize text-sm ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  {tab === "sobre" ? "Sobre" : "Portfólio"}
                </button>
              ))}
            </div>

            {activeTab === "sobre" && (
              <>
                {/* Bio */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                  <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-400" />
                    Sobre Mim
                  </h2>
                  <p className="text-slate-300 leading-relaxed">{freelancer.bio}</p>
                  <p className="text-slate-400 leading-relaxed mt-3">{freelancer.description}</p>
                </div>

                {/* Skills */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                  <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    <Code className="w-5 h-5 text-indigo-400" />
                    Skills & Tecnologias
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {freelancer.skills.map(skill => (
                      <span key={skill} className="px-3 py-1.5 bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-800/50 transition">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Briefcase, label: "Projetos Feitos", value: freelancer.jobs, color: "blue" },
                    { icon: TrendingUp, label: "Taxa de Sucesso", value: `${freelancer.successRate}%`, color: "green" },
                    { icon: Star, label: "Avaliação Média", value: freelancer.rating, color: "amber" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <Icon className={`w-6 h-6 mx-auto mb-2 text-${color}-400`} />
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-xs text-slate-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "portfolio" && (
              <div className="space-y-4">
                {freelancer.portfolio.map((project, idx) => (
                  <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/8 transition">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-white text-lg">{project.title}</h3>
                      <span className="text-xs px-3 py-1 bg-indigo-900/50 text-indigo-300 rounded-lg border border-indigo-500/30">
                        {project.tech}
                      </span>
                    </div>
                    <p className="text-slate-400">{project.description}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-400">Projeto concluído com sucesso</span>
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
