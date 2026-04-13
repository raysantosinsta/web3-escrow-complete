// app/jobs/[id]/page.tsx
"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Key } from "react";
import { useAuth } from "../../components/AuthContext";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  MessageSquare,
  SendHorizonal,
  ShieldCheck,
  Unlock,
  User,
  Wallet
} from "lucide-react";
import { parseEther } from "viem";
import { useAccount, useBalance, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "../../constants/contracts";

const CONTRACT_ADDRESS = ESCROW_ADDRESS;
const MATIC_TO_BRL = 2.5; // Mock rate for conversion

type Job = {
  id: string; title: string; status: string; description?: string;
  price: number; freelancer: { wallet: string, name: string; avatar?: string };
  client: { wallet: string, name: string; avatar?: string };
  onchainPaymentId?: number | null;
  blockchainTxHash?: string | null;
  messages: Message[];
};

type Message = {
  id?: string; content?: string; senderId?: string; isSystemEvent: boolean;
  sender?: { wallet: string, name: string }; createdAt?: Date;
};

const statusConfig = {
  negotiating: { label: "Negociação", color: "warning", icon: MessageSquare, step: 1, bg: "bg-amber-100/50", text: "text-amber-500", border: "border-amber-200" },
  funded: { label: "Fundado", color: "info", icon: Wallet, step: 2, bg: "bg-[#00AEEF]/10", text: "text-[#00AEEF]", border: "border-[#00AEEF]/20" },
  reviewing: { label: "Revisão", color: "primary", icon: Clock, step: 3, bg: "bg-purple-100/50", text: "text-purple-500", border: "border-purple-200" },
  completed: { label: "Concluído", color: "success", icon: CheckCircle, step: 4, bg: "bg-[#00C48C]/10", text: "text-[#00C48C]", border: "border-[#00C48C]/20" }
};

export default function JobWorkroom() {
  const { id } = useParams();
  const router = useRouter();
  const { user, socket, clearChatNotifications } = useAuth();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { data: job, isLoading: isLoadingJob, error: queryError } = useQuery<Job>({
    queryKey: ['job', id],
    queryFn: async () => {
      console.log(`[JobPage] 🔍 Iniciando busca pelo Job: ${id}`);
      if (!id || id === 'undefined') {
        console.warn(`[JobPage] ⚠️ ID inválido detectado: ${id}`);
        return null;
      }
      const res = await fetch(`http://localhost:3001/api/jobs/${id}`);
      console.log(`[JobPage] 📡 Resposta do Backend para ${id}:`, res.status);
      if (!res.ok) {
        console.error(`[JobPage] ❌ Erro ao buscar Job: ${res.status} ${res.statusText}`);
        throw new Error('Job não encontrado');
      }
      const data = await res.json();
      console.log(`[JobPage] ✅ Job carregado:`, data.title);
      return data;
    },
    enabled: !!id && id !== 'undefined'
  });

  const messages = job?.messages || [];
  const [inputText, setInputText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentChoiceModal, setShowPaymentChoiceModal] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [actionType, setActionType] = useState<"fund" | "deliver" | "release" | null>(null);
  const [gatewayStep, setGatewayStep] = useState<"form" | "pix" | "success">("form");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [pixAmount, setPixAmount] = useState(0);
  const [cryptoAmount, setCryptoAmount] = useState<string | number>(0);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; sessionId: string } | null>(null);
  const [isGatewayLoading, setIsGatewayLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { writeContract, writeContractAsync, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: clientBalance, refetch: refetchClient } = useBalance({ address: job?.client?.wallet as `0x${string}`, query: { enabled: !!job?.client?.wallet } });
  const { data: freelancerBalance, refetch: refetchFreelancer } = useBalance({ address: job?.freelancer?.wallet as `0x${string}`, query: { enabled: !!job?.freelancer?.wallet } });

  useEffect(() => {
    if (id && typeof id === 'string') {
      clearChatNotifications('job', id);
    }
  }, [id, user?.wallet]);

  useEffect(() => {
    if (!socket || !id || id === 'undefined') return;

    const joinRoom = () => {
      if (socket.connected && socket.id) {
        console.log(`[JobPage] 📤 Emitindo joinRoom para jobId=${id} via socket ${socket.id}`);
        socket.emit('joinRoom', { jobId: id });
      } else {
        console.log(`[JobPage] ⏳ Aguardando conexão do socket para joinRoom...`);
      }
    };

    const handleConnect = () => {
      console.log(`[JobPage] ✅ Socket conectado id=${socket.id}`);
      joinRoom();
    };

    const handleNewMessage = (msg: Message) => {
      console.log(`[JobPage] 📩 newMessage recebida:`, msg.content);
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    };

    const handleSystemNotification = (msg: Message) => {
      console.log(`[JobPage] 🔔 systemNotification:`, msg.content);
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      refetchClient();
      refetchFreelancer();
    };

    const handleEscrowFunded = (data: { amount: number; txHash: string; paymentId: number }) => {
      console.log(`[JobPage] 💰 Evento escrow_funded recebido!`, data);
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      setShowGatewayModal(false);
      refetchClient();
      refetchFreelancer();
    };

    // Tenta entrar se já estiver conectado
    joinRoom();

    socket.on('connect', handleConnect);
    socket.on('newMessage', handleNewMessage);
    socket.on('systemNotification', handleSystemNotification);
    socket.on('escrow_funded', handleEscrowFunded);

    return () => {
      console.log(`[JobPage] 🧹 Removendo listeners do socket`);
      socket.off('connect', handleConnect);
      socket.off('newMessage', handleNewMessage);
      socket.off('systemNotification', handleSystemNotification);
      socket.off('escrow_funded', handleEscrowFunded);
    };

  }, [socket, id]);

  useEffect(() => {
    if (isSuccess) {
      refetchClient();
      refetchFreelancer();
      // Invalida a query do job para atualizar o status vindo do backend
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      setShowConfirmModal(false);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (job?.price) {
      setPixAmount(job.price * MATIC_TO_BRL);
      setCryptoAmount(job.price);
    }
  }, [job?.price]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!socket) throw new Error("Socket não conectado");
      socket.emit('sendMessage', {
        jobId: id,
        senderWallet: user.wallet,
        content
      });
    },
    onSuccess: () => {
      setInputText("");
      inputRef.current?.focus();
    }
  });

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessageMutation.mutate(inputText);
  };

  const startGatewayFlow = () => {
    setGatewayStep("form");
    setShowGatewayModal(true);
  };

  const generatePix = async () => {
    if (!payerName || !payerEmail) return alert("Preencha nome e e-mail");

    setIsGatewayLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: id,
          name: payerName,
          email: payerEmail,
          amount: pixAmount
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao gerar cobrança PIX");
      }

      const data = await res.json();
      setPixData(data);
      setGatewayStep("pix");
      if (data.sessionId) {
        startPolling(data.sessionId);
      }
    } catch (error: any) {
      console.error("Erro ao gerar PIX:", error);
      alert(error.message || "Erro ao gerar PIX. Verifique o console.");
    } finally {
      setIsGatewayLoading(false);
    }
  };

  const startPolling = (sessionId: string) => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/payments/session/${sessionId}`);
        if (!res.ok) return;

        // Verifica se a resposta tem conteúdo antes de tentar o .json()
        const text = await res.text();
        if (!text || text === "null") return;

        const data = JSON.parse(text);
        if (data && data.status === 'completed_onchain') {
          setGatewayStep("success");
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['job', id] });
        }
      } catch (error) {
        console.error("Erro no polling:", error);
      }
    }, 3000);
  };



  const updateJobStatus = async (status: string) => {
    try {
      await fetch(`http://localhost:3001/api/jobs/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleAction = (type: "fund" | "deliver" | "release") => {
    setActionType(type);
    if (type === "fund") {
      setShowPaymentChoiceModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleChoosePayment = (method: "crypto" | "pix") => {
    setShowPaymentChoiceModal(false);
    if (method === "crypto") {
      setShowConfirmModal(true);
    } else {
      startGatewayFlow();
    }
  };

  const confirmAction = async () => {
    if (actionType === "fund" && job) {
      try {
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: ESCROW_ABI as any,
          functionName: "pay",
          args: [job.freelancer.wallet as `0x${string}`, address as `0x${string}`, true],
          value: parseEther(cryptoAmount.toString()),
        });

        if (hash) {
          console.log(`[JobPage] 🚀 Transação enviada com sucesso! Hash: ${hash}`);
          
          // VINCULA O HASH AO JOB NO BACKEND IMEDIATAMENTE
          console.log(`[JobPage] 📡 Chamando API para salvar o hash no backend...`);
          const updateRes = await fetch(`http://localhost:3001/api/jobs/${id}/tx-hash`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blockchainTxHash: hash })
          });
          
          if (updateRes.ok) {
            console.log(`[JobPage] ✅ Hash salvo no backend com sucesso!`);
          } else {
            const errData = await updateRes.json().catch(() => ({}));
            console.error(`[JobPage] ❌ Erro ao salvar hash no backend:`, errData);
          }

          setShowConfirmModal(false);
          // O Indexador cuidará do resto e atualizará o status via WebSocket
        }
      } catch (err) {
        console.error("Erro ao financiar:", err);
      }
    } else if (actionType === "deliver") {
      updateJobStatus('reviewing');
      setShowConfirmModal(false);
    } else if (actionType === "release" && job) {
      // Tenta buscar os dados mais recentes do backend caso o websocket tenha falhado
      if (job.onchainPaymentId === undefined || job.onchainPaymentId === null) {
        try {
          const res = await fetch(`http://localhost:3001/api/jobs/${id}`);
          if (res.ok) {
            const data = await res.json();
            // Invalida a query para garantir que os dados locais sejam atualizados
            queryClient.setQueryData(['job', id], data);
          }
        } catch (e) {
          console.error("Falha ao atualizar job info antes do release", e);
        }
      }

      if (job.onchainPaymentId === undefined || job.onchainPaymentId === null) {
        console.warn(`[JobPage] ⚠️ Tentativa de liberar pagamento falhou: onchainPaymentId está ausente.`, {
          jobId: id,
          blockchainTxHash: job.blockchainTxHash,
          onchainPaymentId: job.onchainPaymentId
        });
        alert(`Erro: O ID do pagamento na blockchain não foi encontrado para este Job. 
        \nHash registrado: ${job.blockchainTxHash || 'Nenhum'} 
        \nVerifique se o indexador do backend está rodando.`);
        setShowConfirmModal(false);
        return;
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: ESCROW_ABI as any,
        functionName: "release",
        args: [BigInt(job.onchainPaymentId)],
      });
      // updateJobStatus('completed'); // Também pode vir via indexer no futuro
      setShowConfirmModal(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleActions = () => {
    if (!user || !job) return null;

    const actions = [];
    if (user.role === 'client' && job.status === 'negotiating') {
      actions.push({ type: "fund" as const, label: "Financiar Job", icon: Wallet, color: "blue" });
    }
    if (user.role === 'freelancer' && job.status === 'funded') {
      actions.push({ type: "deliver" as const, label: "Entregar Trabalho", icon: CheckCircle, color: "blue" });
    }
    if (user.role === 'client' && job.status === 'reviewing') {
      actions.push({ type: "release" as const, label: "Aprovar & Liberar Pagamento", icon: Unlock, color: "emerald" });
    }
    return actions;
  };

  if (queryError || (!isLoadingJob && !job)) return <ErrorState router={router} />;
  if (isLoadingJob || !job) return <LoadingState />;

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      {/* Header */}
      <header className="bg-[#FFFFFF]/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-[#F4F6F8] rounded-xl transition-all duration-200 group"
              >
                <ArrowLeft className="w-5 h-5 text-[#666666] group-hover:text-[#0052CC]" />
              </button>
              <div>
                <h1 className="font-bold text-xl text-[#2D2D2D]">{job.title}</h1>
                <p className="text-sm font-semibold text-[#666666] flex items-center gap-2">
                  <User className="w-3 h-3" />
                  {user.role === 'client' ? `Freelancer: ${job.freelancer.name}` : `Cliente: ${job.client.name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {job.status === 'funded' && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#00AEEF] bg-[#00AEEF]/10 px-3 py-1.5 rounded-lg border border-[#00AEEF]/20 animate-pulse">
                  <Lock className="w-3 h-3" />
                  {user.role === 'client' ? "EM GARANTIA" : "BLOQUEADO NO ESCROW"}
                </div>
              )}
              <StatusBadge
                status={job.status}
                config={statusConfig[job.status as keyof typeof statusConfig]}
                role={user.role}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat Section - Improved Contrast */}
          <div className="lg:col-span-2 bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-slate-200 bg-[#F4F6F8] rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#00AEEF]" />
                <span className="font-black text-[#2D2D2D]">Sala de Negociação</span>
                <span className="text-xs font-bold text-[#00C48C] ml-auto flex items-center gap-1">🔒 Segura</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m: any, idx: any) => (
                <MessageBubble key={idx} message={m} isMe={m.sender?.wallet?.toLowerCase() === user?.wallet?.toLowerCase()} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={sendMessage} className="p-4 bg-[#F4F6F8] border-t border-slate-200 rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  type="text"
                  placeholder="💬 Digite sua mensagem..."
                  className="flex-1 px-4 py-3 bg-[#FFFFFF] border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF] outline-none transition text-[#2D2D2D] font-medium placeholder-[#666666]/60 text-base shadow-sm"
                />
                <button
                  type="submit"
                  className="bg-[#00AEEF] hover:bg-[#0052CC] text-white p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendHorizonal className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[#666666] font-medium mt-2 text-center">
                Pressione Enter para enviar • Mensagens seguras ponta a ponta
              </p>
            </form>
          </div>

          {/* Escrow Panel - Light Theme */}
          <div className="lg:col-span-1">
            <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 sticky top-24">
              <div className="p-6 border-b border-slate-200">
                <h2 className="font-bold text-lg text-[#2D2D2D] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#00AEEF]" />
                  Contrato de garantia
                </h2>
                <p className="text-xs text-[#666666] mt-1 font-medium">🔒 Garantia Web3 na Polygon</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Progress Steps */}
                <ProgressSteps currentStatus={job.status} statusConfig={statusConfig} />

                {/* Amount */}
                <div className="bg-[#F4F6F8] rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#666666]">
                      {job.status === 'negotiating' ? "Valor do Job" : "Saldo em Escrow"}
                    </span>
                    <span className="text-2xl font-black text-[#2D2D2D]">{job.price} MATIC</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="font-bold text-[#00AEEF]">≈ R$ {(job.price * MATIC_TO_BRL).toFixed(2).replace('.', ',')} BRL</span>
                    {job.status === 'funded' ? (
                      <span className="text-[#00C48C] font-black uppercase text-[10px] tracking-widest flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {user.role === 'client' ? "PAGAMENTO ENVIADO" : "RECEBIDO EM GARANTIA"}
                      </span>
                    ) : (
                      <span className="text-[#666666] font-bold">🟣 Rede Polygon</span>
                    )}
                  </div>
                </div>



                {/* Job Details */}
                {job.description && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-[#2D2D2D]">Descrição do Trabalho</h3>
                    <p className="text-sm font-medium text-[#666666] bg-[#F4F6F8] p-3 rounded-xl border border-slate-200 leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {getRoleActions()?.map((action) => (
                    <button
                      key={action.type}
                      onClick={() => handleAction(action.type)}
                      disabled={isPending || isConfirming}
                      className={`w-full py-4 ${action.color === 'green' ? 'bg-[#00C48C] hover:bg-[#0052CC] shadow-[#00C48C]/20' :
                        action.color === 'blue' ? 'bg-[#00AEEF] hover:bg-[#0052CC] shadow-[#00AEEF]/20' :
                          'bg-[#00AEEF] hover:bg-[#0052CC] shadow-[#00AEEF]/20' // Fallback para azul brand
                        } text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {(isPending || isConfirming) && action.type === "fund" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <action.icon className="w-5 h-5" />
                      )}
                      {isPending || isConfirming ? "Processando na Blockchain..." : action.label}
                    </button>
                  ))}
                </div>

                {/* Transaction Status */}
                {txHash && (
                  <div className="bg-[#F4F6F8] rounded-xl p-3 border border-slate-200">
                    <p className="text-[#666666] text-xs font-bold mb-2">📋 Transação:</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs text-[#2D2D2D] font-mono font-bold break-all flex-1">
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </code>
                      <a
                        href={`https://amoy.polygonscan.com/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00AEEF] hover:text-[#0052CC] transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    {isConfirming && (
                      <p className="text-amber-500 font-bold mt-2 flex items-center gap-1 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Confirmando na rede...
                      </p>
                    )}
                    {isSuccess && (
                      <p className="text-[#00C48C] font-bold mt-2 flex items-center gap-1 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Transação confirmada!
                      </p>
                    )}
                  </div>
                )}

                {writeError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">Erro: {writeError.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Choice Modal */}
      {showPaymentChoiceModal && (
        <PaymentMethodModal
          job={job}
          onChoose={handleChoosePayment}
          onCancel={() => setShowPaymentChoiceModal(false)}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmationModal
          actionType={actionType}
          job={job}
          cryptoAmount={cryptoAmount}
          setCryptoAmount={setCryptoAmount}
          onConfirm={confirmAction}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* Gateway Modal */}
      {showGatewayModal && (
        <GatewayModal
          step={gatewayStep}
          pixAmount={pixAmount}
          setPixAmount={setPixAmount}
          payerName={payerName}
          setPayerName={setPayerName}
          payerEmail={payerEmail}
          setPayerEmail={setPayerEmail}
          pixData={pixData}
          loading={isGatewayLoading}
          onGenerate={generatePix}
          onClose={() => setShowGatewayModal(false)}
        />
      )}
    </div>
  );
}

// Componentes Auxiliares - Sincronização e Erros

const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-[#00AEEF] mx-auto mb-4" />
      <p className="text-[#666666] font-bold animate-pulse">Carregando Sala de Trabalho...</p>
    </div>
  </div>
);

const ErrorState = ({ router }: { router: any }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
    <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-200 text-center max-w-md mx-4">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-black text-[#2D2D2D] mb-4">Job não encontrado</h2>
      <p className="text-[#666666] font-medium mb-8 leading-relaxed">
        Não conseguimos localizar este job. Ele pode ter sido removido ou o link está incorreto.
      </p>
      <button
        onClick={() => router.push('/')}
        className="w-full py-4 bg-[#00AEEF] text-white rounded-2xl font-bold tracking-widest uppercase shadow-lg hover:bg-[#0052CC] transition-all"
      >
        Voltar ao Marketplace
      </button>
    </div>
  </div>
);

// Componentes Auxiliares - Dark Theme
const StatusBadge = ({ status, config, role }: { status: string; config: any; role: string }) => {
  let label = config.label;

  // Customizações solicitadas pelo usuário para o status 'funded'
  if (status === 'funded') {
    label = role === 'client' ? "Pagamento Enviado" : "Garantia Recebida";
  }

  return (
    <div className={`px-4 py-2 rounded-full border ${config.bg} ${config.border} flex items-center gap-2`}>
      <config.icon className={`w-4 h-4 ${config.text}`} />
      <span className={`font-semibold text-sm ${config.text}`}>{label}</span>
    </div>
  );
};


const ProgressSteps = ({ currentStatus, statusConfig }: { currentStatus: string; statusConfig: any }) => {
  const steps = ["negotiating", "funded", "reviewing", "completed"];
  const currentStep = statusConfig[currentStatus]?.step || 1;

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const config = statusConfig[step];

          return (
            <div key={step} className="flex-1 text-center">
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${isCompleted ? 'bg-[#00C48C] text-white shadow-md' : isCurrent ? 'bg-[#00AEEF] text-white ring-4 ring-[#00AEEF]/20' : 'bg-[#F4F6F8] text-[#666666] border border-slate-200'}`}>
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-[#666666] hidden sm:block">{config?.label}</p>
            </div>
          );
        })}
      </div>
      <div className="relative h-1.5 bg-[#F4F6F8] rounded-full overflow-hidden border border-slate-100">
        <div className="absolute top-0 left-0 h-full bg-[#00AEEF] transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }} />
      </div>
    </div>
  );
};

const MessageBubble = ({ message, isMe }: { message: Message; isMe: boolean }) => {
  if (message.isSystemEvent) {
    return (
      <div className="flex justify-center">
        <div className="bg-[#FFFFFF] border border-slate-200 text-[#666666] font-medium text-xs px-4 py-2 rounded-full flex items-center gap-2 max-w-[80%] shadow-sm">
          <Info className="w-3 h-3 text-[#00AEEF]" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
      <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm font-medium ${isMe
        ? 'bg-[#00AEEF] text-white rounded-br-none'
        : 'bg-[#F4F6F8] text-[#2D2D2D] rounded-bl-none border border-slate-200'
        }`}>
        {message.content}
      </div>
      <span className={`text-[10px] font-bold text-[#666666] uppercase tracking-widest mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
        {message.sender?.name || (isMe ? 'Você' : 'Sistema')} • agora
      </span>
    </div>
  );
};


const ConfirmationModal = ({ actionType, job, cryptoAmount, setCryptoAmount, onConfirm, onCancel }: any) => {
  const configs = {
    fund: { title: "Financiar Escrow (Crypto)", message: `Você está prestes a depositar fundos no contrato Escrow. O valor ficará seguro até a conclusão do trabalho.`, confirmText: "Confirmar Depósito", icon: ShieldCheck, color: "text-[#00AEEF]", bg: "bg-[#00AEEF]/10" },
    deliver: { title: "Entregar Trabalho", message: "Confirma que o trabalho foi concluído e está pronto para revisão?", confirmText: "Confirmar Entrega", icon: CheckCircle, color: "text-[#00AEEF]", bg: "bg-[#00AEEF]/10" },
    release: { title: "Liberar Pagamento", message: "Você está prestes a liberar o pagamento para o freelancer. Esta ação é irreversível.", confirmText: "Liberar Pagamento", icon: Unlock, color: "text-[#00C48C]", bg: "bg-[#00C48C]/10" }
  };

  const config = configs[actionType as keyof typeof configs];
  if (!config) return null;

  return (
    <div className="fixed inset-0 bg-[#2D2D2D]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FFFFFF] rounded-3xl shadow-xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200 border border-slate-200">
        <div className="text-center">
          <div className={`w-16 h-16 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <config.icon className={`w-8 h-8 ${config.color}`} />
          </div>
          <h3 className="text-xl font-black text-[#2D2D2D] mb-2">{config.title}</h3>
          
          {actionType === 'fund' ? (
            <div className="mb-6 bg-[#F4F6F8] p-4 rounded-2xl border border-slate-200 text-left">
              <label className="block text-[10px] font-black text-[#666666] uppercase tracking-widest mb-2">Valor do Depósito (MATIC)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  step="0.01"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-[#2D2D2D] outline-none focus:ring-2 focus:ring-[#00AEEF]"
                />
              </div>
              <p className="text-[10px] text-[#666666] font-medium mt-2">Este valor será enviado da sua Metamask para o contrato.</p>
            </div>
          ) : (
            <p className="text-[#666666] font-medium mb-8 leading-relaxed">{config.message}</p>
          )}

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-[#666666] font-bold hover:bg-[#F4F6F8] transition">
              Cancelar
            </button>
            <button onClick={onConfirm} className={`flex-1 px-4 py-3 ${actionType === 'release' ? 'bg-[#00C48C] hover:bg-[#00C48C]/90' : 'bg-[#00AEEF] hover:bg-[#0052CC]'} text-white rounded-xl font-bold transition shadow-md`}>
              {config.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentMethodModal = ({ job, onChoose, onCancel }: any) => {
  return (
    <div className="fixed inset-0 bg-[#2D2D2D]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FFFFFF] rounded-[40px] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200">
        <div className="p-8 text-center border-b border-slate-100">
          <h3 className="text-2xl font-black text-[#2D2D2D] mb-2">Escolha como pagar</h3>
          <p className="text-[#666666] font-medium">Selecione o método de sua preferência para financiar o job de <span className="text-[#00AEEF] font-bold">{job.price} MATIC</span></p>
        </div>

        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opção Crypto */}
          <button
            onClick={() => onChoose("crypto")}
            className="flex flex-col items-center p-6 rounded-3xl border-2 border-slate-100 hover:border-[#00C48C] hover:bg-emerald-50/30 transition-all group text-center"
          >
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Wallet className="w-8 h-8 text-[#00C48C]" />
            </div>
            <h4 className="font-black text-[#2D2D2D] mb-1">Crypto (Web3)</h4>
            <p className="text-[10px] text-[#666666] font-bold uppercase tracking-widest mb-3">Direto via Metamask</p>
            <ul className="text-left text-[11px] text-[#666666] space-y-2 font-medium">
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00C48C]" /> Confirmação Imediata</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00C48C]" /> Menores Taxas</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00C48C]" /> 100% On-chain</li>
            </ul>
          </button>

          {/* Opção PIX */}
          <button
            onClick={() => onChoose("pix")}
            className="flex flex-col items-center p-6 rounded-3xl border-2 border-slate-100 hover:border-[#00AEEF] hover:bg-sky-50/30 transition-all group text-center"
          >
            <div className="w-14 h-14 bg-sky-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-8 h-8 text-[#00AEEF]" />
            </div>
            <h4 className="font-black text-[#2D2D2D] mb-1">PIX (Gateway)</h4>
            <p className="text-[10px] text-[#666666] font-bold uppercase tracking-widest mb-3">Converte BRL para MATIC</p>
            <ul className="text-left text-[11px] text-[#666666] space-y-2 font-medium">
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00AEEF]" /> Sem precisar de Crypto</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00AEEF]" /> Rápido e Seguro</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00AEEF]" /> Zero barreira técnica</li>
            </ul>
          </button>
        </div>

        <div className="p-6 bg-[#F4F6F8] flex justify-center">
          <button onClick={onCancel} className="text-[#666666] font-bold text-xs uppercase tracking-widest hover:text-[#2D2D2D] transition">
            Voltar para a Sala de Trabalho
          </button>
        </div>
      </div>
    </div>
  );
};


const GatewayModal = ({
  step, pixAmount, setPixAmount, payerName, setPayerName,
  payerEmail, setPayerEmail, pixData, loading, onGenerate, onClose
}: any) => {
  return (
    <div className="fixed inset-0 bg-[#2D2D2D]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FFFFFF] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200">

        {/* Header */}
        <div className="p-6 bg-[#00AEEF] flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Gateway de Pagamento</h3>
              <p className="text-xs font-semibold text-white/80">PIX para Escrow Blockchain</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {step === "form" && (
            <div className="space-y-6">
              <div className="bg-[#F4F6F8] p-5 rounded-2xl border border-slate-200 shadow-inner">
                <label className="block text-xs uppercase tracking-widest text-[#666666] font-bold mb-2">Valor do Pagamento (BRL)</label>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-[#2D2D2D]">R$</span>
                  <input
                    type="number"
                    value={pixAmount}
                    onChange={(e) => setPixAmount(Number(e.target.value))}
                    className="bg-transparent text-3xl font-black text-[#2D2D2D] w-full outline-none focus:ring-0"
                  />
                </div>
                <p className="text-xs font-bold text-[#00AEEF] mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Convertido para o contrato Escrow on-chain
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#666666] mb-2">Seu Nome</label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-slate-200 rounded-xl px-4 py-3 text-[#2D2D2D] font-medium focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#666666] mb-2">E-mail para Recibo</label>
                  <input
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-slate-200 rounded-xl px-4 py-3 text-[#2D2D2D] font-medium focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] outline-none transition"
                  />
                </div>
              </div>

              <button
                onClick={onGenerate}
                disabled={loading}
                className="w-full py-4 bg-[#00AEEF] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-[#0052CC] hover:shadow-[#0052CC]/20 transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    Gerar Cobrança PIX
                    <SendHorizonal className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="text-center space-y-6">
              <div className="bg-[#FFFFFF] p-4 rounded-3xl inline-block shadow-lg border border-slate-200">
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="space-y-4">
                <div className="bg-[#F4F6F8] p-4 rounded-xl border border-slate-200 relative group">
                  <p className="text-[10px] font-bold text-[#666666] mb-2 uppercase tracking-widest text-left">Código Copia e Cola</p>
                  <p className="text-sm text-[#2D2D2D] font-mono font-medium break-all text-left line-clamp-2">
                    {pixData.qrCode}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.qrCode);
                      alert("Copiado!");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#00AEEF] rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-[#0052CC]"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="bg-[#00AEEF]/10 p-4 rounded-xl border border-[#00AEEF]/20 animate-pulse">
                  <p className="text-[#00AEEF] font-bold text-sm flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aguardando confirmação do banco...
                  </p>
                </div>

                <button
                  onClick={async () => {
                    await fetch(`http://localhost:3001/api/payments/session/${pixData.sessionId}/simulate`, { method: "POST" });
                  }}
                  className="w-full py-2 bg-[#F4F6F8] text-[#666666] font-bold rounded-xl text-xs hover:bg-[#E2E8F0] transition border border-dashed border-slate-300"
                >
                  🚀 Simular Pagamento Confirmado (Apenas Teste)
                </button>
              </div>

              <p className="text-xs font-medium text-[#666666]">
                Pague pelo seu App de banco. Assim que confirmado, o saldo será enviado para a blockchain automaticamente.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-6">
              <div className="w-24 h-24 bg-[#00C48C]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#00C48C]/30 shadow-inner">
                <CheckCircle className="w-12 h-12 text-[#00C48C]" />
              </div>
              <h3 className="text-2xl font-black text-[#2D2D2D]">Pagamento Confirmado!</h3>
              <p className="text-[#666666] font-medium leading-relaxed">
                O PIX foi recebido e o contrato Escrow já foi financiado na blockchain.
              </p>
              <div className="bg-[#F4F6F8] p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-[#666666] mb-1">Hash da Transação:</p>
                <code className="text-[#00AEEF] font-bold text-xs break-all">
                  {pixData?.sessionId} (Processado)
                </code>
              </div>
              <button
                onClick={onClose}
                className="w-full py-4 bg-[#2D2D2D] hover:bg-black text-white rounded-2xl font-bold tracking-widest uppercase transition shadow-md"
              >
                Voltar para o Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};