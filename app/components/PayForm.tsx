"use client";
import { useWriteContract, useAccount } from "wagmi";
import { parseEther } from "viem";
import { useState } from "react";

const CONTRACT_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";

const ABI = [
  { 
    "inputs": [
      { "internalType": "address", "name": "seller", "type": "address" },
      { "internalType": "bool", "name": "isEscrow", "type": "bool" }
    ], 
    "name": "pay", 
    "outputs": [], 
    "stateMutability": "payable", 
    "type": "function" 
  }
];

export default function PayForm() {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return alert("Faça login com a wallet primeiro");
    if (!seller || !amount) return alert("Preencha seller e valor");

    setLoading(true);
    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "pay",
        args: [seller as `0x${string}`, true],
        value: parseEther(amount),
      });
      alert("✅ Pagamento criado! Dinheiro está no cofre.");
      setAmount(""); // limpa formulário
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4 bg-white p-6 rounded-3xl shadow">
      <h2 className="text-xl font-semibold">Criar Novo Pagamento</h2>

      <div>
        <label className="block text-sm mb-1">Endereço do Seller (0x...)</label>
        <input
          type="text"
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3"
          placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Valor em POL</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3"
          placeholder="0.01"
        />
      </div>

      <button
        type="submit"
        disabled={loading || isPending}
        className="w-full bg-black text-white py-4 rounded-3xl text-lg font-medium"
      >
        {loading ? "Processando..." : "Enviar Pagamento para o Cofre"}
      </button>
    </form>
  );
}
