"use client";
// Force rebuild for route registration

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useState, useEffect, useCallback, useRef } from "react";
import { Coins, TrendingUp, Lock, Unlock, Gift, RefreshCw, Zap, ChevronDown, Bell, CheckCircle } from "lucide-react";
import EscrowTokenABI from "../../abi/EscrowToken.json";
import EscrowStakingABI from "../../abi/EscrowStaking.json";

// ─── Endereços REAIS do último deploy (Garantia para o Pitch) ────────────────
const STAKING_ADDRESS = (process.env.NEXT_PUBLIC_STAKING_ADDRESS || "0x610178da211fef7d417bc0e6fed39f05609ad788") as `0x${string}`;
const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6") as `0x${string}`;
const NFT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_ADDRESS || "0x8a791620dd6260079bf849dc5567adc3f2fdc318") as `0x${string}`;

function StatCard({ label, value, sub, icon: Icon, color, isLoading }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string; isLoading?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm group hover:border-white/20 transition-all duration-300">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${color}`} />
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${color} mb-4 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {isLoading ? (
        <div className="h-8 w-24 bg-white/10 animate-pulse rounded mb-1" />
      ) : (
        <p className="text-3xl font-black text-white mb-1">{value}</p>
      )}
      {sub && <p className="text-xs text-emerald-400 font-semibold mb-1">{sub}</p>}
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export default function StakingPage() {
  const { address, isConnected, chain } = useAccount();
  const isCorrectChain = chain?.id === 31337; // Hardhat Local
  const [stakeInput, setStakeInput] = useState("");
  const [unstakeInput, setUnstakeInput] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const [mounted, setMounted] = useState(false);
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [animRew, setAnimRew] = useState<number>(0);

  // Refs para controle
  const prevBalanceRef = useRef<string>("0");
  const animRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setMounted(true), []);

  // ─── Função para forçar refresh manual ─────────────────────────────────────
  const refreshAll = useCallback(async () => {
    if (!isConnected) return;

    setIsRefreshing(true);
    try {
      console.log("[Refresh] Atualizando saldos e estados...");
      const [s, b, a, t, p, f] = await Promise.all([
        refetchStake(),
        refetchBalance(),
        refetchAllowance(),
        refetchTotalStaked(),
        refetchEthPrice(),
        refetchFaucetStatus(),
      ]);
      console.log("[Refresh] Saldo na Carteira:", b.data ? formatEther(b.data as bigint) : "0");
      console.log("[Refresh] Seu Stake:", s.data ? formatEther((s.data as any)[0]) : "0");
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isConnected]);

  // ─── Ler dados sem polling infinito ──────────────────────────────────────
  const { data: stakeInfo, refetch: refetchStake } = useReadContract({
    address: STAKING_ADDRESS,
    abi: EscrowStakingABI,
    functionName: "getUserStakeInfo",
    args: [address as `0x${string}`],
    query: { enabled: !!address && isConnected },
  });

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: EscrowTokenABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address && isConnected },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: EscrowTokenABI,
    functionName: "allowance",
    args: [address as `0x${string}`, STAKING_ADDRESS],
    query: { enabled: !!address && isConnected },
  });

  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: EscrowStakingABI,
    functionName: "totalStaked",
  });

  const { data: ethPrice, refetch: refetchEthPrice } = useReadContract({
    address: STAKING_ADDRESS,
    abi: EscrowStakingABI,
    functionName: "getEthPrice",
  });

  const { data: hasUsedFaucet, refetch: refetchFaucetStatus } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: EscrowTokenABI,
    functionName: "faucetUsed",
    args: [address as `0x${string}`],
    query: { enabled: !!address && isConnected },
  });

  // ─── Detectar novos tokens recebidos ──────────────────────────────────────
  useEffect(() => {
    if (tokenBalance !== undefined) {
      const currentBalance = formatEther(tokenBalance as bigint);
      const prevBalance = prevBalanceRef.current;

      if (currentBalance !== prevBalance && Number(currentBalance) > Number(prevBalance)) {
        const gained = (Number(currentBalance) - Number(prevBalance)).toFixed(4);
        setLastNotification(`🎉 Você recebeu ${gained} ESC novos!`);
        setTimeout(() => setLastNotification(null), 5000);
        // Recarregar dados do stake quando receber novos tokens
        refetchStake();
      }

      prevBalanceRef.current = currentBalance;
    }
  }, [tokenBalance, refetchStake]);

  // ─── Auto-refresh APENAS quando a página está visível ─────────────────────
  useEffect(() => {
    if (!isConnected) return;

    // Função para verificar visibilidade da página
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshAll();
      }
    };

    // Refresh quando a página ganha foco
    window.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh a cada 30 segundos APENAS se a página estiver visível
    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        refreshAll();
      }
    }, 30000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected, refreshAll]);

  // ─── Writes ────────────────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash });

  // Monitor de Erros
  useEffect(() => {
    if (writeError) {
      console.error("[Faucet] Erro ao enviar transação:", writeError);
      setLastNotification(`❌ Erro: ${writeError.message.split('\n')[0]}`);
      setTimeout(() => setLastNotification(null), 8000);
    }
  }, [writeError]);

  useEffect(() => {
    if (confirmError) {
      console.error("[Faucet] Erro na confirmação:", confirmError);
      setLastNotification(`❌ Falha na Blockchain: ${confirmError.message}`);
      setTimeout(() => setLastNotification(null), 8000);
    }
  }, [confirmError]);

  useEffect(() => {
    if (isSuccess) {
      console.log("[Faucet] Sucesso Total! Atualizando dados...");
      refreshAll();
      setStakeInput("");
      setUnstakeInput("");
      setLastNotification("✅ Transação confirmada! Dados atualizados.");
      setTimeout(() => setLastNotification(null), 5000);
    }
  }, [isSuccess, refreshAll]);

  // ─── Extrações de dados ────────────────────────────────────────────────
  const info = stakeInfo as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const stakedAmt = info ? formatEther(info[0]) : "0";
  const pendingRewReal = info ? Number(formatEther(info[1])) : 0;
  const rewardDebt = info ? formatEther(info[2]) : "0";
  const currentEth = info ? info[3].toString() : (ethPrice ? ethPrice.toString() : "—");
  const currentApy = info ? info[4].toString() : "—";
  const walletBal = tokenBalance ? formatEther(tokenBalance as bigint) : "0";
  const totalStakedFmt = totalStaked ? formatEther(totalStaked as bigint) : "0";

  // Efeito de animação para as recompensas subirem no Pitch
  useEffect(() => {
    if (Number(stakedAmt) > 0) {
      const apy = Number(currentApy) || 12.5; // Fallback para 12.5% se o oracle demorar
      const rewardPerSecond = (Number(stakedAmt) * (apy / 100)) / (365 * 24 * 60 * 60);
      
      // Inicializa o animRef apenas uma vez ou quando o valor real mudar significativamente
      if (animRef.current === 0 || Math.abs(animRef.current - pendingRewReal) > 0.01) {
        animRef.current = pendingRewReal;
      }

      const timer = setInterval(() => {
        animRef.current += rewardPerSecond;
        setAnimRew(animRef.current);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      animRef.current = 0;
      setAnimRew(0);
    }
  }, [stakedAmt, currentApy, pendingRewReal]);

  const needsApproval = stakeInput && allowance !== undefined
    ? (allowance as bigint) < parseEther(stakeInput || "0")
    : false;

  function handleApprove() {
    console.log("[Stake] Iniciando aprovação de tokens...");
    console.log("[Stake] Token:", TOKEN_ADDRESS);
    console.log("[Stake] Valor:", stakeInput);
    writeContract({
      address: TOKEN_ADDRESS,
      abi: EscrowTokenABI,
      functionName: "approve",
      args: [STAKING_ADDRESS, parseEther(stakeInput || "0")],
    });
  }

  function handleStake() {
    console.log("[Stake] Enviando transação de depósito...");
    console.log("[Stake] Contrato Staking:", STAKING_ADDRESS);
    console.log("[Stake] Quantidade:", stakeInput);
    writeContract({
      address: STAKING_ADDRESS,
      abi: EscrowStakingABI,
      functionName: "stake",
      args: [parseEther(stakeInput || "0")],
    });
  }

  function handleUnstake() {
    console.log("[Stake] Iniciando saque do stake...");
    writeContract({
      address: STAKING_ADDRESS,
      abi: EscrowStakingABI,
      functionName: "unstake",
      args: [parseEther(unstakeInput || "0")],
    });
  }

  function handleClaim() {
    console.log("[Stake] Coletando recompensas...");
    writeContract({
      address: STAKING_ADDRESS,
      abi: EscrowStakingABI,
      functionName: "claimRewards",
      args: [],
    });
  }

  function handleFaucet() {
    console.log("[Faucet] Solicitando tokens para:", address);
    console.log("[Faucet] Contrato Token:", TOKEN_ADDRESS);

    if (!address) {
      console.warn("[Faucet] Carteira não conectada!");
      return;
    }

    try {
      writeContract({
        address: TOKEN_ADDRESS,
        abi: EscrowTokenABI,
        functionName: "requestTestTokens",
        args: [],
      });
    } catch (err) {
      console.error("[Faucet] Erro na chamada da função:", err);
    }
  }

  const isBusy = isPending || isConfirming || isRefreshing;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/60 via-slate-950 to-teal-950/40" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" /> Protocolo Ativo
          </div>
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white via-emerald-200 to-teal-300 bg-clip-text text-transparent">
            ESC Staking
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Faça stake de tokens ESC e ganhe recompensas com APY dinâmico ajustado pelo preço do ETH via <span className="text-emerald-400 font-semibold">Chainlink</span>.
          </p>
        </div>
      </div>

      {/* Alerta de Rede Errada */}
      {isConnected && !isCorrectChain && (
        <div className="bg-red-500 text-white p-2 text-center text-xs font-bold animate-pulse">
          ⚠️ VOCÊ ESTÁ NA REDE ERRADA. MUDE PARA LOCALHOST 8545 NA METAMASK.
        </div>
      )}

      {lastNotification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/20">
            <Bell className="w-5 h-5" />
            <span className="font-semibold">{lastNotification}</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400 hover:text-white text-sm font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Atualizando..." : "Atualizar Dados"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Seu Stake" value={`${Number(stakedAmt).toFixed(4)} ESC`} icon={Lock} color="from-emerald-500 to-teal-600" isLoading={!stakeInfo && isConnected} />
          <StatCard label="Recompensas" value={`${animRew.toFixed(6)} ESC`} sub="Pendentes" icon={Gift} color="from-amber-500 to-orange-600" isLoading={!stakeInfo && isConnected} />
          <StatCard label="ETH/USD (Oracle)" value={`$${currentEth}`} icon={TrendingUp} color="from-blue-500 to-indigo-600" />
          <StatCard label="APY Atual" value={`${currentApy}%`} sub="Dinâmico" icon={Zap} color="from-purple-500 to-pink-600" />
        </div>

        {/* Protocol stats */}
        <div className="flex flex-wrap items-center gap-6 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-400">
          <span>📊 Total em Stake: <span className="text-white font-bold">{Number(totalStakedFmt).toLocaleString()} ESC</span></span>
          <span>💰 Saldo na Carteira: <span className="text-white font-bold">{Number(walletBal).toLocaleString()} ESC</span></span>
          <div className="h-4 w-[1px] bg-white/10 mx-2 hidden md:block" />

          {isConnected && !hasUsedFaucet && (
            <button
              onClick={handleFaucet}
              disabled={isBusy}
              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-bold text-xs"
            >
              <Gift className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              PEGAR 1000 ESC (TESTE)
            </button>
          )}

          {!!hasUsedFaucet && (
            <span className="flex items-center gap-1.5 text-slate-500 italic">
              <CheckCircle className="w-3.5 h-3.5" /> Faucet Utilizado
            </span>
          )}

          <div className="flex-grow" />
          <span>📈 Recompensas Sacadas: <span className="text-white font-bold">{Number(rewardDebt).toFixed(6)} ESC</span></span>
        </div>

        {/* Main card */}
        {!isConnected ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center">
            <Coins className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Conecte sua carteira para fazer staking</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Stake / Unstake Panel */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                {(["stake", "unstake"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 py-4 text-sm font-bold capitalize transition-all ${activeTab === t
                      ? "bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-400"
                      : "text-slate-500 hover:text-white"
                      }`}
                  >
                    {t === "stake" ? "🔒 Stake" : "🔓 Unstake"}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {activeTab === "stake" ? (
                  <>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Quantidade de ESC para Stake
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={stakeInput}
                        onChange={(e) => setStakeInput(e.target.value)}
                        className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-emerald-500/50 transition-colors pr-20"
                      />
                      <button
                        onClick={() => setStakeInput(walletBal)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Disponível: {Number(walletBal).toLocaleString()} ESC</p>

                    {needsApproval ? (
                      <button
                        onClick={handleApprove}
                        disabled={isBusy || !stakeInput}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-black transition-all shadow-lg shadow-amber-500/20"
                      >
                        {isBusy ? <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> : null}
                        Aprovar ESC
                      </button>
                    ) : (
                      <button
                        onClick={handleStake}
                        disabled={isBusy || !stakeInput || Number(stakeInput) <= 0}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-black transition-all shadow-lg shadow-emerald-500/20"
                      >
                        {isBusy ? <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> : null}
                        {isConfirming ? "Confirmando..." : "Fazer Stake"}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Quantidade de ESC para Unstake
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={unstakeInput}
                        onChange={(e) => setUnstakeInput(e.target.value)}
                        className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-emerald-500/50 transition-colors pr-20"
                      />
                      <button
                        onClick={() => setUnstakeInput(stakedAmt)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Em Stake: {Number(stakedAmt).toLocaleString()} ESC</p>
                    <button
                      onClick={handleUnstake}
                      disabled={isBusy || !unstakeInput || Number(unstakeInput) <= 0}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white transition-all shadow-lg shadow-rose-500/20"
                    >
                      {isBusy ? <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> : null}
                      {isConfirming ? "Confirmando..." : "Remover Stake"}
                    </button>
                  </>
                )}

                {isSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold text-center">
                    ✅ Transação confirmada!
                  </div>
                )}
              </div>
            </div>

            {/* Rewards Panel */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Recompensas Pendentes</h3>
                    <p className="text-xs text-slate-400">Acumuladas desde o último claim</p>
                  </div>
                </div>

                <div className="text-center py-8">
                  <p className="text-5xl font-black text-amber-400 mb-2">
                    {animRew > 0 ? animRew.toFixed(8) : "0.00000000"}
                  </p>
                  <p className="text-slate-400 text-sm">ESC para sacar (Tempo Real)</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Preço ETH (Chainlink)</span>
                    <span className="text-white font-semibold">${currentEth}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>APY Ajustado</span>
                    <span className="text-emerald-400 font-bold">{currentApy}% / ano</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Fórmula</span>
                    <span className="text-slate-500 text-xs">10% × (ETH/$2000), max 50%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={isBusy || (animRew <= 0 && pendingRewReal <= 0)}
                className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-black transition-all shadow-lg shadow-amber-500/25"
              >
                {isBusy ? <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> : <Gift className="w-4 h-4 inline mr-2" />}
                {isConfirming ? "Confirmando..." : "Sacar Recompensas"}
              </button>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-emerald-400" /> Como funciona o APY dinâmico?
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            O contrato <span className="text-white font-semibold">EscrowStaking.sol</span> consulta o{" "}
            <span className="text-emerald-400 font-semibold">Chainlink ETH/USD Price Feed</span> em tempo real.
            O APY base é <span className="text-white font-semibold">10% ao ano</span> com ETH a $2.000.
            Se o ETH subir para $4.000, o APY dobra para 20% (cap em 50%).
            As recompensas são mintadas em novos tokens ESC diretamente para sua carteira.
          </p>
        </div>
      </div>
    </div>
  );
}