"use client";
import { useWriteContract, useAccount } from "wagmi";
import { parseEther } from "viem";
import { useState } from "react";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "seller", "type": "address" }],
    "name": "pay",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

export default function PayButton({ seller, amount }: { seller: string; amount: string }) {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!isConnected) return alert("Faça login com a wallet primeiro");
    setLoading(true);
    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "pay",
        args: [seller],
        value: parseEther(amount),
      });
      alert("✅ Pagamento criado! Dinheiro está no cofre.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading || isPending}
      className="w-full bg-black text-white py-6 text-xl font-semibold rounded-3xl hover:bg-zinc-900 transition"
    >
      {loading ? "Processando..." : `Pagar ${amount} POL`}
    </button>
  );
}