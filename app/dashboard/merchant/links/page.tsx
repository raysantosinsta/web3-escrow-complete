"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../../components/AuthContext";
import { 
  Plus, Link as LinkIcon, Copy, ExternalLink, 
  Trash2, Loader2, DollarSign, Globe, ArrowLeft,
  Check
} from "lucide-react";
import { useRouter } from "next/navigation";

type PaymentLink = {
  id: string;
  slug: string;
  title: string;
  amount: number;
  active: boolean;
  createdAt: string;
};

export default function MerchantLinks() {
  const { user } = useAuth();
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create New Link Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState(0);
  const [newSlug, setNewSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user.wallet) {
      fetchMerchantAndLinks();
    }
  }, [user.wallet]);

  const fetchMerchantAndLinks = async () => {
    try {
      // 1. Get Merchant
      const mRes = await fetch(`http://localhost:3001/api/v1/merchants/me?wallet=${user.wallet}`);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMerchant(mData);
        
        // 2. Get Links
        if (mData) {
          const lRes = await fetch(`http://localhost:3001/api/v1/payment-links/merchant/${mData.id}`);
          if (lRes.ok) setLinks(await lRes.json());
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    
    setIsCreating(true);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/payment-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchant.id,
          title: newTitle,
          amount: Number(newAmount),
          slug: newSlug || undefined,
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewAmount(0);
        setNewSlug("");
        fetchMerchantAndLinks();
      } else {
        const err = await res.json();
        alert(err.message || "Erro ao criar link");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Navigation */}
        <button 
          onClick={() => router.push('/dashboard/merchant')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Painel
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Links de Pagamento</h1>
            <p className="text-slate-400 mt-2">Crie e gerencie URLs de checkout compartilháveis</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar Novo Link
          </button>
        </div>

        {/* Links List */}
        <div className="grid grid-cols-1 gap-4">
          {links.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-white/10 rounded-[32px] p-20 text-center">
              <LinkIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Nenhum link criado ainda</p>
            </div>
          ) : (
            links.map((link) => (
              <div 
                key={link.id}
                className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 hover:border-white/10 transition-all group flex flex-wrap items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{link.title}</h3>
                    <p className="text-xs text-slate-500 font-mono">pay.me/{link.slug}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Preço</p>
                    <p className="text-xl font-black text-white">R$ {link.amount.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyLink(link.slug, link.id)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                      title="Copiar URL"
                    >
                      {copiedId === link.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      <span className="text-xs font-bold uppercase tracking-widest">{copiedId === link.id ? "Copiado" : "Copiar"}</span>
                    </button>
                    <button 
                      onClick={() => window.open(`/pay/${link.slug}`, '_blank')}
                      className="p-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl transition-all"
                      title="Abrir Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Novo Link de Pagamento</h2>
            
            <form onSubmit={handleCreateLink} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Nome do Produto/Serviço</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Consultoria Premium"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Valor (BRL)</label>
                  <input 
                    type="number" 
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Slug (URL amigável)</label>
                  <input 
                    type="text" 
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="meu-slug-custom"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none transition"
                  />
                  <p className="text-[10px] text-slate-600 mt-2 italic">Deixe em branco para gerar automático</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 bg-white/5 text-slate-400 font-bold rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
