"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Copy, CheckCircle, ArrowLeft, Send } from "lucide-react";

export default function CheckoutSessionPage() {
  const { sessionId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState<string>("loading");
  const [fiatAmount, setFiatAmount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const pixKey = "00020126740014br.gov.bcb.pix0136..."; // Fake Pix Code

  useEffect(() => {
    // Busca dados da sessão na montagem e polling
    const fetchSession = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/checkout/status/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        setStatus(data.status); // 'pending', 'fiat_paid', 'completed_onchain'
        if (data.amount) setFiatAmount(data.amount);
        if (data.blockchainTxHash) setTxHash(data.blockchainTxHash);

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
      {/* Header Escrow Minimal */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <button 
              onClick={() => router.push("/")}
              className="mr-2 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <h1 className="font-bold tracking-tight text-xl">
              Web3<span className="text-blue-600">Escrow</span>
            </h1>
          </div>
          <div className="text-sm text-slate-400 font-medium hidden sm:block">
             Ambiente Seguro
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 sm:py-16">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center p-12 h-64 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Carregando Sessão...</p>
          </div>
        )}

        {(status === 'pending' || status === 'processing') && (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/40 animate-in fade-in slide-in-from-bottom-4">
            {/* Amount Banner */}
            <div className="bg-slate-900 px-6 py-8 text-center">
              <h2 className="text-slate-400 text-sm font-medium mb-1">Total a pagar</h2>
              <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                <span className="text-slate-500 mr-2 text-2xl">R$</span>
                {fiatAmount ? fiatAmount.toFixed(2) : "0.00"}
              </div>
            </div>

            <div className="p-6 sm:p-8">
               <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Pague via Pix</h3>
               
               <div className="flex justify-center mb-6">
                 {/* Fake QR Placeholder */}
                 <div className="w-48 h-48 bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center relative overlow-hidden">
                    {status === "processing" ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                        <span className="text-xs text-slate-500 font-medium">Processando on-chain</span>
                      </div>
                    ) : (
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                        alt="QR Code" 
                        className="w-40 h-40 opacity-50 contrast-125"
                      />
                    )}
                 </div>
               </div>

               <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex justify-between items-center mb-6">
                 <span className="text-sm font-mono text-slate-500 truncate mr-4">
                   {pixKey}
                 </span>
                 <button 
                   onClick={handleCopy}
                   className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                 >
                   {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                   {copied ? "Copiado" : "Copiar"}
                 </button>
               </div>

               <button 
                  onClick={simulatePayment}
                  disabled={status === "processing"}
                  className="w-full relative group flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all duration-200 disabled:opacity-60 shadow-md shadow-emerald-600/20 active:scale-[0.98]"
               >
                 {status === "processing" ? "Realizando Ponte Web3..." : "Simular Pagamento Pago"}
               </button>
            </div>
          </div>
        )}

        {status === 'completed_onchain' && (
           <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Pix Recebido e Protegido!</h2>
              <p className="text-slate-500 mb-6">A conversão foi autêntica. Seus reais foram convertidos e já protegidos no contrato Escrow na Blockchain via sua carteira temporária Invisível.</p>
              
              {txHash && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left mb-8">
                  <span className="block text-xs font-semibold text-slate-400 mb-1">HASH DA TRANSAÇÃO DA PONTE (AMOY)</span>
                  <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" className="text-blue-600 font-mono text-xs break-all hover:underline">
                    {txHash}
                  </a>
                </div>
              )}

              <button 
                onClick={() => router.push("/")}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
              >
                Voltar à Página Inicial
              </button>
           </div>
        )}
      </main>
    </div>
  );
}
