"use client";
import { useWriteContract, useAccount } from "wagmi";
import { parseEther } from "viem";
import { useState } from "react";
import { ESCROW_ADDRESS } from "../constants/contracts";

const CONTRACT_ADDRESS = ESCROW_ADDRESS;


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
        args: [seller, true],
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