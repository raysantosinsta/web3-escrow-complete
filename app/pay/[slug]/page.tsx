"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ShieldCheck, Loader2, CheckCircle, ArrowLeft, 
  Wallet, SendHorizonal, Info, Globe, Lock,
  Copy, Check
} from "lucide-react";

type PaymentLink = {
  id: string;
  title: string;
  description: string;
  amount: number;
  merchant: {
    name: string;
    wallet: string;
  }
};

export default function PublicCheckout() {
  const { slug } = useParams();
  const router = useRouter();
  
  const [linkData, setLinkData] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"form" | "pix" | "success">("form");
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // PIX State
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; sessionId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (slug) fetchLinkData();
  }, [slug]);

  const fetchLinkData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/payment-links/slug/${slug}`);
      if (res.ok) {
        setLinkData(await res.json());
      } else {
        alert("Link de pagamento inválido ou expirado.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !linkData) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`http://localhost:3001/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentLinkId: linkData.id,
          name,
          email,
          amount: linkData.amount
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPixData(data);
        setStep("pix");
        startPolling(data.sessionId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const startPolling = (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/payments/session/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'completed_onchain') {
            setStep("success");
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);
  };

  const handleSimulate = async () => {
    if (!pixData) return;
    await fetch(`http://localhost:3001/api/payments/session/${pixData.sessionId}/simulate`, { method: "POST" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <h1 className="text-2xl font-black text-white uppercase mb-4">Link Inválido</h1>
        <p className="text-slate-500 mb-8">O link que você seguiu não existe ou foi removido pelo lojista.</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition">
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#111827]/60 backdrop-blur-2xl border border-white/10 rounded-[48px] overflow-hidden shadow-2xl relative">
        
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/20 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Checkout Seguro</p>
              <h1 className="text-3xl font-black uppercase tracking-tighter">{linkData.merchant.name}</h1>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-10">
          {step === "form" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-black/40 border border-white/5 rounded-3xl p-6 mb-8">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-white">{linkData.title}</h2>
                  <span className="text-2xl font-black text-indigo-400">R$ {linkData.amount.toFixed(2)}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{linkData.description || "Pagamento de produto/serviço via Gateway Web3."}</p>
              </div>

              <form onSubmit={handleGeneratePix} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Seu Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">E-mail para Recebimento</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@exemplo.com"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-5 bg-white text-black font-black text-lg rounded-[24px] hover:bg-slate-200 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 group"
                >
                  {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      Pagar com PIX
                      <SendHorizonal className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-center gap-4 mt-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix_Brasil.png" alt="Pix" className="h-4" />
                <div className="w-[1px] h-4 bg-white/20" />
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  <Lock className="w-3 h-3" />
                  PAGAMENTO CRIPTOGRAFADO
                </div>
              </div>
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="text-center animate-in zoom-in-95 fade-in duration-500">
              <div className="bg-white p-6 rounded-[40px] inline-block shadow-2xl mb-8">
                <img 
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                  alt="QR Code PIX" 
                  className="w-56 h-56 mx-auto"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xl font-black text-white mb-2 tracking-tighter">Escaneie o QR Code</p>
                  <p className="text-slate-500 text-sm">Abra o app do seu banco e pague via PIX. Assim que confirmado, o sistema processará automaticamente.</p>
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 relative group cursor-pointer" 
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.qrCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                  <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-widest text-left">Código Copia e Cola</p>
                  <p className="text-xs text-slate-400 font-mono truncate text-left pr-10">{pixData.qrCode}</p>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl transition shadow-lg shadow-indigo-600/20">
                    {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                  </div>
                </div>

                <div className="bg-indigo-500/10 p-5 rounded-3xl border border-indigo-500/20 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="text-sm font-bold text-indigo-300">Aguardando confirmação...</span>
                </div>

                <button 
                  onClick={handleSimulate}
                  className="w-full py-3 bg-slate-900 border border-dashed border-white/10 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition"
                >
                  🚀 Simular Pagamento Confirmado
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20 shadow-2xl shadow-green-500/10">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Pagamento Concluído!</h2>
              <p className="text-slate-400 mb-10 leading-relaxed">
                Obrigado {name.split(' ')[0]}! Seu pagamento foi processado com sucesso na rede Polygon. O lojista já foi notificado.
              </p>
              
              <div className="bg-black/40 p-6 rounded-[32px] border border-white/5 mb-10">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-500">Valor</span>
                  <span className="text-white font-bold">R$ {linkData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Status Blockchain</span>
                  <span className="text-green-400 font-black uppercase text-[10px] tracking-widest">Confirmado</span>
                </div>
              </div>

              <button 
                onClick={() => window.location.reload()}
                className="w-full py-5 bg-white text-black font-black rounded-[24px] hover:bg-slate-200 transition-all font-bold"
              >
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-center gap-4 grayscale opacity-30">
           <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Visa_2021.svg/512px-Visa_2021.svg.png" alt="Visa" className="h-3" />
           <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/512px-Mastercard-logo.svg.png" alt="Mastercard" className="h-4" />
           <div className="w-[1px] h-3 bg-white/20" />
           <p className="text-[10px] font-bold uppercase tracking-widest">Powered by Antigravity Web3</p>
        </div>
      </div>
    </div>
  );
}
