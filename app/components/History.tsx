"use client";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

type Payment = {
  id: number;
  buyer: string;
  seller: string;
  amount: number;
  status: string;
  createdAt: string;
};

export default function History() {
  const { address, isConnected } = useAccount();
  const [sent, setSent] = useState<Payment[]>([]);
  const [received, setReceived] = useState<Payment[]>([]);

  const fetchHistory = async () => {
    if (!address || !isConnected) return;
    try {
      // Usando fetch nativo ao invés de axios para evitar adicionar bibliotecas à toa
      const [sentRes, receivedRes] = await Promise.all([
        fetch(`http://localhost:3001/payments?buyer=${address}`),
        fetch(`http://localhost:3001/payments?seller=${address}`)
      ]);
      const sentData = await sentRes.json();
      const receivedData = await receivedRes.json();

      setSent(sentData);
      setReceived(receivedData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Atualiza a cada 10 segundos
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [address, isConnected]);

  if (!isConnected) {
    return <p className="text-center text-zinc-500">Conecte sua wallet para ver o histórico</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">📤 Pagamentos Enviados (Buyer)</h2>
        <div className="space-y-3">
          {sent.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow flex justify-between">
              <div>
                <p className="font-medium">ID #{p.id} → {p.seller.slice(0,6)}...</p>
                <p className="text-sm text-zinc-500">{new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-600">-{p.amount} POL</p>
                <p className="text-xs text-zinc-400">{p.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">📥 Pagamentos Recebidos (Seller)</h2>
        <div className="space-y-3">
          {received.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow flex justify-between">
              <div>
                <p className="font-medium">ID #{p.id} ← {p.buyer.slice(0,6)}...</p>
                <p className="text-sm text-zinc-500">{new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">+{p.amount} POL</p>
                <p className="text-xs text-zinc-400">{p.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
