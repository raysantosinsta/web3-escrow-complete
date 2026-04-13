import { useAccount } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Loader2, ShieldCheck, User } from "lucide-react";
import { useState } from "react";

type Props = {
  onComplete: () => void;
};

export default function OnboardingModal({ onComplete }: Props) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<"client" | "freelancer">("client");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");

  const mutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await fetch("http://localhost:3001/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error("Erro no cadastro");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      onComplete();
    }
  });

  const handleSubmit = async () => {
    if (!name.trim()) return;
    mutation.mutate({
      wallet: address,
      name,
      role,
      title: role === "freelancer" ? title : undefined,
      bio: role === "freelancer" ? bio : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-slate-50 p-8 border-b border-slate-100 text-center">
          <div className="mx-auto bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Complete seu Perfil</h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            O endereço conectado ainda não está registrado.
          </p>
          <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 font-mono text-xs rounded-lg inline-block border border-blue-100">
            {address}
          </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="font-bold text-slate-700 text-center">Como você quer usar a plataforma?</h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole("client")}
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col gap-3 ${role === "client"
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                    }`}
                >
                  <User className={`w-8 h-8 ${role === "client" ? "text-blue-500" : "text-slate-400"}`} />
                  <div>
                    <p className="font-bold text-slate-800">Quero Contratar</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Publicar projetos e contratar com segurança Web3.</p>
                  </div>
                </button>

                <button
                  onClick={() => setRole("freelancer")}
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col gap-3 ${role === "freelancer"
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                    }`}
                >
                  <Briefcase className={`w-8 h-8 ${role === "freelancer" ? "text-emerald-500" : "text-slate-400"}`} />
                  <div>
                    <p className="font-bold text-slate-800">Sou Freelancer</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Vender meus serviços e receber com escrow.</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-lg"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {role === "client" ? "Seu Nome ou Empresa" : "Seu Nome Profilssional"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Silva ou StartUpX"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-medium"
                />
              </div>

              {role === "freelancer" && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sua Especialidade / Cargo</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Desenvolvedor Smart Contracts"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bio Curta</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Fale brevemente sobre sua experiência..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-medium resize-none"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-4 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={mutation.isPending || !name.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                >
                  {mutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  Concluir Cadastro
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
