"use client";
import { useWriteContract } from "wagmi";
import { useState } from "react";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export default function ReleaseButton({ id }: { id: number }) {
  const { writeContract, isPending } = useWriteContract();
  const [loading, setLoading] = useState(false);

  const handleRelease = async () => {
    setLoading(true);
    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "release",
        args: [BigInt(id)],
      });
      alert("✅ Pagamento liberado! Dinheiro foi enviado ao seller.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRelease}
      disabled={loading || isPending}
      className="w-full bg-green-600 text-white py-4 text-lg font-medium rounded-3xl hover:bg-green-700"
    >
      {loading ? "Liberando..." : `Liberar Pagamento #${id}`}
    </button>
  );
}
