"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../../components/AuthContext";
import { 
  ArrowLeft, Key, Lock, Globe, Save, Copy, 
  CheckCircle, Loader2, Eye, EyeOff, ShieldAlert
} from "lucide-react";
import { useRouter } from "next/navigation";

type Merchant = {
  id: string;
  name: string;
  wallet: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string | null;
};

export default function MerchantSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (user.wallet) fetchMerchant();
  }, [user.wallet]);

  const fetchMerchant = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/merchants/me?wallet=${user.wallet}`);
      if (res.ok) {
        const data = await res.json();
        setMerchant(data);
        if (data?.webhookUrl) setWebhookUrl(data.webhookUrl);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/merchants/${merchant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl })
      });
      if (res.ok) {
        alert("Configurações salvas com sucesso!");
      } else {
        alert("Erro ao salvar configurações.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!merchant) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        <button 
          onClick={() => router.push('/dashboard/merchant')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Painel
        </button>

        <div className="mb-12">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Configurações</h1>
          <p className="text-slate-400">Gerencie suas chaves de acesso e integrações de sistema.</p>
        </div>

        <div className="space-y-8">
          {/* API Keys Section */}
          <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              Chaves de API
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Public Key (pk_...)</label>
                <div className="flex items-center gap-2 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <code className="text-indigo-300 font-mono text-sm flex-1 truncate">{merchant.apiKey}</code>
                  <button 
                    onClick={() => copyToClipboard(merchant.apiKey, 'public')}
                    className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400"
                  >
                    {copiedKey === 'public' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Secret Key (sk_...)</label>
                <div className="flex items-center gap-2 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <code className="text-red-300 font-mono text-sm flex-1 truncate">
                    {showSecret ? merchant.apiSecret : "••••••••••••••••••••••••••••••••"}
                  </code>
                  <button 
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(merchant.apiSecret, 'secret')}
                    className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400"
                  >
                    {copiedKey === 'secret' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-red-500/80 font-bold uppercase tracking-tight">
                  <ShieldAlert className="w-3 h-3" />
                  Nunca compartilhe sua Secret Key em ambientes client-side.
                </div>
              </div>
            </div>
          </div>

          {/* Webhooks Section */}
          <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              Notificações (Webhook)
            </h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Enviaremos um evento <code className="text-indigo-300">checkout.succeeded</code> para esta URL toda vez que um pagamento for confirmado na blockchain.
            </p>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Webhook URL</label>
                <input 
                  type="url"
                  placeholder="https://seu-site.com/api/webhooks"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-4 py-4 bg-black/40 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-white placeholder-slate-600 font-mono text-sm"
                />
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-indigo-600 hover:border-indigo-600 text-white font-bold rounded-2xl transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Configurações
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
