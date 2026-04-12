// app/jobs/[id]/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";

import {
  Send, CheckCircle, ShieldCheck, ArrowLeft, SendHorizonal, Loader2,
  Wallet, Clock, User, Briefcase, MessageSquare, Lock, Unlock,
  Check, AlertCircle, Info, ThumbsUp, Star, Award, ExternalLink
} from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import escrowAbi from "../../../abi/Escrow.json";
import { parseEther } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const MATIC_TO_BRL = 2.5; // Mock rate for conversion

type Job = {
  id: string; title: string; status: string; description?: string;
  price: number; freelancer: { wallet: string, name: string; avatar?: string };
  client: { wallet: string, name: string; avatar?: string };
};

type Message = {
  id?: string; content: string; senderId?: string; isSystemEvent: boolean;
  sender?: { wallet: string, name: string }; createdAt?: Date;
};

const statusConfig = {
  negotiating: { label: "Negociação", color: "warning", icon: MessageSquare, step: 1, bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  funded: { label: "Fundado", color: "info", icon: Wallet, step: 2, bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  reviewing: { label: "Revisão", color: "primary", icon: Clock, step: 3, bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  completed: { label: "Concluído", color: "success", icon: CheckCircle, step: 4, bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" }
};

export default function JobWorkroom() {
  const { id } = useParams();
  const router = useRouter();
  const { user, socket } = useAuth();
  const { address } = useAccount();

  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [actionType, setActionType] = useState<"fund" | "deliver" | "release" | null>(null);
  const [gatewayStep, setGatewayStep] = useState<"form" | "pix" | "success">("form");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [pixAmount, setPixAmount] = useState(0);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; sessionId: string } | null>(null);
  const [isGatewayLoading, setIsGatewayLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!id || id === 'undefined') {
      setLoadError(true);
      return;
    }
    fetchJob();
  }, [id]);

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
      setMessages(prev => [...prev, msg]);
    };

    const handleSystemNotification = (msg: Message) => {
      console.log(`[JobPage] 🔔 systemNotification:`, msg.content);
      setMessages(prev => [...prev, msg]);
      fetchJob();
    };

    const handleEscrowFunded = (data: { amount: number; txHash: string; paymentId: number }) => {
      console.log(`[JobPage] 💰 Evento escrow_funded recebido!`, data);
      // Atualiza o job localmente para refletir o novo status IMEDIATAMENTE
      setJob(prev => prev ? { ...prev, status: 'funded' } : null);
      setShowGatewayModal(false); // Fecha o modal de pagamento se estiver aberto
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
    if (isSuccess && job?.status === 'negotiating') {
      updateJobStatus('funded');
      setShowConfirmModal(false);
    }
  }, [isSuccess, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const fetchJob = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/jobs/${id}`);
      if (!res.ok) throw new Error('Job não encontrado');
      const data = await res.json();
      setJob(data);
      setMessages(data.messages || []);
      if (data.price) {
        setPixAmount(data.price * MATIC_TO_BRL);
      }
    } catch {
      setLoadError(true);
    }
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
          fetchJob(); // Atualiza o status do job na página
        }
      } catch (error) {
        console.error("Erro no polling:", error);
      }
    }, 3000);
  };





  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    console.log(`[JobPage] 📤 sendMessage — socket.id=${socket?.id ?? 'null'}, content="${inputText}"`);
    socket?.emit('sendMessage', {
      jobId: id,
      senderWallet: user.wallet,
      content: inputText
    });
    setInputText("");
    inputRef.current?.focus();
  };

  const updateJobStatus = async (status: string) => {
    try {
      await fetch(`http://localhost:3001/api/jobs/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      fetchJob();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleAction = (type: "fund" | "deliver" | "release") => {
    if (type === "fund") {
      startGatewayFlow();
    } else {
      setActionType(type);
      setShowConfirmModal(true);
    }
  };

  const confirmAction = async () => {
    if (actionType === "fund" && job) {
      try {
        const hash = await writeContract({
          address: CONTRACT_ADDRESS,
          abi: escrowAbi.abi as any,
          functionName: "pay",
          args: [job.freelancer.wallet as `0x${string}`, true],
          value: parseEther(job.price.toString()),
        });

        if (hash) {
          console.log(`[JobPage] 📥 Transação enviada! Hash: ${hash}`);
          // VINCULA O HASH AO JOB NO BACKEND IMEDIATAMENTE
          await fetch(`http://localhost:3001/api/jobs/${id}/tx-hash`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blockchainTxHash: hash })
          });
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
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: escrowAbi.abi as any,
        functionName: "release",
        args: [BigInt(job.id.split('-')[0].replace(/\D/g, '') || "1")],
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
      actions.push({ type: "fund" as const, label: "Pagar via PIX", icon: ShieldCheck, color: "green" });
    }
    if (user.role === 'freelancer' && job.status === 'funded') {
      actions.push({ type: "deliver" as const, label: "Entregar Trabalho", icon: CheckCircle, color: "blue" });
    }
    if (user.role === 'client' && job.status === 'reviewing') {
      actions.push({ type: "release" as const, label: "Aprovar & Liberar Pagamento", icon: Unlock, color: "emerald" });
    }
    return actions;
  };

  if (loadError) return <ErrorState router={router} />;
  if (!job) return <LoadingState />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-800 rounded-xl transition-all duration-200 group"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
              </button>
              <div>
                <h1 className="font-bold text-xl text-white">{job.title}</h1>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  {user.role === 'client' ? `Freelancer: ${job.freelancer.name}` : `Cliente: ${job.client.name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               {job.status === 'funded' && (
                 <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 animate-pulse">
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
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-gray-200">Sala de Negociação</span>
                <span className="text-xs text-gray-500 ml-auto">🔒 Mensagens criptografadas</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m, idx) => (
                <MessageBubble key={idx} message={m} isMe={m.sender?.wallet?.toLowerCase() === user.wallet.toLowerCase()} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form - HIGH CONTRAST FIX */}
            <form onSubmit={sendMessage} className="p-4 bg-gray-900 border-t border-gray-700 rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  type="text"
                  placeholder="💬 Digite sua mensagem..."
                  className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-white placeholder-gray-400 text-base"
                  style={{ color: 'white', backgroundColor: '#374151' }}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendHorizonal className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Pressione Enter para enviar • Mensagens seguras ponta a ponta
              </p>
            </form>
          </div>

          {/* Escrow Panel - Dark Theme */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 sticky top-24">
              <div className="p-6 border-b border-gray-700">
                <h2 className="font-bold text-lg text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Contrato de garantia
                </h2>
                <p className="text-xs text-gray-400 mt-1">🔒 Garantia Web3 na Polygon</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Progress Steps */}
                <ProgressSteps currentStatus={job.status} statusConfig={statusConfig} />

                {/* Amount */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-900 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {job.status === 'negotiating' ? "Valor do Job" : "Saldo em Escrow"}
                    </span>
                    <span className="text-2xl font-bold text-white">{job.price} MATIC</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="font-medium text-indigo-300">≈ R$ {(job.price * MATIC_TO_BRL).toFixed(2).replace('.', ',')} BRL</span>
                    {job.status === 'funded' ? (
                      <span className="text-green-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {user.role === 'client' ? "PAGAMENTO ENVIADO" : "RECEBIDO EM GARANTIA"}
                      </span>
                    ) : (
                      <span className="text-gray-400">🟣 Rede Polygon</span>
                    )}
                  </div>
                </div>



                {/* Job Details */}
                {job.description && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-300">Descrição do Trabalho</h3>
                    <p className="text-sm text-gray-400 bg-gray-900 p-3 rounded-xl border border-gray-700 leading-relaxed">
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
                      className={`w-full py-3 bg-gradient-to-r ${action.color === 'green' ? 'from-green-600 to-emerald-600' :
                        action.color === 'blue' ? 'from-blue-600 to-indigo-600' :
                          'from-emerald-600 to-green-600'
                        } text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {(isPending || isConfirming) && action.type === "fund" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <action.icon className="w-4 h-4" />
                      )}
                      {isPending || isConfirming ? "Processando na Blockchain..." : action.label}
                    </button>
                  ))}
                </div>

                {/* Transaction Status */}
                {txHash && (
                  <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                    <p className="text-gray-400 text-xs mb-2">📋 Transação:</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs text-gray-300 break-all flex-1">
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </code>
                      <a
                        href={`https://amoy.polygonscan.com/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {isConfirming && (
                      <p className="text-amber-400 mt-2 flex items-center gap-1 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Confirmando na rede...
                      </p>
                    )}
                    {isSuccess && (
                      <p className="text-green-400 mt-2 flex items-center gap-1 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Transação confirmada!
                      </p>
                    )}
                  </div>
                )}

                {writeError && (
                  <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Erro: {writeError.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmationModal
          actionType={actionType}
          job={job}
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
                ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-600/30' : 'bg-gray-700 text-gray-500'}`}>
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <p className="text-xs mt-2 text-gray-500 hidden sm:block">{config?.label}</p>
            </div>
          );
        })}
      </div>
      <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }} />
      </div>
    </div>
  );
};

const MessageBubble = ({ message, isMe }: { message: Message; isMe: boolean }) => {
  if (message.isSystemEvent) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-4 py-2 rounded-full flex items-center gap-2 max-w-[80%]">
          <Info className="w-3 h-3 text-blue-400" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
      <div className={`px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
        : 'bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600'
        }`}>
        {message.content}
      </div>
      <span className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
        {message.sender?.name || (isMe ? 'Você' : 'Sistema')} • agora
      </span>
    </div>
  );
};

const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-slate-900">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
      <p className="text-gray-400">Carregando Workroom...</p>
    </div>
  </div>
);

const ErrorState = ({ router }: { router: any }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-gray-900 to-slate-900">
    <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md border border-gray-700">
      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar</h2>
      <p className="text-gray-400 mb-6">Não foi possível abrir a sala de trabalho. Tente novamente.</p>
      <button onClick={() => router.push('/')} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
        Voltar ao Marketplace
      </button>
    </div>
  </div>
);

const ConfirmationModal = ({ actionType, job, onConfirm, onCancel }: any) => {
  const configs = {
    fund: { title: "Financiar Escrow", message: `Você está prestes a depositar ${job?.price} MATIC no contrato Escrow. Esses fundos ficarão seguros até a conclusão do trabalho.`, confirmText: "Confirmar Depósito", icon: ShieldCheck },
    deliver: { title: "Entregar Trabalho", message: "Confirma que o trabalho foi concluído e está pronto para revisão?", confirmText: "Confirmar Entrega", icon: CheckCircle },
    release: { title: "Liberar Pagamento", message: "Você está prestes a liberar o pagamento para o freelancer. Esta ação é irreversível.", confirmText: "Liberar Pagamento", icon: Unlock }
  };

  const config = configs[actionType as keyof typeof configs];
  if (!config) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <config.icon className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{config.title}</h3>
          <p className="text-gray-400 mb-6">{config.message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-700 transition">
              Cancelar
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition">
              {config.confirmText}
            </button>
          </div>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-700">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Gateway de Pagamento</h3>
              <p className="text-xs text-blue-100 italic">PIX para Escrow Blockchain</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {step === "form" && (
            <div className="space-y-6">
              <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Valor do Pagamento (BRL)</label>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">R$</span>
                  <input 
                    type="number" 
                    value={pixAmount}
                    onChange={(e) => setPixAmount(Number(e.target.value))}
                    className="bg-transparent text-3xl font-black text-white w-full outline-none focus:ring-0"
                  />
                </div>
                <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Convertido para o contrato Escrow on-chain
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Seu Nome</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João Silva"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">E-mail para Recibo</label>
                  <input 
                    type="email" 
                    placeholder="joao@exemplo.com"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={onGenerate}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
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
              <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl">
                {/* QR Code Placeholder/Image */}
                <img 
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="space-y-4">
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 relative group">
                  <p className="text-xs text-gray-500 mb-2 uppercase text-left">Código Copia e Cola</p>
                  <p className="text-sm text-gray-300 font-mono break-all text-left line-clamp-2">
                    {pixData.qrCode}
                  </p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.qrCode);
                      alert("Copiado!");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 animate-pulse">
                  <p className="text-blue-400 text-sm flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aguardando confirmação do banco...
                  </p>
                </div>

                <button 
                  onClick={async () => {
                    await fetch(`http://localhost:3001/api/payments/session/${pixData.sessionId}/simulate`, { method: "POST" });
                  }}
                  className="w-full py-2 bg-gray-700/50 text-gray-400 rounded-xl text-xs hover:bg-gray-600 transition border border-gray-600 border-dashed"
                >
                  🚀 Simular Pagamento Confirmado (Apenas Teste)
                </button>
              </div>


              <p className="text-xs text-gray-500">
                Pague pelo seu App de banco. Assim que confirmado, o saldo será enviado para a blockchain automaticamente.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-6">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/30">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">Pagamento Confirmado!</h3>
              <p className="text-gray-400">
                O PIX foi recebido e o contrato Escrow já foi financiado na blockchain.
              </p>
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Hash da Transação:</p>
                <code className="text-blue-400 text-xs break-all">
                  {pixData?.sessionId} (Processado)
                </code>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-gray-700 text-white rounded-2xl font-bold hover:bg-gray-600 transition"
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