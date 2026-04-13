"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../app/components/AuthContext";
import { 
  ArrowLeft, 
  MessageSquare, 
  SendHorizonal, 
  Loader2, 
  User as UserIcon, 
  ShieldCheck, 
  RefreshCcw,
  Search
} from "lucide-react";

const API_URL = "http://localhost:3001";

type User = { id: string; name: string; wallet: string; role: string; avatar: string };
type Conversation = { 
  id: string; 
  client: User; 
  freelancer: User; 
  messages: any[]; 
  updatedAt: string 
};
type Message = { 
  id?: string; 
  content: string; 
  senderId?: string; 
  sender?: User; 
  createdAt?: string 
};

function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c");
  const { user, socket, switchRole, clearChatNotifications } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Carrega a lista de conversas do usuário logado
  useEffect(() => {
    if (!user.wallet) return;

    const fetchConversations = async () => {
      try {
        const res = await fetch(`${API_URL}/api/conversations/user/${user.wallet}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("[Inbox] ❌ Erro ao buscar conversas:", res.status, errorData);
          throw new Error(`Erro ${res.status} ao buscar conversas`);
        }
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user.wallet]);

  // 2. Controla a conexão do socket e entrada na sala
  useEffect(() => {
    if (!socket) return;

    // Função para entrar na sala de forma segura
    const joinCurrentRoom = () => {
      if (socket.connected && socket.id && activeId) {
        console.log(`[Inbox] 📤 Emitindo joinRoom para ${activeId} (socket: ${socket.id})`);
        socket.emit("joinRoom", { conversationId: activeId });
      }
    };

    const onConnect = () => {
      console.log(`[Inbox] ✅ Evento connect disparado id=${socket.id}`);
      setConnected(true);
      joinCurrentRoom();
    };

    const onDisconnect = (reason: string) => {
      console.log(`[Inbox] 🔌 Socket desconectado: ${reason}`);
      setConnected(false);
    };

    const handleNewMessage = (msg: Message) => {
      console.log(`[Inbox] 📩 Nova mensagem recebida:`, msg);
      setMessages(prev => {
        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    // Tenta entrar se já estiver conectado
    joinCurrentRoom();

    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('newMessage', handleNewMessage);

    return () => {
      console.log(`[Inbox] 🧹 Limpando listeners do socket.`);
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, activeId]);

  // 3. Carrega as mensagens da conversa ativa
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/conversations/${activeId}/messages`);
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar mensagens:", error);
      }
    };

    fetchMessages();
    
    if (activeId) {
      clearChatNotifications('conversation', activeId);
    }
  }, [activeId]);

  // 4. Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeId || !socket) return;

    socket.emit('sendMessage', {
      conversationId: activeId,
      senderWallet: user.wallet,
      content: inputText
    });
    
    setInputText("");
    inputRef.current?.focus();
  };

  const getOtherParty = (conv: Conversation) => {
    return conv.client.wallet.toLowerCase() === user.wallet.toLowerCase() ? conv.freelancer : conv.client;
  };

  const activeConv = conversations.find(c => c.id === activeId);
  const otherParty = activeConv ? getOtherParty(activeConv) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header Centralizado */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/5 h-20 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-500/20">
              <MessageSquare className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none">Inbox Privado</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1.5">Nível de Segurança: Máximo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user.name}</p>
              <p className={`text-[10px] font-black uppercase tracking-wider ${user.role === 'client' ? 'text-blue-400' : 'text-emerald-400'}`}>
                {user.role === 'client' ? 'Modo Cliente' : 'Modo Freelancer'}
              </p>
            </div>
            <button 
              onClick={switchRole}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-slate-400 hover:text-white group"
              title="Trocar Perfil de Teste"
            >
              <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex max-w-7xl mx-auto w-full p-4 md:p-6 gap-6 overflow-hidden">
        
        {/* Sidebar: Lista de Conversas */}
        <div className={`w-full md:w-[360px] bg-[#111827]/40 backdrop-blur-2xl border border-white/5 rounded-[32px] flex flex-col shadow-2xl overflow-hidden ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-white/5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400" />
              <input 
                type="text" 
                placeholder="Buscar conversa..." 
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {conversations.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-4">
                <ShieldCheck className="w-12 h-12 mx-auto opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              conversations.map(conv => {
                const party = getOtherParty(conv);
                const isSelected = activeId === conv.id;
                const lastMsg = conv.messages?.[0]?.content || 'Nenhuma mensagem';

                return (
                  <div
                    key={conv.id}
                    onClick={() => router.push(`/inbox?c=${conv.id}`)}
                    className={`group p-4 rounded-3xl cursor-pointer transition-all duration-300 flex items-center gap-4 border ${isSelected ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <div className="relative">
                      <img src={`https://i.pravatar.cc/150?u=${party.wallet}`} className="w-12 h-12 rounded-2xl object-cover" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{party.name}</h4>
                      <p className={`text-xs truncate opacity-60`}>{lastMsg}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 bg-[#111827]/40 backdrop-blur-2xl border border-white/5 rounded-[32px] flex flex-col shadow-2xl overflow-hidden ${!activeId ? 'hidden md:flex' : 'flex'}`}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-indigo-600/10 rounded-[40px] flex items-center justify-center border border-indigo-500/20">
                <ShieldCheck className="w-12 h-12 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Criptografia Ponta-a-Ponta</h3>
                <p className="text-slate-500 max-w-xs text-sm font-medium">Selecione uma negociação ao lado para visualizar as mensagens seguras do marketplace.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => router.push('/inbox')} className="md:hidden p-2.5 bg-white/5 rounded-xl text-slate-400">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img src={`https://i.pravatar.cc/150?u=${otherParty?.wallet}`} className="w-10 h-10 rounded-xl" />
                  <div>
                    <h2 className="font-bold text-lg leading-tight">{otherParty?.name}</h2>
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{connected ? '● Conectado' : '○ Offline'}</span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((m, i) => {
                  const isMe = m.sender?.wallet?.toLowerCase() === user.wallet.toLowerCase();
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] md:max-w-[70%] space-y-1`}>
                        <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'}`}>
                          {m.content}
                        </div>
                        <p className={`text-[10px] text-slate-600 font-bold uppercase tracking-widest ${isMe ? 'text-right' : 'text-left'}`}>
                          {isMe ? 'Eu' : otherParty?.name} • {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Agora'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-slate-900/40 border-t border-white/5">
                <form onSubmit={sendMessage} className="relative group">
                  <input
                    ref={inputRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    type="text"
                    disabled={!connected}
                    placeholder={connected ? "Escreva sua mensagem segura..." : "Conectando ao terminal..."}
                    className="w-full pl-6 pr-20 py-5 bg-white/5 border border-white/10 rounded-[24px] focus:bg-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  />
                  <button type="submit" disabled={!inputText.trim()} className="absolute right-3 top-3 bottom-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-[18px] transition-all flex items-center justify-center">
                    <SendHorizonal className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Inbox() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
      <InboxContent />
    </Suspense>
  );
}
