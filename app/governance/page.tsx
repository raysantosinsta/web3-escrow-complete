"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useState, useEffect } from "react";
import { Vote, Plus, Clock, CheckCircle, XCircle, Zap, Users, RefreshCw, ChevronRight, AlertTriangle } from "lucide-react";
import EscrowGovernanceABI from "../../abi/EscrowGovernance.json";
import EscrowTokenABI from "../../abi/EscrowToken.json";

const GOVERNANCE_ADDRESS = (process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const TOKEN_ADDRESS      = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS      || "0x0000000000000000000000000000000000000000") as `0x${string}`;

const STATUS_LABELS: Record<number, { label: string; color: string; icon: React.ElementType }> = {
  0: { label: "Ativa",     color: "text-blue-400 bg-blue-500/10 border-blue-500/20",    icon: Clock },
  1: { label: "Aprovada",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
  2: { label: "Rejeitada", color: "text-rose-400 bg-rose-500/10 border-rose-500/20",     icon: XCircle },
  3: { label: "Executada", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Zap },
};

interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  title: string;
  description: string;
  createdAt: bigint;
  votingDeadline: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  status: number;
  targetContract: `0x${string}`;
  callData: `0x${string}`;
  executed: boolean;
}

function ProposalCard({
  proposal,
  onVote,
  hasVoted,
  votingPower,
  isBusy,
}: {
  proposal: Proposal;
  onVote: (id: bigint, support: boolean) => void;
  hasVoted: boolean;
  votingPower: bigint;
  isBusy: boolean;
}) {
  const status = STATUS_LABELS[proposal.status] || STATUS_LABELS[0];
  const StatusIcon = status.icon;
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPct = totalVotes > 0n ? Number((proposal.votesFor * 100n) / totalVotes) : 0;
  const againstPct = totalVotes > 0n ? Number((proposal.votesAgainst * 100n) / totalVotes) : 0;
  const deadline = new Date(Number(proposal.votingDeadline) * 1000);
  const isActive = proposal.status === 0 && deadline > new Date();
  const quorum = 1000n * 10n ** 18n;
  const quorumPct = Math.min(100, Number((proposal.votesFor * 100n) / quorum));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-white/20 transition-all duration-300 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-slate-500">#{proposal.id.toString()}</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>
          <h3 className="font-bold text-white text-lg leading-snug">{proposal.title}</h3>
          <p className="text-slate-400 text-sm mt-1 line-clamp-2">{proposal.description}</p>
        </div>
      </div>

      {/* Vote bars */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>✅ A Favor: {formatEther(proposal.votesFor).slice(0, 8)} ESC ({forPct}%)</span>
          <span>❌ Contra: {formatEther(proposal.votesAgainst).slice(0, 8)} ESC ({againstPct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${forPct}%` }} />
          <div className="bg-rose-500 transition-all duration-500" style={{ width: `${againstPct}%` }} />
        </div>

        {/* Quorum */}
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Quórum: {quorumPct}% de 1.000 ESC</span>
          <span>Prazo: {deadline.toLocaleDateString("pt-BR")}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${quorumPct >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${quorumPct}%` }}
          />
        </div>
      </div>

      {/* Voting buttons */}
      {isActive && !hasVoted && votingPower > 0n && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onVote(proposal.id, true)}
            disabled={isBusy}
            className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-all disabled:opacity-40"
          >
            ✅ Votar A Favor
          </button>
          <button
            onClick={() => onVote(proposal.id, false)}
            disabled={isBusy}
            className="flex-1 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-sm hover:bg-rose-500/20 transition-all disabled:opacity-40"
          >
            ❌ Votar Contra
          </button>
        </div>
      )}

      {hasVoted && (
        <div className="py-3 rounded-xl bg-slate-800/50 text-center text-sm text-slate-400 font-semibold">
          ✅ Você já votou nesta proposta
        </div>
      )}

      {isActive && votingPower === 0n && (
        <div className="py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-sm text-amber-400 font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Você precisa de ESC para votar
        </div>
      )}
    </div>
  );
}

function NewProposalModal({ onClose, onSubmit, isBusy }: { onClose: () => void; onSubmit: (title: string, desc: string) => void; isBusy: boolean }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900 p-6 space-y-4 shadow-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-400" /> Nova Proposta
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Aumentar taxa do protocolo para 1.5%"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descreva a proposta em detalhes..."
            rows={4}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
          />
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Requer mínimo de 100 ESC na carteira para propor.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSubmit(title, desc)}
            disabled={isBusy || !title || !desc}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 disabled:opacity-40 font-bold text-white text-sm transition-all"
          >
            {isBusy ? <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> : null}
            Criar Proposta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  useEffect(() => setMounted(true), []);

  // ─── Reads ─────────────────────────────────────────────────────────────
  const { data: proposalCount, refetch: refetchCount } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: EscrowGovernanceABI,
    functionName: "proposalCount",
  });

  const { data: votingPower } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: EscrowGovernanceABI,
    functionName: "getVotingPower",
    args: [address as `0x${string}`],
    query: { enabled: !!address && isConnected },
  });

  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: EscrowTokenABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address && isConnected },
  });

  // ─── Writes ────────────────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const isBusy = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess) {
      refetchCount();
      setShowModal(false);
    }
  }, [isSuccess, refetchCount]);

  function handlePropose(title: string, description: string) {
    writeContract({
      address: GOVERNANCE_ADDRESS,
      abi: EscrowGovernanceABI,
      functionName: "propose",
      args: [
        title,
        description,
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
        "0x" as `0x${string}`,
      ],
    });
  }

  function handleVote(proposalId: bigint, support: boolean) {
    writeContract({
      address: GOVERNANCE_ADDRESS,
      abi: EscrowGovernanceABI,
      functionName: "vote",
      args: [proposalId, support],
    });
  }

  const power = votingPower as bigint | undefined;
  const balance = tokenBalance as bigint | undefined;
  const count = Number(proposalCount || 0n);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/60 via-slate-950 to-indigo-950/40" />
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-6">
              <Users className="w-4 h-4" /> DAO Ativa
            </div>
            <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white via-blue-200 to-indigo-300 bg-clip-text text-transparent">
              Governança
            </h1>
            <p className="text-slate-400 text-lg max-w-xl">
              Participe das decisões do protocolo PayWeb3. Cada token ESC equivale a um voto.
            </p>
          </div>

          {isConnected && (
            <button
              onClick={() => setShowModal(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 font-bold text-white transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" /> Nova Proposta
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-white">{count}</p>
            <p className="text-sm text-slate-400 mt-1">Propostas Totais</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-blue-400">{power ? formatEther(power).slice(0, 8) : "0"}</p>
            <p className="text-sm text-slate-400 mt-1">Seu Poder de Voto (ESC)</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-white">3 dias</p>
            <p className="text-sm text-slate-400 mt-1">Período de Votação</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-amber-400">1.000</p>
            <p className="text-sm text-slate-400 mt-1">Quórum Mínimo (ESC)</p>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-wrap gap-6 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-400">
          <span>💰 Seu saldo ESC: <span className="text-white font-bold">{balance ? Number(formatEther(balance)).toLocaleString() : "0"} ESC</span></span>
          <span>🗳️ Para propor: <span className="text-white font-bold">min 100 ESC</span></span>
          <span>📊 Quórum: <span className="text-white font-bold">1.000 ESC a favor</span></span>
        </div>

        {/* Proposals */}
        {!isConnected ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center">
            <Vote className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Conecte sua carteira para participar da governança</p>
          </div>
        ) : count === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-16 text-center">
            <Vote className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Nenhuma proposta ainda</p>
            <p className="text-slate-400 text-sm mb-6">Seja o primeiro a criar uma proposta para o protocolo!</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 font-bold text-white"
            >
              <Plus className="w-4 h-4" /> Criar primeira proposta
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Propostas em Aberto</h2>
            <p className="text-slate-400 text-sm">
              As propostas são carregadas via contrato. Configure o endereço do contrato de governança 
              e use o script <code className="text-blue-400">demo-interactions.ts</code> para criar propostas de teste.
            </p>
            <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-sm text-blue-300">
              <p className="font-bold mb-2">ℹ️ Como usar:</p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>Faça deploy com <code className="text-blue-400">npx hardhat run scripts/deploy-all.ts --network sepolia</code></li>
                <li>Copie os endereços do <code className="text-blue-400">deployed-addresses.json</code></li>
                <li>Configure o arquivo <code className="text-blue-400">.env.local</code> do frontend</li>
                <li>Use o botão <strong className="text-white">&quot;Nova Proposta&quot;</strong> para criar propostas on-chain</li>
              </ol>
            </div>
          </div>
        )}

        {/* Como funciona */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="font-bold text-white mb-4">🏛️ Como funciona a DAO</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Propor", desc: "Holder com 100+ ESC cria proposta", color: "from-blue-500 to-indigo-500" },
              { step: "2", title: "Votar", desc: "3 dias de votação ponderada por ESC", color: "from-indigo-500 to-purple-500" },
              { step: "3", title: "Finalizar", desc: "Qualquer um pode finalizar após o prazo", color: "from-purple-500 to-pink-500" },
              { step: "4", title: "Executar", desc: "Admin executa se aprovada com quórum", color: "from-pink-500 to-rose-500" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center font-black text-white text-lg mx-auto mb-3`}>
                  {item.step}
                </div>
                <p className="font-bold text-white text-sm">{item.title}</p>
                <p className="text-slate-400 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <NewProposalModal
          onClose={() => setShowModal(false)}
          onSubmit={handlePropose}
          isBusy={isBusy}
        />
      )}
    </div>
  );
}
