"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { Send, Loader2, CheckCircle, AlertCircle, ArrowLeft, Star, Briefcase } from "lucide-react";
import escrowAbi from "../abi/Escrow.json";
import { NetworkChecker } from "./components/NetworkChecker";
import { useAuth } from "./components/AuthContext";
import ConnectWallet from "./components/ConnectWallet";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const FREELANCERS = [

  {
    id: 2,
    name: "Roberto Silva",
    role: "Smart Contract Engineer",
    description: "Auditorias sólidas e Solidy expert.",
    rate: "0.08",
    rating: 5.0,
    jobs: 89,
    avatar: "https://i.pravatar.cc/150?u=a04258a2462d826712d",
    wallet: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  }

];

export default function Home() {
  const router = useRouter();
  const { address } = useAccount();
  const { user } = useAuth();
  const [selectedFreelancer, setSelectedFreelancer] = useState<typeof FREELANCERS[0] | null>(null);

  const [amount, setAmount] = useState("");
  const [isEscrow, setIsEscrow] = useState(true);
  const [error, setError] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'pix'>('crypto');
  const [pixStatus, setPixStatus] = useState<'idle' | 'loading' | 'waiting_payment' | 'completed'>('idle');

  const openCheckout = async (freelancer: typeof FREELANCERS[0]) => {
    console.log('[Frontend] Contratando freelancer:', freelancer.name, freelancer.wallet);
    console.log('[Frontend] clientWallet:', user.wallet);
    try {
      const res = await fetch("http://localhost:3001/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Projeto de ${freelancer.role}`,
          price: parseFloat(freelancer.rate),
          clientWallet: user.wallet,
          freelancerWallet: freelancer.wallet
        })
      });
      console.log('[Frontend] POST /api/jobs status:', res.status);
      const job = await res.json();
      console.log('[Frontend] Job criado:', job);
      if (!job?.id) {
        console.error('[Frontend] job.id undefined! Resposta completa:', JSON.stringify(job));
        return;
      }
      router.push(`/job/${job.id}`);
    } catch (error) {
      console.error('[Frontend] Erro ao criar job:', error);
    }
  };

  const handleCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedFreelancer || !amount) {
      setError("Preencha todos os campos");
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
        args: [selectedFreelancer.wallet as `0x${string}`, isEscrow],
        value: parseEther(amount),
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedFreelancer || !amount) {
      setError("Preencha todos os campos");
      return;
    }

    setPixStatus('loading');
    try {
      // 1. Cria a sessão de checkout no backend (gera carteira efêmera)
      const res = await fetch("http://localhost:3001/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), sellerAddress: selectedFreelancer.wallet, isEscrow }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Erro ao criar checkout");

      // 2. Redireciona para a página de checkout daquele sessionId
      router.push(`/checkout/${data.sessionId}`);

    } catch (err: any) {
      setError(err.message);
      setPixStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-16">

        {/* VIEW A: Marketplace Grid */}
        {!selectedFreelancer && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="mb-16 text-center md:text-left">
              <h2 className="text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                Contrate o futuro <br />
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">da engenharia Web3.</span>
              </h2>
              <p className="text-slate-400 font-medium text-lg max-w-2xl">Acesso direto aos especialistas em blockchain com a segurança máxima de contratos inteligentes em escrow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FREELANCERS.map((dev) => (
                <div key={dev.id} className="group relative bg-[#111827]/40 backdrop-blur-xl rounded-[32px] border border-white/5 hover:border-indigo-500/50 transition-all duration-500 flex flex-col overflow-hidden shadow-2xl hover:shadow-indigo-500/10">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Card Header with gradient */}
                  <div className="h-24 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-slate-900/40 p-6 relative">
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase border border-white/10 shadow-xl">
                        <Star className="w-3.5 h-3.5 mr-1.5 fill-amber-400 text-amber-400" />
                        {dev.rating}
                      </div>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{dev.jobs} jobs</span>
                    </div>
                  </div>

                  <div className="px-6 -mt-10 mb-5 relative z-10">
                    <div className="relative inline-block">
                      <img src={dev.avatar} alt={dev.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-950 shadow-2xl group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-slate-950" />
                    </div>
                  </div>

                  <div className="px-8 pb-8 flex flex-col flex-grow relative z-10">
                    <h3 className="font-black text-xl text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tighter">{dev.name}</h3>
                    <div className="flex items-center text-indigo-400 text-[11px] font-black uppercase tracking-widest mt-1 mb-4">
                      <Briefcase className="w-3.5 h-3.5 mr-2" />
                      {dev.role}
                    </div>

                    <p className="text-sm text-slate-400 font-medium line-clamp-2 mb-6 flex-grow leading-relaxed">{dev.description}</p>


                    <div className="flex gap-3">
                      <button
                        onClick={() => router.push(`/freelancer/${dev.id}`)}
                        className="flex-1 py-4 bg-white/5 text-white font-bold rounded-[18px] hover:bg-white/10 transition-all text-xs uppercase tracking-widest border border-white/5"
                      >
                        Perfil
                      </button>
                      <button
                        onClick={() => openCheckout(dev)}
                        className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-[18px] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 text-xs uppercase tracking-widest active:scale-95"
                      >
                        Contratar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW B: Checkout Form */}
        {selectedFreelancer && (
          <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setSelectedFreelancer(null)}
              className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar aos profissionais
            </button>

            {/* Freelancer Profile Badge */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
              <img src={selectedFreelancer.avatar} alt="Avatar" className="w-16 h-16 rounded-full ring-4 ring-slate-50" />
              <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-lg text-slate-800">{selectedFreelancer.name}</h3>
                <p className="text-slate-500 font-medium text-sm truncate">{selectedFreelancer.role}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-md truncate max-w-[200px]">
                    {selectedFreelancer.wallet}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Tabs */}
            <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6">
              <button
                onClick={() => setPaymentMethod('crypto')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${paymentMethod === 'crypto' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Com Carteira (Web3)
              </button>
              <button
                onClick={() => setPaymentMethod('pix')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${paymentMethod === 'pix' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Via Pix (Sem Conta)
              </button>
            </div>

            {/* Network & Wallet Controls only if Crypto */}
            {paymentMethod === 'crypto' && (
              <div className="flex flex-col gap-4 mb-6">
                <NetworkChecker />
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <ConnectWallet />
                </div>
              </div>
            )}

            {/* Payment Form Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/40">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {paymentMethod === 'crypto' ? 'Configurar Pagamento' : 'Checkout Rápido BRL'}
                </h2>
              </div>

              <form onSubmit={paymentMethod === 'crypto' ? handleCryptoSubmit : handlePixSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Valor a repassar ({paymentMethod === 'crypto' ? 'MATIC' : 'BRL'})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono text-xl font-bold pr-16"
                      disabled={isPending || isConfirming || pixStatus !== 'idle'}
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium text-lg">
                        {paymentMethod === 'crypto' ? 'MATIC' : 'R$'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Escrow Toggle */}
                <div className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${isEscrow ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Reter Pagamento (Aconselhado)</p>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-[250px] leading-relaxed">
                      O contrato prende os fundos e você decide quando deve liberar o pagamento para o Freelancer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEscrow(!isEscrow)}
                    className={`w-12 h-6 flex shrink-0 items-center rounded-full p-1 transition-colors ${isEscrow ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isEscrow ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {error && (
                  <div className="flex p-4 bg-red-50/50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mr-3 text-red-500" />
                    <p className="leading-tight pt-0.5">{error}</p>
                  </div>
                )}

                {/* Crypto Feedback */}
                {isSuccess && paymentMethod === 'crypto' && (
                  <div className="flex p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="w-5 h-5 shrink-0 mr-3 text-emerald-600" />
                    <p className="leading-tight pt-0.5">Pagamento enviado {isEscrow ? "e bloqueado" : "e finalizado"} com sucesso!</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={(paymentMethod === 'crypto' && !address) || isPending || isConfirming || pixStatus !== 'idle'}
                  className={`w-full relative group flex items-center justify-center gap-2 px-6 py-4 text-white rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md active:scale-[0.98] ${paymentMethod === 'crypto' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}`}
                >
                  {isPending || isConfirming || pixStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      {paymentMethod === 'crypto' ? 'Efetuar Pagamento Web3' : 'Pagar Agora via Pix'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}