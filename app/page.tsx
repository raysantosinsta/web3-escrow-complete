"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { Send, Loader2, CheckCircle, AlertCircle, ArrowLeft, Star, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import escrowAbi from "../abi/Escrow.json";
import { NetworkChecker } from "./components/NetworkChecker";
import { useAuth } from "./components/AuthContext";
import { useQuery } from "@tanstack/react-query";
import ConnectWallet from "./components/ConnectWallet";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

// Interface do Freelancer vinda do Banco
interface Freelancer {
  id: string;
  name: string;
  role: string;
  description: string;
  rate: string;
  rating: number;
  jobs: number;
  avatar: string;
  wallet: string;
}

// CONFIGURAÇÃO DO GRID
const GRID_COLS = 4;  // 4 colunas
const GRID_ROWS = 3;  // 3 linhas = total 12 células
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

// Imagens para o efeito de fundo
const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1621504450181-5d356f61d307?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1621075160523-b936ad96132a?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop",
];

interface Cell {
  id: number;
  row: number;
  col: number;
  top: string;
  left: string;
  width: string;
  height: string;
}

interface PlacedImage {
  id: number;
  imageUrl: string;
  targetCell: Cell;
  startX: number;
  startY: number;
  startScale: number;
}

export default function Home() {
  const router = useRouter();
  const { address } = useAccount();
  const { user } = useAuth();

  const { data: freelancers = [], isLoading: isLoadingFreelancers } = useQuery({
    queryKey: ['freelancers'],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/users/freelancers");
      if (!res.ok) throw new Error("Erro ao buscar freelancers");
      const data = await res.json();
      return data.map((f: any) => ({
        id: f.id,
        name: f.name,
        role: f.title || "Freelancer Web3",
        description: f.bio || "Especialista em blockchain e contratos inteligentes.",
        rate: "0.05",
        rating: 5.0,
        jobs: Math.floor(Math.random() * 50),
        avatar: f.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${f.wallet}`,
        wallet: f.wallet
      }));
    }
  });

  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  const [amount, setAmount] = useState("");
  const [isEscrow, setIsEscrow] = useState(true);
  const [error, setError] = useState("");

  // Estados para controle do grid e animação
  const [activeImages, setActiveImages] = useState<PlacedImage[]>([]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'pix'>('crypto');
  const [pixStatus, setPixStatus] = useState<'idle' | 'loading' | 'waiting_payment' | 'completed'>('idle');

  // Gera posição inicial aleatória para a animação
  const getRandomStartPosition = () => {
    const side = Math.floor(Math.random() * 4);
    const randomX = 20 + Math.random() * 60;
    const randomY = 20 + Math.random() * 60;

    switch (side) {
      case 0: return { x: randomX, y: -10 }; // topo
      case 1: return { x: 110, y: randomY }; // direita
      case 2: return { x: randomX, y: 110 }; // baixo
      default: return { x: -10, y: randomY }; // esquerda
    }
  };

  // Controla o ciclo de animações
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let cycleTimeoutId: NodeJS.Timeout;

    const cellWidth = `${100 / GRID_COLS}%`;
    const cellHeight = `${100 / GRID_ROWS}%`;
    const predefinedCells: Cell[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        predefinedCells.push({
          id: row * GRID_COLS + col,
          row,
          col,
          top: `${(row / GRID_ROWS) * 100}%`,
          left: `${(col / GRID_COLS) * 100}%`,
          width: cellWidth,
          height: cellHeight,
        });
      }
    }

    const availableIds = predefinedCells.map(c => c.id);

    // Misturar as imagens
    const shuffledImages = [...BACKGROUND_IMAGES].sort(() => Math.random() - 0.5);
    let currentImageIndex = 0;

    // Função de spawn disparada continuamente a cada X milissegundos
    intervalId = setInterval(() => {
      setActiveImages(prev => {
        const usedIds = prev.map(img => img.targetCell.id);
        const available = availableIds.filter(id => !usedIds.includes(id));

        let selectedCellId: number;
        if (available.length > 0) {
          // Fase 1: Preenche as vazias primeiro (Grid inicial)
          selectedCellId = available[Math.floor(Math.random() * available.length)];
        } else {
          // Fase 2: Grid está cheio! Escolhe uma aleatória para substituir e manter o fundo pulsante
          selectedCellId = availableIds[Math.floor(Math.random() * availableIds.length)];
        }

        const targetCell = predefinedCells.find(c => c.id === selectedCellId)!;
        const startPos = getRandomStartPosition();

        const newImage: PlacedImage = {
          id: Date.now() + Math.random(),
          imageUrl: shuffledImages[currentImageIndex % shuffledImages.length],
          targetCell,
          startX: startPos.x,
          startY: startPos.y,
          startScale: 3.5 + Math.random() * 1.5,
        };

        currentImageIndex++;

        // Remove a imagem velha dessa célula (se existir) para gerar o fade-out mantendo o dom e a opacidade consistentes
        return [...prev.filter(img => img.targetCell.id !== selectedCellId), newImage];
      });
    }, 400); // 400ms de intervalo constante

    return () => {
      clearTimeout(intervalId);
    };
  }, []);

  const openCheckout = async (freelancer: Freelancer) => {
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
      const res = await fetch("http://localhost:3001/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), sellerAddress: selectedFreelancer.wallet, isEscrow }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Erro ao criar checkout");

      router.push(`/checkout/${data.sessionId}`);

    } catch (err: any) {
      setError(err.message);
      setPixStatus('idle');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F4F6F8] text-[#2D2D2D] font-sans selection:bg-[#00AEEF]/30 overflow-hidden">

      {/* CAMADA DE FUNDO COM GRID SINCRONIZADO */}
      <div className="fixed inset-0 z-0 bg-[#F4F6F8]">
        {/* Overlay claro ajustado para não esconder as imagens do grid */}
        <div className="absolute inset-0 bg-[#F4F6F8]/40 z-10 pointer-events-none" />

        {/* Imagens em animação de zoom-out que formam o grid */}
        <AnimatePresence>
          {activeImages.map((image) => {
            const targetCell = image.targetCell;
            return (
              <motion.div
                key={image.id}
                className="absolute overflow-hidden rounded-lg shadow-none"
                initial={{
                  left: `${image.startX}%`,
                  top: `${image.startY}%`,
                  x: '-50%',
                  y: '-50%',
                  scale: image.startScale,
                  opacity: 0,
                  filter: 'blur(12px) brightness(1.2)',
                  zIndex: 20, // Por cima do overlay durante animação de entrada
                }}
                animate={{
                  left: targetCell.left,
                  top: targetCell.top,
                  x: '0%',
                  y: '0%',
                  scale: 1,
                  opacity: 1, // Opacidade 100% de acordo com as regras solicitadas
                  filter: 'blur(0px) brightness(1.0)',
                  transitionEnd: {
                    zIndex: 0, // Vai para trás do overlay (z-10) apenas ao descansar, mantendo-se visível no dom
                  }
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  filter: 'blur(10px)',
                  transition: { duration: 0.8 }
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.34, 1.2, 0.64, 1],
                }}
                style={{
                  width: targetCell.width,
                  height: targetCell.height,
                  transformOrigin: "center center",
                }}
              >
                <img
                  src={image.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    pointerEvents: 'none',
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Gradientes para suavizar */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F6F8]/60 via-transparent to-[#F4F6F8]/60 z-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 z-30 pointer-events-none" />
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">

        {/* VIEW A: Marketplace Grid */}
        {!selectedFreelancer && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="mb-16">
              <div className="group relative bg-[#FFFFFF]/90 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Efeitos de Luz de Fundo */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-[#00AEEF]/20 to-transparent rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-[#00C48C]/20 to-transparent rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />

                <div className="relative z-10 text-center md:text-left w-full">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#2D2D2D] tracking-tight leading-tight">
                    Freelancers qualificados prontos para trabalhar no seu <span className="bg-gradient-to-r from-[#00AEEF] to-[#0052CC] bg-clip-text text-transparent">projeto hoje mesmo</span>
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {isLoadingFreelancers ? (
                <div className="col-span-full flex justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-[#00AEEF]" />
                </div>
              ) : freelancers.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
                  <p className="text-[#666666] font-bold">Nenhum profissional disponível no momento.</p>
                </div>
              ) : (
                freelancers.map((dev: Freelancer) => (
                  <div key={dev.id} className="group relative bg-[#FFFFFF]/90 backdrop-blur-xl rounded-[32px] border border-slate-200 hover:border-[#00AEEF]/50 transition-all duration-500 flex flex-col overflow-hidden shadow-xl hover:shadow-[#00AEEF]/10">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#00AEEF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="h-24 bg-gradient-to-br from-[#00AEEF]/10 via-[#00AEEF]/5 to-slate-100 p-6 relative">
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center bg-white/90 backdrop-blur-md text-[#2D2D2D] px-3 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase border border-slate-200 shadow-sm">
                          <Star className="w-3.5 h-3.5 mr-1.5 fill-[#00AEEF] text-[#00AEEF]" />
                          {dev.rating}
                        </div>
                        <span className="text-[#666666] bg-white/60 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.2em]">{dev.jobs} jobs</span>
                      </div>
                    </div>

                    <div className="px-6 -mt-10 mb-5 relative z-10">
                      <div className="relative inline-block">
                        <img src={dev.avatar} alt={dev.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#FFFFFF] shadow-lg group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00C48C] rounded-full border-[3px] border-[#FFFFFF]" />
                      </div>
                    </div>

                    <div className="px-8 pb-8 flex flex-col flex-grow relative z-10">
                      <h3 className="font-black text-xl text-[#2D2D2D] group-hover:text-[#0052CC] transition-colors uppercase tracking-tighter">{dev.name}</h3>
                      <div className="flex items-center text-[#00AEEF] text-[11px] font-black uppercase tracking-widest mt-1 mb-4">
                        <Briefcase className="w-3.5 h-3.5 mr-2" />
                        {dev.role}
                      </div>

                      <p className="text-sm text-[#666666] font-medium line-clamp-2 mb-6 flex-grow leading-relaxed">{dev.description}</p>

                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push(`/freelancer/${dev.id}`)}
                          className="flex-1 py-4 bg-[#F4F6F8] text-[#2D2D2D] font-bold rounded-[18px] hover:bg-slate-200 transition-all text-xs uppercase tracking-widest border border-slate-200"
                        >
                          Perfil
                        </button>
                        <button
                          onClick={() => openCheckout(dev)}
                          className="flex-1 bg-[#00AEEF] text-white font-bold py-4 rounded-[18px] hover:bg-[#0052CC] transition-all shadow-lg shadow-[#00AEEF]/20 text-xs uppercase tracking-widest active:scale-95"
                        >
                          Contratar
                        </button>
                      </div>
                    </div>
                  </div>
                )))}
            </div>
          </div>
        )}

        {/* VIEW B: Checkout Form */}
        {selectedFreelancer && (
          <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setSelectedFreelancer(null)}
              className="flex items-center text-sm font-semibold text-[#666666] hover:text-[#0052CC] mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar aos profissionais
            </button>

            <div className="bg-[#FFFFFF]/90 backdrop-blur-xl rounded-2xl border border-[#F4F6F8] shadow-sm p-5 mb-6 flex items-center gap-4">
              <img src={selectedFreelancer.avatar} alt="Avatar" className="w-16 h-16 rounded-full ring-4 ring-[#F4F6F8]" />
              <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-lg text-[#2D2D2D]">{selectedFreelancer.name}</h3>
                <p className="text-[#666666] font-medium text-sm truncate">{selectedFreelancer.role}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-[#F4F6F8] text-[#666666] font-mono px-2 py-0.5 rounded-md truncate max-w-[200px]">
                    {selectedFreelancer.wallet}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex bg-[#F4F6F8] p-1 rounded-xl mb-6 border border-slate-200">
              <button
                onClick={() => setPaymentMethod('crypto')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${paymentMethod === 'crypto'
                  ? 'bg-[#00AEEF] text-white shadow-md'
                  : 'text-[#666666] hover:text-[#2D2D2D]'
                  }`}
              >
                Com Carteira (Web3)
              </button>
              <button
                onClick={() => setPaymentMethod('pix')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${paymentMethod === 'pix'
                  ? 'bg-[#00C48C] text-white shadow-md'
                  : 'text-[#666666] hover:text-[#2D2D2D]'
                  }`}
              >
                Via Pix (Sem Conta)
              </button>
            </div>

            {paymentMethod === 'crypto' && (
              <div className="flex flex-col gap-4 mb-6">
                <NetworkChecker />
                <div className="bg-[#FFFFFF]/90 backdrop-blur-xl rounded-2xl border border-[#F4F6F8] shadow-sm p-4">
                  <ConnectWallet />
                </div>
              </div>
            )}

            <div className="bg-[#FFFFFF]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#2D2D2D]">
                  {paymentMethod === 'crypto' ? 'Configurar Pagamento' : 'Checkout Rápido BRL'}
                </h2>
              </div>

              <form onSubmit={paymentMethod === 'crypto' ? handleCryptoSubmit : handlePixSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-[#666666] mb-2">
                    Valor a repassar ({paymentMethod === 'crypto' ? 'MATIC' : 'BRL'})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-[#F4F6F8] border border-slate-200 rounded-xl focus:bg-[#FFFFFF] focus:ring-4 focus:ring-[#00AEEF]/20 focus:border-[#00AEEF] outline-none transition-all placeholder:text-slate-400 font-mono text-xl font-bold text-[#2D2D2D] pr-16"
                      disabled={isPending || isConfirming || pixStatus !== 'idle'}
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <span className="text-[#666666] font-medium text-lg">
                        {paymentMethod === 'crypto' ? 'MATIC' : 'R$'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl transition-colors ${isEscrow
                  ? 'bg-[#00AEEF]/5 border border-[#00AEEF]/20'
                  : 'bg-[#F4F6F8] border border-slate-200'
                  }`}>
                  <div>
                    <p className="text-sm font-bold text-[#2D2D2D]">Reter Pagamento (Aconselhado)</p>
                    <p className="text-xs text-[#666666] mt-0.5 max-w-[250px] leading-relaxed">
                      O contrato prende os fundos e você decide quando deve liberar o pagamento para o Freelancer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEscrow(!isEscrow)}
                    className={`w-12 h-6 flex shrink-0 items-center rounded-full p-1 transition-colors ${isEscrow ? 'bg-[#00AEEF]' : 'bg-[#666666]'
                      }`}
                  >
                    <div className={`bg-[#FFFFFF] w-4 h-4 rounded-full shadow-md transform transition-transform ${isEscrow ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                  </button>
                </div>

                {error && (
                  <div className="flex p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mr-3 text-red-500" />
                    <p className="leading-tight pt-0.5">{error}</p>
                  </div>
                )}

                {isSuccess && paymentMethod === 'crypto' && (
                  <div className="flex p-4 bg-[#00C48C]/10 border border-[#00C48C]/20 rounded-xl text-[#00C48C] text-sm animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="w-5 h-5 shrink-0 mr-3 text-[#00C48C]" />
                    <p className="leading-tight pt-0.5 text-[#2D2D2D] font-medium">Pagamento enviado {isEscrow ? "e bloqueado" : "e finalizado"} com sucesso!</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={(paymentMethod === 'crypto' && !address) || isPending || isConfirming || pixStatus !== 'idle'}
                  className={`w-full relative group flex items-center justify-center gap-2 px-6 py-4 text-[#FFFFFF] rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] ${paymentMethod === 'crypto'
                    ? 'bg-[#00AEEF] hover:bg-[#0052CC] shadow-[#00AEEF]/20'
                    : 'bg-[#00C48C] hover:bg-[#0052CC] shadow-[#00C48C]/20'
                    }`}
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