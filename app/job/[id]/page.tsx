// app/jobs/[id]/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";

import {
  Send, CheckCircle, ShieldCheck, ArrowLeft, SendHorizonal, Loader2,
  Wallet, Clock, User, Briefcase, MessageSquare, Lock, Unlock,
  Check, AlertCircle, Info, ThumbsUp, Star, Award, Copy, ExternalLink
} from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import escrowAbi from "../../../abi/Escrow.json";
import { parseEther } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

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
  const [actionType, setActionType] = useState<"fund" | "deliver" | "release" | null>(null);
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

    // Tenta entrar se já estiver conectado
    joinRoom();

    socket.on('connect', handleConnect);
    socket.on('newMessage', handleNewMessage);
    socket.on('systemNotification', handleSystemNotification);

    return () => {
      console.log(`[JobPage] 🧹 Removendo listeners do socket`);
      socket.off('connect', handleConnect);
      socket.off('newMessage', handleNewMessage);
      socket.off('systemNotification', handleSystemNotification);
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
    } catch {
      setLoadError(true);
    }
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
    setActionType(type);
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    if (actionType === "fund" && job) {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: escrowAbi.abi as any,
        functionName: "pay",
        args: [job.freelancer.wallet as `0x${string}`, true],
        value: parseEther(job.price.toString()),
      });
    } else if (actionType === "deliver") {
      updateJobStatus('reviewing');
      setShowConfirmModal(false);
    } else if (actionType === "release" && job) {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: escrowAbi.abi as any,
        functionName: "release",
        args: [BigInt(job.id.split('-')[0].replace(/\D/g, '') || "1")], // Simple mapping to uint256 for local testing
      });
      updateJobStatus('completed');
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
      actions.push({ type: "fund" as const, label: "Financiar Escrow", icon: ShieldCheck, color: "green" });
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
            <StatusBadge status={job.status} config={statusConfig[job.status as keyof typeof statusConfig]} />
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
                  Escrow Contract
                </h2>
                <p className="text-xs text-gray-400 mt-1">🔒 Garantia Web3 na Polygon</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Progress Steps */}
                <ProgressSteps currentStatus={job.status} statusConfig={statusConfig} />

                {/* Amount */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-900 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Valor em Escrow</span>
                    <span className="text-2xl font-bold text-white">{job.price} MATIC</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>≈ ${(job.price * 0.5).toFixed(2)} USD</span>
                    <span>🟣 Rede Polygon</span>
                  </div>
                </div>

                {/* Wallet Address with Copy */}
                {CONTRACT_ADDRESS && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-300">Detalhes do Contrato</h3>
                    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-gray-400">{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}</code>
                        <button onClick={() => copyToClipboard(CONTRACT_ADDRESS)} className="p-1 hover:bg-gray-700 rounded-lg transition">
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                      {copied && <p className="text-xs text-green-400 mt-1">✓ Copiado!</p>}
                    </div>
                  </div>
                )}

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
    </div>
  );
}

// Componentes Auxiliares - Dark Theme
const StatusBadge = ({ status, config }: { status: string; config: any }) => {
  return (
    <div className={`px-4 py-2 rounded-full border ${config.bg} ${config.border} flex items-center gap-2`}>
      <config.icon className={`w-4 h-4 ${config.text}`} />
      <span className={`font-semibold text-sm ${config.text}`}>{config.label}</span>
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