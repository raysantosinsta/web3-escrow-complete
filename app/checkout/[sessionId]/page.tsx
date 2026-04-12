"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Copy, CheckCircle, ArrowLeft, Send } from "lucide-react";

export default function CheckoutSessionPage() {
  const { sessionId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState<string>("loading");
  const [fiatAmount, setFiatAmount] = useState<number | null>(null);
  const [merchantName, setMerchantName] = useState<string>("Carregando...");
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const pixKey = "00020126740014br.gov.bcb.pix0136..."; // Fake Pix Code

  useEffect(() => {
    // Busca dados da sessão na montagem e polling
    const fetchSession = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/v1/checkout/status/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        setStatus(data.status); // 'pending', 'fiat_paid', 'completed_onchain'
        if (data.amount) setFiatAmount(data.amount);
        if (data.blockchainTxHash) setTxHash(data.blockchainTxHash);
        if (data.merchant) setMerchantName(data.merchant.name);

      } catch (err) {
        console.error("Erro ao buscar sessão", err);
      }
    };

    fetchSession();
    
    // Polling a cada 2 segundos
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulatePayment = async () => {
    setStatus("processing");
    try {
      await fetch("http://localhost:3001/api/webhook/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      // Polling do useEffect pegará o status atualizado logo em seguida
    } catch (err) {
      console.error(err);
      setStatus("pending");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-200">
      {/* Generic Gateway Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            <h1 className="font-bold tracking-tight text-xl">
              Pay<span className="text-indigo-600">Web3</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="h-4 w-[1px] bg-slate-200 mx-2" />
             <div className="text-sm font-medium text-slate-600">
                Pagar para: <span className="font-bold text-slate-900">{merchantName}</span>
             </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 sm:py-16">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center p-12 h-64 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Carregando Checkout...</p>
          </div>
        )}

        {(status === 'pending' || status === 'processing') && (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/40 animate-in fade-in slide-in-from-bottom-4">
            {/* Amount Banner */}
            <div className="bg-indigo-900 px-6 py-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <ShieldCheck className="w-24 h-24 text-white" />
              </div>
              <h2 className="text-indigo-300 text-sm font-medium mb-1 uppercase tracking-widest">Total do Pedido</h2>
              <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                <span className="text-indigo-400 mr-2 text-2xl font-medium">R$</span>
                {fiatAmount ? fiatAmount.toFixed(2) : "0.00"}
              </div>
            </div>

            <div className="p-6 sm:p-8">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-slate-800">Pagamento com Pix</h3>
                 <div className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-100">Confirmação Instantânea</div>
               </div>
               
               <div className="flex justify-center mb-6">
                 {/* Fake QR Placeholder */}
                 <div className="w-48 h-48 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center relative shadow-inner overflow-hidden">
                    {status === "processing" ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                        <span className="text-xs text-slate-500 font-medium tracking-tight">Assentando na Blockchain</span>
                      </div>
                    ) : (
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                        alt="QR Code" 
                        className="w-40 h-40 opacity-80 contrast-125"
                      />
                    )}
                 </div>
               </div>

               <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex justify-between items-center mb-6">
                 <div className="flex flex-col overflow-hidden">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chave Pix (Copia e Cola)</span>
                   <span className="text-sm font-mono text-slate-600 truncate mr-4">
                    {pixKey}
                   </span>
                 </div>
                 <button 
                   onClick={handleCopy}
                   className="text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-100"
                 >
                   {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                   {copied ? "Ok" : "Copiar"}
                 </button>
               </div>

               <button 
                  onClick={simulatePayment}
                  disabled={status === "processing"}
                  className="w-full relative group flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all duration-200 disabled:opacity-60 shadow-lg shadow-indigo-900/10 active:scale-[0.98]"
               >
                 <Send className="w-4 h-4" />
                 {status === "processing" ? "Realizando Ponte Web3..." : "Simular Pagamento Pago"}
               </button>
               
               <p className="mt-4 text-[11px] text-center text-slate-400 font-medium">
                 Protegido pela infraestrutura PayWeb3. Suas chaves, seu controle.
               </p>
            </div>
          </div>
        )}

        {status === 'completed_onchain' && (
           <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Pagamento Confirmado!</h2>
              <p className="text-slate-500 mb-6 font-medium">O lojista <span className="text-indigo-600 underline underline-offset-4">{merchantName}</span> já recebeu a confirmação. Seus fundos estão seguros on-chain.</p>
              
              {txHash && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-left mb-8 space-y-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Blockchain Transaction (Amoy)</span>
                    <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" className="text-indigo-600 font-mono text-xs break-all hover:underline decoration-indigo-400">
                      {txHash}
                    </a>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60">
                     <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Status da Notificação</span>
                     <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                        <CheckCircle className="w-3 h-3" /> Evento Backend enviado ao Lojista
                     </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => router.push("/")}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
              >
                Voltar
              </button>
           </div>
        )}
      </main>
      
      <footer className="py-8 text-center text-slate-400 text-xs font-medium">
        &copy; 2026 PayWeb3 Solutions - Secure Escrow Protocol
      </footer>
    </div>
  );
}
